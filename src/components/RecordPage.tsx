import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOpenAIService } from '../services';
import { SessionStorageService } from '../services/SessionStorageService';
import { DealRecapConversation, DealRecapUser, DealRecapChat, DealRecapMessage, DealRecapExtraction, DealRecap } from '../services/types';
import MessageComponent, { MessageType } from './MessageComponent';

const RecordPage: React.FC = () => {
    const navigate = useNavigate();
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [message, setMessage] = useState<{
        type: MessageType;
        title: string;
        content: string;
    } | null>(null);

    // Form data
    const [party1Name, setParty1Name] = useState('');
    const [party1Email, setParty1Email] = useState('');
    const [party2Name, setParty2Name] = useState('');
    const [party2Email, setParty2Email] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(audioBlob);
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                setShowForm(true);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            // Start timer
            intervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            setMessage({
                type: 'error',
                title: 'Recording Error',
                content: 'Failed to access microphone. Please check permissions.'
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async () => {
        if (!audioBlob) {
            setMessage({
                type: 'error',
                title: 'Validation Error',
                content: 'Please record audio before proceeding.'
            });
            return;
        }

        try {
            setTranscribing(true);
            setMessage({
                type: 'info',
                title: 'Processing',
                content: 'Transcribing audio...'
            });

            // Step 1: Transcribe audio
            const openAIService = createOpenAIService();
            const participants: string[] = [];
            if (party1Name && party1Email) {
                participants.push(`${party1Name}-${party1Email}`);
            }
            if (party2Name && party2Email) {
                participants.push(`${party2Name}-${party2Email}`);
            }
            const transcription = await openAIService.transcribeAudio(audioBlob, participants);
            
            if (!transcription) {
                throw new Error('Failed to transcribe audio');
            }

            setMessage({
                type: 'info',
                title: 'Processing',
                content: 'Creating conversation...'
            });

            // Step 2: Create conversation
            const sessionStorage = SessionStorageService.getInstance();
            await sessionStorage.initialize();

            const conversation: Omit<DealRecapConversation, 'id'> = {
                conversation: transcription
            };

            sessionStorage.saveConversation(conversation);

            setMessage({
                type: 'info',
                title: 'Processing',
                content: 'Parsing conversation to chat...'
            });

            setParsing(true);

            // Step 3: Parse conversation to chat
            const parsedChat = await openAIService.parseConversationToChat(transcription);
            
            if (!parsedChat) {
                throw new Error('Failed to parse conversation');
            }

            // Create user mapping for proper user_id assignment
            const existingUsers = sessionStorage.getUsers();
            const userMap = new Map<string, number>();

            // Process users and create mapping
            const processedUsers = parsedChat.users.map(userData => {
                const existingUser = existingUsers.find(u => u.email === userData.email);
                if (existingUser) {
                    userMap.set(userData.email, existingUser.id);
                    return existingUser;
                } else {
                    const newUser: Omit<DealRecapUser, 'id'> = {
                        name: userData.name,
                        email: userData.email,
                        is_couterparty: userData.is_couterparty,
                        company: userData.company,
                        office: userData.office || null,
                        desk: userData.desk || null
                    };
                    const savedUser = sessionStorage.saveUser(newUser);
                    userMap.set(userData.email, savedUser.id);
                    return savedUser;
                }
            });

            // Create chat with messages
            const chat: Omit<DealRecapChat, 'id'> = {
                title: parsedChat.title,
                messages: [],
                created_at: new Date(),
                updated_at: new Date()
            };

            const savedChat = sessionStorage.saveChat(chat);

            // Create messages with proper user mapping
            const messages: Omit<DealRecapMessage, 'id'>[] = parsedChat.messages.map((msg) => ({
                chat_id: savedChat.id,
                user_id: userMap.get(msg.user_email) || 1, // Use proper user mapping
                content: msg.content,
                date: new Date(msg.date),
                created_at: new Date(),
                updated_at: new Date()
            }));

            messages.forEach(msg => sessionStorage.saveMessage(msg));

            setMessage({
                type: 'info',
                title: 'Processing',
                content: 'Extracting deal information...'
            });

            setExtracting(true);

            // Step 4: Extract deal from conversation
            const dealData = await openAIService.extractDealFromConversation(transcription, processedUsers);
            
            if (dealData) {
                // Create deal
                const deal: Omit<DealRecap, 'id'> = {
                    counter_party_company: dealData.counter_party_company || 'Unknown',
                    office: dealData.office || 'ATC',
                    desk: dealData.desk || 'trading',
                    product: dealData.product || 'crude',
                    laycan_start: dealData.laycan_start,
                    laycan_end: dealData.laycan_end,
                    volume: dealData.volume || 0,
                    volume_uom: dealData.volume_uom,
                    deliver_method: dealData.deliver_method,
                    delivery_port: dealData.delivery_port,
                    vessel_name: dealData.vessel_name,
                    inco_term: dealData.inco_term,
                    inspection_agent: dealData.inspection_agent,
                    price: dealData.price,
                    price_basis: dealData.price_basis,
                    price_diff: dealData.price_diff,
                    price_window_start: dealData.price_window_start,
                    price_window_end: dealData.price_window_end,
                    currency: dealData.currency,
                    deal_type: dealData.deal_type,
                    deal_subtype: dealData.deal_subtype,
                    chat_id: savedChat.id,
                    created_at: new Date(),
                    updated_at: new Date()
                };

                const savedDeal = sessionStorage.saveDeal(deal);

                // Create extraction record
                const extraction: Omit<DealRecapExtraction, 'id'> = {
                    deal_id: savedDeal.id,
                    chat_id: savedChat.id,
                    status: 'COMPLETED',
                    confidence: 0.85
                };

                sessionStorage.saveExtraction(extraction);

                setMessage({
                    type: 'success',
                    title: 'Success',
                    content: `Deal #${savedDeal.id} has been created successfully!`
                });

                // Navigate to deal detail after a short delay
                setTimeout(() => {
                    navigate(`/deal?id=${savedDeal.id}`);
                }, 2000);
            } else {
                setMessage({
                    type: 'warning',
                    title: 'No Deal Found',
                    content: 'No deal information could be extracted from the conversation.'
                });
            }

        } catch (error) {
            console.error('Error processing recording:', error);
            setMessage({
                type: 'error',
                title: 'Processing Error',
                content: 'Failed to process the recording. Please try again.'
            });
        } finally {
            setTranscribing(false);
            setParsing(false);
            setExtracting(false);
        }
    };

    const resetRecording = () => {
        setIsRecording(false);
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setShowForm(false);
        setRecordingDuration(0);
        setParty1Name('');
        setParty1Email('');
        setParty2Name('');
        setParty2Email('');
        setMessage(null);
    };

    return (
        <div className="record-page">
            <div className="record-header">
                <h1>Record Conversation</h1>
                <p>Record a trading conversation and extract deal information</p>
            </div>

            <div className="record-content">
                {!showForm ? (
                    <div className="recording-section">
                        <div className="recording-controls">
                            {!isRecording ? (
                                <button
                                    className="btn btn-record"
                                    onClick={startRecording}
                                    disabled={transcribing || parsing || extracting}
                                >
                                    🎤 Start Recording
                                </button>
                            ) : (
                                <div className="recording-active">
                                    <button
                                        className="btn btn-stop"
                                        onClick={stopRecording}
                                    >
                                        ⏹️ Stop Recording
                                    </button>
                                    <div className="recording-timer">
                                        <span className="timer-icon">⏱️</span>
                                        <span className="timer-text">{formatTime(recordingDuration)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {audioUrl && (
                            <div className="audio-preview">
                                <h3>Recording Preview</h3>
                                <audio controls src={audioUrl} />
                                <div className="audio-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowForm(true)}
                                    >
                                        Continue to Form
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={resetRecording}
                                    >
                                        Record Again
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="form-section">
                        <h3>Party Information (Optional)</h3>
                        <p>You can provide the names and emails of participants, or leave blank for AI to identify speakers automatically.</p>
                        
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="party1Name">Party 1 Name (Our Trader) - Optional</label>
                                <input
                                    type="text"
                                    id="party1Name"
                                    value={party1Name}
                                    onChange={(e) => setParty1Name(e.target.value)}
                                    placeholder="Enter trader name (optional)"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="party1Email">Party 1 Email - Optional</label>
                                <input
                                    type="email"
                                    id="party1Email"
                                    value={party1Email}
                                    onChange={(e) => setParty1Email(e.target.value)}
                                    placeholder="trader@atc.com (optional)"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="party2Name">Party 2 Name (Counterparty) - Optional</label>
                                <input
                                    type="text"
                                    id="party2Name"
                                    value={party2Name}
                                    onChange={(e) => setParty2Name(e.target.value)}
                                    placeholder="Enter counterparty name (optional)"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="party2Email">Party 2 Email - Optional</label>
                                <input
                                    type="email"
                                    id="party2Email"
                                    value={party2Email}
                                    onChange={(e) => setParty2Email(e.target.value)}
                                    placeholder="counterparty@company.com (optional)"
                                />
                            </div>
                        </div>

                        {audioUrl && (
                            <div className="audio-review">
                                <h4>Review Recording</h4>
                                <audio controls src={audioUrl} />
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                className="btn btn-primary btn-large"
                                onClick={handleSubmit}
                                disabled={transcribing || parsing || extracting}
                            >
                                {transcribing && 'Transcribing...'}
                                {parsing && 'Parsing...'}
                                {extracting && 'Extracting Deal...'}
                                {!transcribing && !parsing && !extracting && 'Process Recording'}
                            </button>
                            
                            <button
                                className="btn btn-secondary"
                                onClick={resetRecording}
                                disabled={transcribing || parsing || extracting}
                            >
                                Start Over
                            </button>
                        </div>
                    </div>
                )}

                {message && (
                    <MessageComponent
                        type={message.type}
                        title={message.title}
                        message={message.content}
                        onClose={() => setMessage(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default RecordPage;
