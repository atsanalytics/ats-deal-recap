import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SessionStorageService } from '../services/SessionStorageService';
import { DealRecapConversation } from '../services/types';
import { createOpenAIService } from '../services';
import MessageComponent, { MessageType } from './MessageComponent';

const ConversationDetail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [conversation, setConversation] = useState<DealRecapConversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: MessageType;
        title: string;
        content: string;
    } | null>(null);

    const conversationIdParam = searchParams.get('id');
    const conversationId = conversationIdParam ? parseInt(conversationIdParam, 10) : null;

    useEffect(() => {
        const loadConversation = async () => {
            if (!conversationId) {
                setError('Invalid conversation ID');
                setLoading(false);
                return;
            }

            try {
                const sessionStorage = SessionStorageService.getInstance();
                await sessionStorage.initialize();
                
                const conversations = sessionStorage.getConversations();
                const foundConversation = conversations.find(c => c.id === conversationId);
                
                if (foundConversation) {
                    setConversation(foundConversation);
                } else {
                    setError('Conversation not found');
                }
            } catch (error) {
                console.error('Error loading conversation:', error);
                setError('Failed to load conversation');
            } finally {
                setLoading(false);
            }
        };

        loadConversation();
    }, [conversationId]);

    const saveAsChat = async () => {
        if (!conversation) {
            setMessage({
                type: 'error',
                title: 'No Conversation',
                content: 'No conversation available to save.'
            });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const sessionStorage = SessionStorageService.getInstance();
            await sessionStorage.initialize();

            const openaiService = createOpenAIService();
            const parsedData = await openaiService.parseConversationToChat(conversation.conversation);

            // Get existing data
            const existingUsers = sessionStorage.getUsers();
            const existingChats = sessionStorage.getChats();
            const existingMessages = sessionStorage.getMessages();
            const existingConversations = sessionStorage.getConversations();

            // Process users
            const updatedUsers = [...existingUsers];
            let nextUserId = Math.max(...existingUsers.map(u => u.id), 0) + 1;

            const userMap = new Map<string, number>();

            for (const userData of parsedData.users) {
                const existingUser = existingUsers.find(u => u.email === userData.email);
                if (existingUser) {
                    userMap.set(userData.email, existingUser.id);
                } else {
                    const newUser = {
                        id: nextUserId++,
                        name: userData.name,
                        email: userData.email,
                        is_couterparty: userData.is_couterparty,
                        company: userData.company,
                        office: userData.office,
                        desk: userData.desk
                    };
                    updatedUsers.push(newUser);
                    userMap.set(userData.email, newUser.id);
                }
            }

            // Create new chat
            const newChatId = Math.max(...existingChats.map(c => c.id), 0) + 1;
            const newChat = {
                id: newChatId,
                title: parsedData.title,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Create messages
            const updatedMessages = [...existingMessages];
            for (const messageData of parsedData.messages) {
                const userId = userMap.get(messageData.user_email);
                if (userId) {
                    const newMessage = {
                        id: Math.max(...existingMessages.map(m => m.id), 0) + updatedMessages.length + 1,
                        chat_id: newChatId,
                        user_id: userId,
                        content: messageData.content,
                        date: new Date(messageData.date)
                    };
                    updatedMessages.push(newMessage);
                }
            }

            // Update conversation with chat_id
            const updatedConversations = existingConversations.map(conv => 
                conv.id === conversation.id 
                    ? { ...conv, chat_id: newChatId }
                    : conv
            );

            // Update session storage
            sessionStorage.updateUsers(updatedUsers);
            sessionStorage.updateChats([...existingChats, newChat]);
            sessionStorage.updateMessages(updatedMessages);
            sessionStorage.updateConversations(updatedConversations);

            // Update local state
            setConversation(prev => prev ? { ...prev, chat_id: newChatId } : null);

            setMessage({
                type: 'success',
                title: 'Chat Saved Successfully',
                content: `Chat "${parsedData.title}" has been saved and is now available in the Chats section.`
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save chat';
            setError(errorMessage);
            setMessage({
                type: 'error',
                title: 'Save Failed',
                content: errorMessage
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="conversation-detail">
                <div className="conversation-detail-header">
                    <h1>Loading Conversation...</h1>
                </div>
                <div className="loading">Loading conversation details...</div>
            </div>
        );
    }

    if (error || !conversation) {
        return (
            <div className="conversation-detail">
                <div className="conversation-detail-header">
                    <h1>Conversation Not Found</h1>
                </div>
                <div className="error-message">
                    <p>{error || 'Conversation not found'}</p>
                    <Link to="/conversations" className="btn btn-primary">
                        Back to Conversations
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="conversation-detail">
            {message && (
                <MessageComponent
                    type={message.type}
                    title={message.title}
                    message={message.content}
                    onClose={() => setMessage(null)}
                />
            )}
            <div className="conversation-detail-header">
                <div className="header-content">
                    <h1>Conversation #{conversation.id}</h1>
                    <div className="conversation-actions">
                        {!conversation.chat_id && (
                            <button 
                                onClick={saveAsChat}
                                disabled={saving}
                                className="btn btn-save"
                            >
                                {saving ? 'Saving...' : 'Save Chat'}
                            </button>
                        )}
                        {conversation.chat_id && (
                            <Link 
                                to={`/chat?id=${conversation.chat_id}`}
                                className="btn btn-go"
                            >
                                View Chat
                            </Link>
                        )}
                        <Link to="/conversations" className="btn btn-back">
                            Back
                        </Link>
                    </div>
                </div>
            </div>

            <div className="conversation-content">
                <div className="conversation-info">
                    <div className="info-item">
                        <span className="info-label">Conversation ID:</span>
                        <span className="info-value">#{conversation.id}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Length:</span>
                        <span className="info-value">{conversation.conversation.length} characters</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Status:</span>
                        <span className={`info-value ${conversation.chat_id ? 'status-linked' : 'status-unlinked'}`}>
                            {conversation.chat_id ? `Linked to Chat #${conversation.chat_id}` : 'Not linked to chat'}
                        </span>
                    </div>
                </div>

                <div className="conversation-text">
                    <h3>Conversation Content</h3>
                    <pre className="conversation-content-plain">
                        {conversation.conversation}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default ConversationDetail;
