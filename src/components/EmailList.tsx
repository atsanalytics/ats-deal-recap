import React, { useState, useEffect } from 'react';
import { DealRecapEmail } from '../services/types';
import MessageComponent, { MessageType } from './MessageComponent';
import EmailDetail from './EmailDetail';

const EmailList: React.FC = () => {
    const [emails, setEmails] = useState<DealRecapEmail[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [message, setMessage] = useState<{
        type: MessageType;
        title: string;
        content: string;
    } | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<DealRecapEmail | null>(null);

    useEffect(() => {
        const loadEmails = async () => {
            try {
                setLoading(true);
                
                // Import the email data from the static file
                const emailData = await import('../data/deal_recap_email.json');
                const emailObjects = emailData.default as Array<{id: number, email: string}>;
                
                // Convert email objects to DealRecapEmail objects
                const processedEmails: DealRecapEmail[] = emailObjects.map((emailObj) => {
                    const content = emailObj.email;
                    
                    // Extract subject from email content
                    const subjectMatch = content.match(/Subject: (.+)/);
                    const subject = subjectMatch ? subjectMatch[1] : `Email Chain ${emailObj.id}`;
                    
                    // Extract participants from email content
                    const fromMatches = content.match(/From: ([^\n]+)/g);
                    const participants = fromMatches ? 
                        fromMatches.map(match => match.replace('From: ', '').trim()) : 
                        ['Unknown'];
                    
                    // Remove duplicates
                    const uniqueParticipants = [...new Set(participants)];
                    
                    return {
                        id: emailObj.id,
                        subject,
                        content,
                        participants: uniqueParticipants,
                        created_at: new Date(),
                        updated_at: new Date()
                    };
                });
                
                setEmails(processedEmails);
            } catch (error) {
                console.error('Error loading emails:', error);
                setMessage({
                    type: 'error',
                    title: 'Loading Failed',
                    content: 'Failed to load email chains'
                });
            } finally {
                setLoading(false);
            }
        };

        loadEmails();
    }, []);

    const formatDate = (date: Date): string => {
        try {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const getParticipantsPreview = (participants: string[]): string => {
        if (participants.length === 0) return 'No participants';
        if (participants.length === 1) return participants[0];
        if (participants.length === 2) return participants.join(' & ');
        return `${participants[0]} & ${participants.length - 1} others`;
    };

    const handleViewEmail = (email: DealRecapEmail) => {
        setSelectedEmail(email);
    };

    const closeEmailModal = () => {
        setSelectedEmail(null);
    };

    if (loading) {
        return (
            <div className="email-list-container">
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Loading email chains...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="email-list-container">
            <div className="email-list-header">
                <h1>Email Chains</h1>
                <p className="email-list-subtitle">
                    Deal discussions via email ({emails.length} chains)
                </p>
            </div>

            {message && (
                <MessageComponent
                    type={message.type}
                    title={message.title}
                    message={message.content}
                    onClose={() => setMessage(null)}
                />
            )}

            {emails.length === 0 ? (
                <div className="no-emails">
                    <div className="no-emails-icon">📧</div>
                    <h3>No Email Chains</h3>
                    <p>No email chains are available at the moment.</p>
                </div>
            ) : (
                <div className="email-table-container">
                    <table className="email-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Subject</th>
                                <th>Participants</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {emails.map((email) => (
                                <tr key={email.id} className="email-row">
                                    <td className="email-id">#{email.id}</td>
                                    <td className="email-subject">
                                        <div className="subject-preview">
                                            {email.subject.length > 60 
                                                ? `${email.subject.substring(0, 60)}...` 
                                                : email.subject
                                            }
                                        </div>
                                    </td>
                                    <td className="email-participants">
                                        <div className="participants-preview">
                                            {getParticipantsPreview(email.participants)}
                                        </div>
                                        {email.participants.length > 2 && (
                                            <div className="participants-full">
                                                {email.participants.map((participant, index) => (
                                                    <div key={index} className="participant-item">
                                                        {participant}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="email-date">
                                        {formatDate(email.created_at)}
                                    </td>
                                    <td className="email-actions">
                                        <button 
                                            className="btn btn-xs btn-view"
                                            onClick={() => handleViewEmail(email)}
                                            title="View email chain"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Email Detail Modal */}
            {selectedEmail && (
                <EmailDetail
                    email={selectedEmail}
                    onClose={closeEmailModal}
                />
            )}
        </div>
    );
};

export default EmailList;
