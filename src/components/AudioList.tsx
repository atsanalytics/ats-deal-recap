import React, { useState, useEffect } from 'react';
import { DealRecapAudio, DealRecapConversation, DealRecapExtraction } from '../services/types';
import MessageComponent, { MessageType } from './MessageComponent';
import { createOpenAIService } from '../services';
import { SessionStorageService } from '../services/SessionStorageService';

const AudioList: React.FC = () => {
    const [audios, setAudios] = useState<DealRecapAudio[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [message, setMessage] = useState<{
        type: MessageType;
        title: string;
        content: string;
    } | null>(null);
    const [transcribing, setTranscribing] = useState<{[key: number]: boolean}>({});
    const [transcriptionResults, setTranscriptionResults] = useState<{[key: number]: string}>({});
    const [conversations, setConversations] = useState<DealRecapConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<DealRecapConversation | null>(null);
    const [savingChat, setSavingChat] = useState<boolean>(false);
    const [extractingDeal, setExtractingDeal] = useState<boolean>(false);
    const [conversationDeal, setConversationDeal] = useState<any>(null);

    // Convert base64 string to playable data URL
    const convertBase64ToDataUrl = (base64String: string): string => {
        // Check if it's already a data URL
        if (base64String.startsWith('data:')) {
            return base64String;
        }
        
        // Convert base64 to data URL
        return `data:audio/mpeg;base64,${base64String}`;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // Import the audio data from the static file
                const audioData = await import('../data/deal_recap_audio.json');
                setAudios(audioData.default as DealRecapAudio[] || []);
                
                // Load conversations from session storage
                const sessionStorage = SessionStorageService.getInstance();
                await sessionStorage.initialize();
                const conversationsData = sessionStorage.getConversations();
                setConversations(conversationsData);
            } catch (error) {
                console.error('Error loading data:', error);
                setMessage({
                    type: 'error',
                    title: 'Loading Failed',
                    content: 'Failed to load audio files and conversations'
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
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

    const getConversationForAudio = (audioId: number): DealRecapConversation | null => {
        return conversations.find(conv => conv.audio_id === audioId) || null;
    };

    const handlePlayAudio = (audio: DealRecapAudio) => {
        console.log('Playing audio:', audio.id);
        const audioElement = document.querySelector(`audio[data-audio-id="${audio.id}"]`) as HTMLAudioElement;
        if (audioElement) {
            audioElement.play();
        }
    };

    const handleTranscribeAudio = async (audio: DealRecapAudio) => {
        try {
            setTranscribing(prev => ({ ...prev, [audio.id]: true }));
            setMessage({
                type: 'info',
                title: 'Transcribing Audio',
                content: `Converting audio #${audio.id} to conversation text...`
            });

            // Convert base64 to blob
            const base64String = audio.audio_url.startsWith('data:') 
                ? audio.audio_url.split(',')[1] 
                : audio.audio_url;
            
            const byteCharacters = atob(base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });

            // Create OpenAI service and transcribe
            const openaiService = createOpenAIService();
            const transcription = await openaiService.transcribeAudio(audioBlob, audio.participants);

            // Save conversation to session storage
            const sessionStorage = SessionStorageService.getInstance();
            const newConversation = sessionStorage.addConversation({
                conversation: transcription,
                audio_id: audio.id,
                chat_id: null,
                audio_url: null,
                audio_generated_at: null
            });

            // Update local state
            setConversations(prev => [...prev, newConversation]);
            setTranscriptionResults(prev => ({
                ...prev,
                [audio.id]: transcription
            }));

            setMessage({
                type: 'success',
                title: 'Transcription Complete',
                content: `Successfully converted audio #${audio.id} to conversation and saved to session storage`
            });

        } catch (error) {
            console.error('Error transcribing audio:', error);
            setMessage({
                type: 'error',
                title: 'Transcription Failed',
                content: `Failed to transcribe audio #${audio.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setTranscribing(prev => ({ ...prev, [audio.id]: false }));
        }
    };

    const handleViewConversation = (audio: DealRecapAudio) => {
        const conversation = getConversationForAudio(audio.id);
        if (conversation) {
            setSelectedConversation(conversation);
            checkConversationDeal(conversation);
        }
    };

    const closeConversationModal = () => {
        setSelectedConversation(null);
        setConversationDeal(null);
    };

    // Check if conversation has a deal associated with its chat
    const checkConversationDeal = async (conversation: DealRecapConversation) => {
        if (!conversation.chat_id) {
            setConversationDeal(null);
            return;
        }

        try {
            const dealService = new (await import('../services/DealService')).DealService();
            const deals = await dealService.getAllDealRecaps();
            const associatedDeal = deals.find(deal => deal.chat_id === conversation.chat_id);
            setConversationDeal(associatedDeal || null);
        } catch (error) {
            console.error('Error checking conversation deal:', error);
            setConversationDeal(null);
        }
    };

    // Navigation functions
    const handleViewChat = () => {
        if (selectedConversation?.chat_id) {
            window.location.href = `/chat?id=${selectedConversation.chat_id}`;
        }
    };

    const handleViewDeal = () => {
        if (conversationDeal?.id) {
            window.location.href = `/deal?id=${conversationDeal.id}`;
        }
    };

    const handleSaveChat = async () => {
        if (!selectedConversation) return;

        try {
            setSavingChat(true);
            setMessage({
                type: 'info',
                title: 'Saving Chat',
                content: 'Converting conversation to chat format and saving...'
            });

            // Parse conversation to chat format using OpenAI
            const openaiService = createOpenAIService();
            const chatData = await openaiService.parseConversationToChat(selectedConversation.conversation);

            // Create user mapping for proper user_id assignment
            const sessionStorage = SessionStorageService.getInstance();
            const existingUsers = sessionStorage.getUsers();
            let nextUserId = Math.max(...existingUsers.map(u => u.id), 0) + 1;
            const userMap = new Map<string, number>();

            // Process users and create mapping
            const processedUsers = chatData.users.map(userData => {
                const existingUser = existingUsers.find(u => u.email === userData.email);
                if (existingUser) {
                    userMap.set(userData.email, existingUser.id);
                    return {
                        name: userData.name,
                        email: userData.email,
                        is_couterparty: userData.is_couterparty,
                        company: userData.company,
                        office: userData.office,
                        desk: userData.desk
                    };
                } else {
                    const newUserId = nextUserId++;
                    userMap.set(userData.email, newUserId);
                    return {
                        name: userData.name,
                        email: userData.email,
                        is_couterparty: userData.is_couterparty,
                        company: userData.company,
                        office: userData.office,
                        desk: userData.desk
                    };
                }
            });

            // Create chat with extraction using DealService
            const dealService = new (await import('../services/DealService')).DealService();
            const result = await dealService.createChatWithExtraction({
                chat: { 
                    title: chatData.title,
                    messages: []
                },
                users: processedUsers,
                messages: chatData.messages.map(msg => ({
                    user_id: userMap.get(msg.user_email) || 1, // Use proper user mapping
                    content: msg.content,
                    date: new Date(msg.date)
                }))
            });

            // Update conversation with chat_id
            const updatedConversations = conversations.map(conv => 
                conv.id === selectedConversation.id 
                    ? { ...conv, chat_id: result.chat.id }
                    : conv
            );
            setConversations(updatedConversations);
            sessionStorage.updateConversations(updatedConversations);

            setMessage({
                type: 'success',
                title: 'Chat Saved',
                content: `Successfully saved conversation as chat #${result.chat.id}`
            });

            // Update selected conversation with new chat_id and check for deals
            const updatedConversation = { ...selectedConversation, chat_id: result.chat.id };
            setSelectedConversation(updatedConversation);
            checkConversationDeal(updatedConversation);

        } catch (error) {
            console.error('Error saving chat:', error);
            setMessage({
                type: 'error',
                title: 'Save Failed',
                content: `Failed to save chat: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setSavingChat(false);
        }
    };

    const handleExtractDeal = async () => {
        if (!selectedConversation) return;

        try {
            setExtractingDeal(true);
            setMessage({
                type: 'info',
                title: 'Extracting Deal',
                content: 'Saving conversation and extracting deal information...'
            });

            // First save the conversation as chat if not already saved
            let chatId = selectedConversation.chat_id;
            if (!chatId) {
                const openaiService = createOpenAIService();
                const chatData = await openaiService.parseConversationToChat(selectedConversation.conversation);

                // Create user mapping for proper user_id assignment
                const sessionStorage = SessionStorageService.getInstance();
                const existingUsers = sessionStorage.getUsers();
                let nextUserId = Math.max(...existingUsers.map(u => u.id), 0) + 1;
                const userMap = new Map<string, number>();

                // Process users and create mapping
                const processedUsers = chatData.users.map(userData => {
                    const existingUser = existingUsers.find(u => u.email === userData.email);
                    if (existingUser) {
                        userMap.set(userData.email, existingUser.id);
                        return {
                            name: userData.name,
                            email: userData.email,
                            is_couterparty: userData.is_couterparty,
                            company: userData.company,
                            office: userData.office,
                            desk: userData.desk
                        };
                    } else {
                        const newUserId = nextUserId++;
                        userMap.set(userData.email, newUserId);
                        return {
                            name: userData.name,
                            email: userData.email,
                            is_couterparty: userData.is_couterparty,
                            company: userData.company,
                            office: userData.office,
                            desk: userData.desk
                        };
                    }
                });

                const dealService = new (await import('../services/DealService')).DealService();
                const result = await dealService.createChatWithExtraction({
                    chat: { 
                        title: chatData.title,
                        messages: []
                    },
                    users: processedUsers,
                    messages: chatData.messages.map(msg => ({
                        user_id: userMap.get(msg.user_email) || 1, // Use proper user mapping
                        content: msg.content,
                        date: new Date(msg.date)
                    }))
                });

                chatId = result.chat.id;

                // Update conversation with chat_id
                const updatedConversations = conversations.map(conv => 
                    conv.id === selectedConversation.id 
                        ? { ...conv, chat_id: chatId }
                        : conv
                );
                setConversations(updatedConversations);
                sessionStorage.updateConversations(updatedConversations);

                // Update selected conversation with new chat_id
                const updatedConversation = { ...selectedConversation, chat_id: chatId };
                setSelectedConversation(updatedConversation);
            }

            // Now extract deal information with user context
            const openaiService = createOpenAIService();
            
            // First parse the conversation to get user information for better extraction
            const chatData = await openaiService.parseConversationToChat(selectedConversation.conversation);
            const extractedDeal = await openaiService.extractDealFromConversation(
                selectedConversation.conversation, 
                chatData.users
            );

            if (extractedDeal) {
                // Save to session storage (same logic as ChatDetail)
                const sessionStorage = SessionStorageService.getInstance();
                const extractions = sessionStorage.getExtractions();
                const deals = sessionStorage.getDeals();
                
                // Create new deal with unique ID and chat_id
                const newDealId = deals.length > 0 ? Math.max(...deals.map(d => d.id), 0) + 1 : 1;
                const newDeal = {
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
                console.log('Saving new deal from AudioList:', newDeal);
                sessionStorage.updateDeals([...deals, newDeal]);
                sessionStorage.updateExtractions([...extractions, newExtraction]);

                setMessage({
                    type: 'success',
                    title: 'Deal Extracted',
                    content: `Successfully extracted and saved deal #${newDealId} from conversation`
                });

                // Update the conversation deal state
                setConversationDeal(newDeal);
            } else {
                setMessage({
                    type: 'warning',
                    title: 'No Deal Found',
                    content: 'No clear deal information could be extracted from this conversation'
                });
            }

        } catch (error) {
            console.error('Error extracting deal:', error);
            setMessage({
                type: 'error',
                title: 'Extraction Failed',
                content: `Failed to extract deal: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setExtractingDeal(false);
        }
    };

    if (loading) {
        return (
            <div className="audio-list-container">
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Loading audio files...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="audio-list-container">
            <div className="audio-list-header">
                <h1>Audio Files</h1>
                <p className="audio-list-subtitle">
                    Generated speech from conversations ({audios.length} files)
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

            {audios.length === 0 ? (
                <div className="no-audios">
                    <div className="no-audios-icon">🎵</div>
                    <h3>No Audio Files</h3>
                    <p>No audio files are available at the moment.</p>
                </div>
            ) : (
                <div className="audio-table-container">
                    <table className="audio-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Participants</th>
                                <th>Generated</th>
                                <th>Audio</th>
                                <th>Transcription</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audios.map((audio) => (
                                <tr key={audio.id} className="audio-row">
                                    <td className="audio-id">#{audio.id}</td>
                                    <td className="audio-participants">
                                        <div className="participants-preview">
                                            {getParticipantsPreview(audio.participants)}
                                        </div>
                                        {audio.participants.length > 2 && (
                                            <div className="participants-full">
                                                {audio.participants.map((participant, index) => (
                                                    <div key={index} className="participant-item">
                                                        {participant}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="audio-date">
                                        {formatDate(audio.audio_generated_at)}
                                    </td>
                                    <td className="audio-player-cell">
                                        <div className="audio-player-mini">
                                            <audio 
                                                controls 
                                                className="audio-controls-mini"
                                                preload="metadata"
                                                data-audio-id={audio.id}
                                            >
                                                <source src={convertBase64ToDataUrl(audio.audio_url)} type="audio/mpeg" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                    </td>
                                    <td className="transcription-cell">
                                        {(() => {
                                            const existingConversation = getConversationForAudio(audio.id);
                                            if (existingConversation) {
                                                return (
                                                    <div className="transcription-result">
                                                        <div className="transcription-preview">
                                                            {existingConversation.conversation.substring(0, 100)}...
                                                        </div>
                                                        <button 
                                                            className="btn btn-view-conversation"
                                                            onClick={() => handleViewConversation(audio)}
                                                            title="View full conversation"
                                                        >
                                                            👁️ View
                                                        </button>
                                                    </div>
                                                );
                                            } else if (transcriptionResults[audio.id]) {
                                                return (
                                                    <div className="transcription-result">
                                                        <div className="transcription-preview">
                                                            {transcriptionResults[audio.id].substring(0, 100)}...
                                                        </div>
                                                        <button 
                                                            className="btn btn-view-transcription"
                                                            onClick={() => {
                                                                // Copy to clipboard
                                                                navigator.clipboard.writeText(transcriptionResults[audio.id]);
                                                                setMessage({
                                                                    type: 'success',
                                                                    title: 'Copied to Clipboard',
                                                                    content: 'Transcription text copied to clipboard'
                                                                });
                                                            }}
                                                            title="Copy transcription to clipboard"
                                                        >
                                                            📋 Copy
                                                        </button>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <button 
                                                        className="btn btn-transcribe"
                                                        onClick={() => handleTranscribeAudio(audio)}
                                                        disabled={transcribing[audio.id] || false}
                                                        title="Convert audio to conversation text"
                                                    >
                                                        {transcribing[audio.id] ? '⏳ Transcribing...' : '🎤 Transcribe'}
                                                    </button>
                                                );
                                            }
                                        })()}
                                    </td>
                                    <td className="audio-actions">
                                        <button 
                                            className="btn btn-play"
                                            onClick={() => handlePlayAudio(audio)}
                                            title="Play Audio"
                                        >
                                            ▶️ Play
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Conversation Modal */}
            {selectedConversation && (
                <div className="conversation-modal-overlay" onClick={closeConversationModal}>
                    <div className="conversation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="conversation-modal-header">
                            <h3>Conversation #{selectedConversation.id}</h3>
                            <button className="btn-close" onClick={closeConversationModal}>×</button>
                        </div>
                        <div className="conversation-modal-content">
                            <div className="conversation-info">
                                <p><strong>Audio ID:</strong> {selectedConversation.audio_id}</p>
                                <p><strong>Chat ID:</strong> {selectedConversation.chat_id || 'Not linked'}</p>
                            </div>
                            <div className="conversation-text">
                                <pre className="conversation-content-plain">
                                    {selectedConversation.conversation}
                                </pre>
                            </div>
                        </div>
                        <div className="conversation-modal-footer">
                            {/* Show Save Chat or View Chat button based on chat_id */}
                            {selectedConversation.chat_id ? (
                                <button 
                                    className="btn btn-view-chat"
                                    onClick={handleViewChat}
                                    title="View chat in chat page"
                                >
                                    👁️ View Chat
                                </button>
                            ) : (
                                <button 
                                    className="btn btn-save-chat"
                                    onClick={handleSaveChat}
                                    disabled={savingChat || extractingDeal}
                                    title="Save conversation as chat"
                                >
                                    {savingChat ? '⏳ Saving...' : '💾 Save Chat'}
                                </button>
                            )}
                            
                            {/* Show Extract Deal or View Deal button based on deal existence */}
                            {conversationDeal ? (
                                <button 
                                    className="btn btn-view-deal"
                                    onClick={handleViewDeal}
                                    title="View deal in deal page"
                                >
                                    📊 View Deal
                                </button>
                            ) : (
                                <button 
                                    className="btn btn-extract-deal"
                                    onClick={handleExtractDeal}
                                    disabled={savingChat || extractingDeal}
                                    title="Extract deal information from conversation"
                                >
                                    {extractingDeal ? '⏳ Extracting...' : '🔍 Extract Deal'}
                                </button>
                            )}
                            
                            <button className="btn btn-close-modal" onClick={closeConversationModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioList;
