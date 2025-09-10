import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createDealService, extractDealFromConversation, DealRecapChat, DealRecapUser, DealRecapExtraction, DealRecap } from '../services';
import { SessionStorageService } from '../services/SessionStorageService';
import MessageComponent, { MessageType } from './MessageComponent';

interface ChatExtraction {
    chat: DealRecapChat;
    users: DealRecapUser[];
    deal_reference: DealRecap | null;
    extraction: DealRecapExtraction | null;
}

const ChatDetail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [chatExtraction, setChatExtraction] = useState<ChatExtraction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [message, setMessage] = useState<{
        type: MessageType;
        title: string;
        content: string;
    } | null>(null);

    const handleExtraction = async (chatId: number) => {
        setExtracting(true);
        try {
            // Get the current chat data
            if (!chatExtraction) {
                throw new Error('Chat not found');
            }

            // Convert messages to conversation text
            const conversation = chatExtraction.chat.messages
                .map(msg => {
                    const user = chatExtraction.users.find(u => u.id === msg.user_id);
                    const userName = user?.name || 'Unknown';
                    return `${userName}: ${msg.content}`;
                })
                .join('\n');

            console.log('Extracting deal from conversation:', conversation);

            // Call the OpenAI service to extract deal information with user context
            const extractedDeal = await extractDealFromConversation(conversation, chatExtraction.users);

            if (extractedDeal) {
                // Save to session storage
                const sessionStorage = SessionStorageService.getInstance();
                const extractions = sessionStorage.getExtractions();
                const deals = sessionStorage.getDeals();
                
                // Create new deal with unique ID and chat_id
                const newDealId = deals.length > 0 ? Math.max(...deals.map(d => d.id), 0) + 1 : 1;
                const newDeal: DealRecap = {
                    id: newDealId,
                    counter_party_company: extractedDeal.counter_party_company || '',
                    office: extractedDeal.office || 'ATS',
                    desk: extractedDeal.desk || 'crude',
                    product: extractedDeal.product || 'crude',
                    laycan_start: extractedDeal.laycan_start,
                    laycan_end: extractedDeal.laycan_end,
                    volume: extractedDeal.volume || 0,
                    volume_uom: extractedDeal.volume_uom,
                    deliver_method: extractedDeal.deliver_method,
                    delivery_port: extractedDeal.delivery_port,
                    vessel_name: extractedDeal.vessel_name,
                    inco_term: extractedDeal.inco_term,
                    inspection_agent: extractedDeal.inspection_agent,
                    price: extractedDeal.price,
                    price_basis: extractedDeal.price_basis,
                    price_diff: extractedDeal.price_diff,
                    price_window_start: extractedDeal.price_window_start,
                    price_window_end: extractedDeal.price_window_end,
                    currency: extractedDeal.currency,
                    deal_type: extractedDeal.deal_type,
                    deal_subtype: extractedDeal.deal_subtype,
                    chat_id: chatId,
                    created_at: new Date(),
                    updated_at: new Date()
                };
                
                // Create new extraction record
                const newExtraction: DealRecapExtraction = {
                    id: extractions.length > 0 ? Math.max(...extractions.map(e => e.id), 0) + 1 : 1,
                    chat_id: chatId,
                    deal_id: newDealId,
                    status: 'COMPLETED' as const,
                    confidence: 0.95,
                    created_at: new Date(),
                    updated_at: new Date()
                };
                
                // Update session storage
                console.log('Saving new deal from ChatDetail:', newDeal);
                sessionStorage.updateDeals([...deals, newDeal]);
                sessionStorage.updateExtractions([...extractions, newExtraction]);
                
                // Update the local state with extracted deal information
                setChatExtraction(prev => prev ? {
                    ...prev,
                    deal_reference: newDeal,
                    extraction: newExtraction
                } : null);
                
                setMessage({
                    type: 'success',
                    title: 'Deal Extracted Successfully',
                    content: `Deal information has been extracted and saved. Deal ID: ${newDealId}`
                });
            } else {
                setMessage({
                    type: 'warning',
                    title: 'No Deal Information Found',
                    content: 'No deal information could be extracted from this conversation.'
                });
            }
        } catch (error) {
            console.error('Error extracting deal:', error);
            setMessage({
                type: 'error',
                title: 'Extraction Failed',
                content: `Error extracting deal: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setExtracting(false);
        }
    };

    const chatIdParam = searchParams.get('id');
    const chatId = chatIdParam ? parseInt(chatIdParam, 10) : null;

    useEffect(() => {
        if (!chatId) {
            setError('No chat ID provided');
            setLoading(false);
            return;
        }

        const loadChat = async () => {
            try {
                const dealService = createDealService();
                const chat = await dealService.getChatById(chatId.toString());
                
                if (chat) {
                    const extraction = await dealService.getExtractionByChatId(chatId.toString());
                    const deal = extraction?.deal_id ? await dealService.getDealRecapById(extraction.deal_id.toString()) : null;
                    
                    // Get users from messages
                    const userIds = [...new Set(chat.messages.map(msg => msg.user_id))];
                    const users = await Promise.all(
                        userIds.map(userId => dealService.getUserById(userId.toString()))
                    );
                    
                    const chatExtraction: ChatExtraction = {
                        chat,
                        users: users.filter(user => user !== null) as DealRecapUser[],
                        deal_reference: deal,
                        extraction: extraction || null
                    };
                    
                    setChatExtraction(chatExtraction);
                } else {
                    setError('Chat not found');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load chat');
            } finally {
                setLoading(false);
            }
        };

        loadChat();
    }, [chatId]);

    const formatDate = (date: Date | string): string => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateOnly = (date: Date | string | undefined): string => {
        if (!date) return 'N/A';
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getUserById = (userId: number) => {
        return chatExtraction?.users.find(user => user.id === userId);
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.9) return '#27ae60';
        if (confidence >= 0.7) return '#f39c12';
        return '#e74c3c';
    };

    if (loading) {
        return (
            <div className="chat-detail">
                <div className="loading">
                    <h2>Loading chat details...</h2>
                </div>
            </div>
        );
    }

    if (error || !chatExtraction) {
        return (
            <div className="chat-detail">
                <div className="error">
                    <h2>Error</h2>
                    <p>{error || 'Chat not found'}</p>
                    <Link to="/chats" className="btn btn-primary">
                        Back to Chats
                    </Link>
                </div>
            </div>
        );
    }

    const deal = chatExtraction.deal_reference;

    return (
        <div className="chat-detail">
            {message && (
                <MessageComponent
                    type={message.type}
                    title={message.title}
                    message={message.content}
                    onClose={() => setMessage(null)}
                />
            )}
            <div className="chat-detail-header">
                <div className="header-content">
                    <h1>Chat {chatExtraction.chat.id}</h1>
                    <div className="extraction-info">
                        {chatExtraction.extraction ? (
                            <>
                                <span 
                                    className="confidence-badge"
                                    style={{ backgroundColor: getConfidenceColor(chatExtraction.extraction.confidence || 0) }}
                                >
                                    {Math.round((chatExtraction.extraction.confidence || 0) * 100)}% Confidence
                                </span>
                                <span className="status-badge completed">
                                    {chatExtraction.extraction.status}
                                </span>
                            </>
                        ) : (
                            <span className="status-badge pending">
                                No Extraction
                            </span>
                        )}
                    </div>
                </div>
                <div className="header-actions">
                    {!chatExtraction.extraction && (
                        <button
                            className="btn btn-primary"
                            onClick={() => handleExtraction(chatExtraction.chat.id)}
                            disabled={extracting}
                        >
                            {extracting ? 'Extracting...' : 'Extract Deal'}
                        </button>
                    )}
                    <Link to="/chats" className="btn btn-secondary">
                        Back to Chats
                    </Link>
                </div>
            </div>

            <div className="chat-detail-content">
                <div className="chat-messages">
                    <h2>Conversation</h2>
                    <div className="messages-container">
                        {chatExtraction.chat.messages.map((message) => {
                            const user = getUserById(message.user_id);
                            return (
                                <div key={message.id} className="message">
                                    <div className="message-header">
                                        <span className="user-name">{user?.name}</span>
                                        <span className={`user-role ${user?.is_couterparty ? 'counterparty' : 'our-trader'}`}>
                                            {user?.is_couterparty ? user?.company : `${user?.office} - ${user?.desk}`}
                                        </span>
                                        <span className="message-time">{formatDate(message.date)}</span>
                                    </div>
                                    <div className="message-content">
                                        {message.content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="extracted-deal">
                    <h2>Extracted Deal Information</h2>
                    {deal ? (
                        <Link to={`/deal?id=${deal.id}`} className="deal-summary-card clickable">
                            <div className="deal-header">
                                <h3>{(deal.product || 'Unknown').toUpperCase()} Deal</h3>
                                <span className="deal-id">{deal.id}</span>
                            </div>
                            
                            <div className="deal-details">
                                <div className="deal-row">
                                    <span className="label">Counter Party:</span>
                                    <span className="value">{deal.counter_party_company || 'N/A'}</span>
                                </div>
                                <div className="deal-row">
                                    <span className="label">Volume:</span>
                                    <span className="value">{deal.volume?.toLocaleString() || 'N/A'} {deal.volume_uom || ''}</span>
                                </div>
                                <div className="deal-row">
                                    <span className="label">Delivery:</span>
                                    <span className="value">{deal.deliver_method || 'N/A'} - {deal.delivery_port || 'N/A'}</span>
                                </div>
                                <div className="deal-row">
                                    <span className="label">Laycan:</span>
                                    <span className="value">
                                        {formatDateOnly(deal.laycan_start)} - {formatDateOnly(deal.laycan_end)}
                                    </span>
                                </div>
                                <div className="deal-row">
                                    <span className="label">Pricing:</span>
                                    <span className="value">
                                        {deal.price ? (
                                            <span className="fixed-price">${deal.price.toFixed(2)}</span>
                                        ) : (
                                            <span className="price-basis-diff">
                                                {deal.price_basis || 'N/A'} {deal.price_diff && deal.price_diff >= 0 ? '+' : ''}{deal.price_diff?.toFixed(2) || ''}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="deal-row">
                                    <span className="label">Inspection:</span>
                                    <span className="value">{deal.inspection_agent || 'N/A'}</span>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="no-deal-info">
                            <p>No deal information has been extracted from this conversation yet.</p>
                            <p>Click the "Extract Deal" button above to analyze the conversation and extract deal details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatDetail;
