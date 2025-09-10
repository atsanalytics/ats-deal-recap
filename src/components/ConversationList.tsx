import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SessionStorageService } from '../services/SessionStorageService';
import { DealRecapConversation } from '../services/types';

const ConversationList: React.FC = () => {
    const [conversations, setConversations] = useState<DealRecapConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadConversations = async () => {
            try {
                const sessionStorage = SessionStorageService.getInstance();
                await sessionStorage.initialize();
                
                const conversationsData = sessionStorage.getConversations();
                setConversations(conversationsData);
            } catch (error) {
                console.error('Error loading conversations:', error);
            } finally {
                setLoading(false);
            }
        };

        loadConversations();
    }, []);

    const getConversationPreview = (conversation: string): string => {
        // Get first 100 characters of the conversation
        const preview = conversation.substring(0, 100);
        return preview.length < conversation.length ? preview + '...' : preview;
    };

    const getConversationTitle = (conversation: string): string => {
        // Try to extract a meaningful title from the conversation
        const lines = conversation.split('\n');
        const firstLine = lines[0] || '';
        
        // Look for patterns like "John Smith (ATS Crude Desk-john.smith@ats.com):"
        const match = firstLine.match(/^([^(]+)\s*\(/);
        if (match) {
            return `Conversation with ${match[1].trim()}`;
        }
        
        // Fallback to first 50 characters
        return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
    };

    if (loading) {
        return (
            <div className="conversation-list">
                <div className="conversation-list-header">
                    <h1>Conversations</h1>
                    <p>Loading conversations...</p>
                </div>
                <div className="loading">Loading conversations...</div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="conversation-list">
                <div className="conversation-list-header">
                    <h1>Conversations</h1>
                    <p>No conversations available</p>
                </div>
                <div className="empty-state">
                    <p>No conversations found. Generate some conversations to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="conversation-list">
            <div className="conversation-list-header">
                <h1>Conversations</h1>
                <p>Total conversations: {conversations.length}</p>
            </div>

            <div className="conversation-table-container">
                <table className="conversation-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Preview</th>
                            <th>Length</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {conversations.map((conversation) => (
                            <tr key={conversation.id} className="conversation-row">
                                <td className="conversation-id">#{conversation.id}</td>
                                <td className="conversation-title">
                                    {getConversationTitle(conversation.conversation)}
                                </td>
                                <td className="conversation-preview">
                                    {getConversationPreview(conversation.conversation)}
                                </td>
                                <td className="conversation-length">
                                    {conversation.conversation.length} chars
                                </td>
                                <td className="conversation-actions">
                                    <Link 
                                        to={`/conversation?id=${conversation.id}`}
                                        className="btn btn-xs btn-view"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ConversationList;
