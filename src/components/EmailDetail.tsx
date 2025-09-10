import React, { useState, useEffect } from 'react';
import { DealRecapEmail, DealRecapExtraction, DealRecap } from '../services/types';
import { extractDealFromEmail, createDealService } from '../services';
import { SessionStorageService } from '../services/SessionStorageService';
import MessageComponent, { MessageType } from './MessageComponent';

interface EmailDetailProps {
    email: DealRecapEmail;
    onClose: () => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({ email, onClose }) => {
    const [extractingDeal, setExtractingDeal] = useState<boolean>(false);
    const [message, setMessage] = useState<{
        type: MessageType;
        title: string;
        content: string;
    } | null>(null);
    const [relatedDeal, setRelatedDeal] = useState<DealRecap | null>(null);

    useEffect(() => {
        checkForExistingDeal();
    }, [email.id]);

    const checkForExistingDeal = async () => {
        try {
            const sessionStorage = SessionStorageService.getInstance();
            await sessionStorage.initialize();
            
            const deals = sessionStorage.getDeals();
            const existingDeal = deals.find(deal => deal.email_id === email.id);
            
            if (existingDeal) {
                setRelatedDeal(existingDeal);
            }
        } catch (error) {
            console.error('Error checking for existing deal:', error);
        }
    };

    const parseEmailChain = (content: string) => {
        // Split content by email separators
        const emailSeparator = '---';
        const emails = content.split(emailSeparator).filter(email => email.trim());
        
        return emails.map((emailContent, index) => {
            const lines = emailContent.trim().split('\n');
            
            // Extract email headers
            const subjectMatch = emailContent.match(/Subject: (.+)/);
            const fromMatch = emailContent.match(/From: ([^\n]+)/);
            const toMatch = emailContent.match(/To: ([^\n]+)/);
            const dateMatch = emailContent.match(/Date: ([^\n]+)/);
            
            // Extract email body (content after headers)
            const bodyStart = lines.findIndex(line => 
                line.startsWith('Hi ') || line.startsWith('Dear ') || line.startsWith('Hello ')
            );
            const body = bodyStart >= 0 ? lines.slice(bodyStart).join('\n') : emailContent;
            
            return {
                id: index + 1,
                subject: subjectMatch ? subjectMatch[1] : `Email ${index + 1}`,
                from: fromMatch ? fromMatch[1] : 'Unknown',
                to: toMatch ? toMatch[1] : 'Unknown',
                date: dateMatch ? dateMatch[1] : 'Unknown',
                body: body.trim()
            };
        });
    };

    const handleExtractDeal = async () => {
        try {
            setExtractingDeal(true);
            setMessage(null);

            // Extract users from email participants
            const users: Array<{
                name: string;
                email: string;
                is_couterparty: boolean;
                company?: string | null;
                office?: string | null;
                desk?: string | null;
            }> = email.participants.map((participant) => {
                // Simple parsing - in a real app, you'd have more sophisticated user mapping
                const isOurCompany = participant.toLowerCase().includes('ats') || 
                                   participant.toLowerCase().includes('atc') ||
                                   participant.toLowerCase().includes('atf');
                
                return {
                    name: participant,
                    email: `${participant.toLowerCase().replace(/\s+/g, '.')}@${isOurCompany ? 'ats.com' : 'counterparty.com'}`,
                    is_couterparty: !isOurCompany,
                    company: isOurCompany ? 'ATS' : 'Counterparty',
                    office: isOurCompany ? 'ATS' : undefined,
                    desk: isOurCompany ? 'gasoline' : undefined
                };
            });

            // Extract deal information from email
            const dealData = await extractDealFromEmail(email.content, users);
            
            if (!dealData) {
                setMessage({
                    type: 'error',
                    title: 'Extraction Failed',
                    content: 'No deal information could be extracted from this email chain.'
                });
                return;
            }

            // Create deal service and save the deal
            const dealService = createDealService();
            const savedDeal = await dealService.createDealRecap({
                counter_party_company: dealData.counter_party_company || 'Unknown',
                office: dealData.office || 'ATS',
                desk: dealData.desk || 'gasoline',
                product: dealData.product || 'gasoline',
                volume: dealData.volume || 0,
                ...dealData,
                email_id: email.id
            });

            // Create extraction record
            const extraction: DealRecapExtraction = {
                id: Date.now(), // Simple ID generation
                chat_id: 0, // No chat for email extraction
                deal_id: savedDeal.id,
                status: 'COMPLETED',
                confidence: 0.85, // Default confidence for email extraction
                created_at: new Date(),
                updated_at: new Date()
            };

            // Save extraction to session storage (simplified)
            const existingExtractions = JSON.parse(sessionStorage.getItem('deal_recap_extractions') || '[]');
            existingExtractions.push(extraction);
            sessionStorage.setItem('deal_recap_extractions', JSON.stringify(existingExtractions));

            setRelatedDeal(savedDeal);
            setMessage({
                type: 'success',
                title: 'Deal Extracted Successfully',
                content: `Deal #${savedDeal.id} has been created from the email chain.`
            });

        } catch (error) {
            console.error('Error extracting deal from email:', error);
            setMessage({
                type: 'error',
                title: 'Extraction Failed',
                content: 'Failed to extract deal information from email. Please try again.'
            });
        } finally {
            setExtractingDeal(false);
        }
    };

    const handleViewDeal = () => {
        if (relatedDeal) {
            window.location.href = `/deal?id=${relatedDeal.id}`;
        }
    };

    const emailChain = parseEmailChain(email.content);

    return (
        <div className="email-detail-modal-overlay" onClick={onClose}>
            <div className="email-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="email-detail-modal-header">
                    <h3>{email.subject}</h3>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                
                <div className="email-detail-modal-content">
                    {message && (
                        <MessageComponent
                            type={message.type}
                            title={message.title}
                            message={message.content}
                            onClose={() => setMessage(null)}
                        />
                    )}

                    <div className="email-info">
                        <div className="info-item">
                            <span className="info-label">Email ID:</span>
                            <span className="info-value">#{email.id}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Participants:</span>
                            <span className="info-value">{email.participants.join(', ')}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Created:</span>
                            <span className="info-value">{email.created_at.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="email-chain">
                        <h4>Email Chain</h4>
                        <div className="email-chain-content">
                            {emailChain.map((emailItem, index) => (
                                <div key={emailItem.id} className="email-item">
                                    <div className="email-item-header">
                                        <div className="email-meta">
                                            <span className="email-from"><strong>From:</strong> {emailItem.from}</span>
                                            <span className="email-to"><strong>To:</strong> {emailItem.to}</span>
                                            <span className="email-date"><strong>Date:</strong> {emailItem.date}</span>
                                        </div>
                                        <div className="email-subject">
                                            <strong>Subject:</strong> {emailItem.subject}
                                        </div>
                                    </div>
                                    <div className="email-body">
                                        <pre className="email-content-plain">
                                            {emailItem.body}
                                        </pre>
                                    </div>
                                    {index < emailChain.length - 1 && <hr className="email-separator" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="email-detail-modal-footer">
                    {relatedDeal ? (
                        <button
                            className="btn btn-primary" 
                            onClick={handleViewDeal}
                        >
                            View Deal
                        </button>
                    ) : (
                        <button 
                            className="btn btn-extract-deal" 
                            onClick={handleExtractDeal}
                            disabled={extractingDeal}
                        >
                            {extractingDeal ? 'Extracting...' : 'Extract Deal'}
                        </button>
                    )}
                    <button className="btn btn-close-modal" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailDetail;
