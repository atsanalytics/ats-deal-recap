import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { extractDealFromConversation, DealRecapChat, DealRecapUser, DealRecapExtraction, DealRecap } from '../services';
import { SessionStorageService } from '../services/SessionStorageService';
import MessageComponent, { MessageType } from './MessageComponent';

interface ChatExtraction {
    chat: DealRecapChat;
    users: DealRecapUser[];
    deal_reference: DealRecap | null;
    extraction: DealRecapExtraction | null;
}

const ChatList: React.FC = () => {
    const [chats, setChats] = useState<ChatExtraction[]>([]);
    const [loading, setLoading] = useState(true);
    const [extracting, setExtracting] = useState<number | null>(null);
    const [message, setMessage] = useState<{
        type: MessageType;
        title: string;
        content: string;
    } | null>(null);

    const handleExtraction = async (chatId: number) => {
        setExtracting(chatId);
        try {
            // Find the chat to extract conversation from
            const chatExtraction = chats.find(chat => chat.chat.id === chatId);
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
                // Update session storage with extraction and deal
                const sessionStorage = SessionStorageService.getInstance();
                const extractions = sessionStorage.getExtractions();
                const deals = sessionStorage.getDeals();
                
                // Create new deal with unique ID and chat_id
                const newDealId = deals.length > 0 ? Math.max(...deals.map(d => d.id), 0) + 1 : 1;
                const newDeal = {
                    id: newDealId,
                    ...extractedDeal,
                    chat_id: chatId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                // Create new extraction record
                const newExtraction = {
                    id: extractions.length > 0 ? Math.max(...extractions.map(e => e.id), 0) + 1 : 1,
                    chat_id: chatId,
                    deal_id: newDealId,
                    status: 'COMPLETED' as const,
                    confidence: 0.95,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                // Update session storage
                console.log('Saving new deal:', newDeal);
                console.log('Saving new extraction:', newExtraction);
                sessionStorage.updateDeals([...deals, newDeal]);
                sessionStorage.updateExtractions([...extractions, newExtraction]);
                
                // Verify the deal was saved
                const updatedDeals = sessionStorage.getDeals();
                console.log('Deals after save:', updatedDeals);

                // Update the chat with extracted deal information
                setChats(prevChats => 
                    prevChats.map(chat => 
                        chat.chat.id === chatId 
                            ? {
                                ...chat,
                                deal_reference: newDeal,
                                extraction: newExtraction
                            } as any
                            : chat
                    )
                );
                
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
            setExtracting(null);
        }
    };

    useEffect(() => {
        const loadChats = async () => {
            try {
                setLoading(true);
                const sessionStorage = SessionStorageService.getInstance();
                await sessionStorage.initialize();
                
                // Get data from session storage
                const chatsData = sessionStorage.getChats();
                const messagesData = sessionStorage.getMessages();
                const usersData = sessionStorage.getUsers();
                const extractionsData = sessionStorage.getExtractions();
                const dealsData = sessionStorage.getDeals();
                
                // Convert to ChatExtraction format
                const chatExtractions: ChatExtraction[] = chatsData.map((chat) => {
                    // Get messages for this chat
                    const chatMessages = messagesData.filter(msg => msg.chat_id === chat.id);
                    
                    // Get users from messages
                    const userIds = [...new Set(chatMessages.map(msg => msg.user_id))];
                    const users = usersData.filter(user => userIds.includes(user.id));
                    
                    // Get extraction for this chat
                    const extraction = extractionsData.find(ext => ext.chat_id === chat.id) || null;
                    
                    // Get deal reference if extraction exists and has deal_id
                    let deal_reference = null;
                    if (extraction && extraction.deal_id) {
                        deal_reference = dealsData.find(deal => deal.id === extraction.deal_id) || null;
                    }
                    
                    return {
                        chat: {
                            ...chat,
                            messages: chatMessages
                        },
                        users,
                        deal_reference,
                        extraction
                    };
                });
                
                setChats(chatExtractions);
            } catch (err) {
                console.error('Error loading chats:', err);
            } finally {
                setLoading(false);
            }
        };

        loadChats();
    }, []);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getLastMessage = (chat: ChatExtraction) => {
        const messages = chat.chat.messages;
        return messages[messages.length - 1];
    };

    const getParticipants = (chat: ChatExtraction) => {
        return chat.users.map(user => user.name).join(', ');
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.9) return '#27ae60'; // Green
        if (confidence >= 0.7) return '#f39c12'; // Orange
        return '#e74c3c'; // Red
    };

    if (loading) {
        return (
            <div className="chat-list">
                <div className="loading">
                    <h2>Loading chats...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-list">
            {message && (
                <MessageComponent
                    type={message.type}
                    title={message.title}
                    message={message.content}
                    onClose={() => setMessage(null)}
                />
            )}
            <div className="chat-list-header">
                <h1>Chat Conversations</h1>
                <p>Total conversations: {chats.length}</p>
            </div>

            <div className="chat-cards-container">
                {chats.map((chatExtraction) => {
                    const lastMessage = getLastMessage(chatExtraction);
                    const participants = getParticipants(chatExtraction);
                    const deal = chatExtraction.deal_reference;
                    
                    return (
                        <div key={chatExtraction.chat.id} className="chat-card">
                            <div className="chat-card-header">
                                <div className="chat-info">
                                    <h3>Chat {chatExtraction.chat.id}</h3>
                                    <span className="participants">{participants}</span>
                                </div>
                                <div className="extraction-status">
                                    {chatExtraction.extraction ? (
                                        <>
                                            <span 
                                                className="confidence-badge"
                                                style={{ backgroundColor: getConfidenceColor(chatExtraction.extraction.confidence) }}
                                            >
                                                {Math.round(chatExtraction.extraction.confidence * 100)}%
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

                            <div className="chat-card-content">
                                {deal ? (
                                    <div className="deal-summary">
                                        <div className="deal-info">
                                            <span className="product-badge">{deal.product}</span>
                                            <span className="volume">{deal.volume.toLocaleString()} {deal.volume_uom}</span>
                                            <span className="counterparty">{deal.counter_party_company}</span>
                                        </div>
                                        <div className="pricing-info">
                                            {deal.price ? (
                                                <span className="fixed-price">${deal.price.toFixed(2)}</span>
                                            ) : (
                                                <span className="price-basis-diff">
                                                    <span className="price-basis">{deal.price_basis}</span>
                                                    <span className="price-diff">
                                                        {deal.price_diff && deal.price_diff >= 0 ? '+' : ''}{deal.price_diff?.toFixed(2)}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="no-deal-summary">
                                        <span className="no-deal-text">No deal information extracted yet</span>
                                    </div>
                                )}

                                <div className="last-message">
                                    <p className="message-preview">{lastMessage.content}</p>
                                    <span className="message-time">{formatDate(lastMessage.date as any)}</span>
                                </div>
                            </div>

                            <div className="chat-card-actions">
                                <div className="btn-group">
                                    <Link 
                                        to={`/chat?id=${chatExtraction.chat.id}`} 
                                        className="btn btn-primary"
                                    >
                                        View Chat
                                    </Link>
                                    {!chatExtraction.extraction && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleExtraction(chatExtraction.chat.id)}
                                            disabled={extracting === chatExtraction.chat.id}
                                        >
                                            {extracting === chatExtraction.chat.id ? 'Extracting...' : 'Extract Deal'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChatList;
