// Whisper service for text-to-speech conversion
import { SessionStorageService } from './SessionStorageService';
import { createOpenAIService } from './index';

export interface SpeechGenerationOptions {
    conversationId: number;
    conversation: string;
    participant1Voice?: string;
    participant2Voice?: string;
    speed?: number;
}

export interface SpeechResult {
    success: boolean;
    audioUrl?: string;
    error?: string;
    duration?: number;
}

export class WhisperService {
    private static instance: WhisperService;
    private openaiService: any;

    private constructor() {
        this.openaiService = createOpenAIService();
    }

    public static getInstance(): WhisperService {
        if (!WhisperService.instance) {
            WhisperService.instance = new WhisperService();
        }
        return WhisperService.instance;
    }

    // Parse conversation to extract participants and their messages
    private parseConversation(conversation: string): { participant1: string; participant2: string; messages: Array<{ speaker: string; content: string }> } {
        const lines = conversation.split('\n').filter(line => line.trim());
        const messages: Array<{ speaker: string; content: string }> = [];
        const participants = new Set<string>();

        for (const line of lines) {
            // Look for pattern: "Name (Role-email): Message content"
            const match = line.match(/^([^(]+)\s*\([^)]+\):\s*(.+)$/);
            if (match) {
                const speaker = match[1].trim();
                const content = match[2].trim();
                participants.add(speaker);
                messages.push({ speaker, content });
            }
        }

        const participantArray = Array.from(participants);
        return {
            participant1: participantArray[0] || 'Speaker 1',
            participant2: participantArray[1] || 'Speaker 2',
            messages
        };
    }

    // Generate speech for a conversation
    public async generateSpeech(options: SpeechGenerationOptions): Promise<SpeechResult> {
        try {
            const { participant1, participant2, messages } = this.parseConversation(options.conversation);
            
            console.log(`Generating conversation speech for ${messages.length} messages`);
            console.log(`Participant 1: ${participant1} (${options.participant1Voice || 'alloy'})`);
            console.log(`Participant 2: ${participant2} (${options.participant2Voice || 'nova'})`);

            // Generate audio for each message in order with alternating voices
            const audioSegments: Blob[] = [];
            
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                const isParticipant1 = message.speaker === participant1;
                const voice = isParticipant1 ? (options.participant1Voice || 'alloy') : (options.participant2Voice || 'nova');
                
                console.log(`Generating audio for message ${i + 1}/${messages.length}: ${message.speaker} (${voice})`);
                
                try {
                    const messageAudio = await this.generateParticipantSpeech(message.content, voice);
                    audioSegments.push(messageAudio);
                    console.log(`✓ Generated audio for message ${i + 1} (${messageAudio.size} bytes)`);
                } catch (error) {
                    console.error(`Failed to generate audio for message ${i + 1}:`, error);
                    // Continue with other messages even if one fails
                }
            }

            if (audioSegments.length === 0) {
                throw new Error('No audio segments were generated');
            }

            // Combine all audio segments into one conversation
            const combinedAudio = await this.combineAudioSegments(audioSegments);

            // Save audio blob to session storage
            const audioUrl = await this.saveAudioBlobToSessionStorage(options.conversationId, combinedAudio);

            console.log(`✓ Conversation audio generated successfully (${combinedAudio.size} bytes)`);

            return {
                success: true,
                audioUrl: audioUrl,
                duration: 0 // Would be calculated from actual audio
            };

        } catch (error) {
            console.error('Error generating speech:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate speech'
            };
        }
    }

    // Generate speech for a single participant
    private async generateParticipantSpeech(text: string, voice: string): Promise<Blob> {
        try {
            console.log(`Generating speech for text: ${text.substring(0, 100)}... with voice: ${voice}`);
            
            // Call OpenAI TTS API
            const audioBlob = await this.openaiService.generateSpeech(text, voice);
            
            console.log(`Speech generated successfully for voice ${voice}`);
            return audioBlob;
        } catch (error) {
            console.error(`Failed to generate speech with voice ${voice}:`, error);
            throw new Error(`Failed to generate speech with voice ${voice}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }


    // Combine multiple audio segments into one conversation
    private async combineAudioSegments(audioSegments: Blob[]): Promise<Blob> {
        try {
            console.log(`Combining ${audioSegments.length} audio segments...`);
            
            if (audioSegments.length === 0) {
                throw new Error('No audio segments to combine');
            }
            
            if (audioSegments.length === 1) {
                console.log('Only one segment, returning as-is');
                return audioSegments[0];
            }

            // For now, we'll use a simple approach: concatenate the audio data
            // In a real implementation, you would use Web Audio API to properly merge audio
            // with proper timing, crossfading, and silence between segments
            
            const totalSize = audioSegments.reduce((sum, segment) => sum + segment.size, 0);
            console.log(`Total audio size: ${totalSize} bytes`);
            
            // Convert all segments to ArrayBuffer and concatenate
            const arrayBuffers = await Promise.all(
                audioSegments.map(segment => segment.arrayBuffer())
            );
            
            // Calculate total length
            const totalLength = arrayBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
            
            // Create a new ArrayBuffer for the combined audio
            const combinedBuffer = new ArrayBuffer(totalLength);
            const combinedView = new Uint8Array(combinedBuffer);
            
            // Copy each segment into the combined buffer
            let offset = 0;
            for (const buffer of arrayBuffers) {
                const view = new Uint8Array(buffer);
                combinedView.set(view, offset);
                offset += buffer.byteLength;
            }
            
            // Create a new blob from the combined buffer
            const combinedBlob = new Blob([combinedBuffer], { type: 'audio/mpeg' });
            
            console.log(`✓ Audio segments combined successfully (${combinedBlob.size} bytes)`);
            return combinedBlob;
            
        } catch (error) {
            console.error('Error combining audio segments:', error);
            throw new Error(`Failed to combine audio segments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Convert blob to base64 string
    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the data URL prefix to get just the base64 string
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    // Convert base64 string back to blob
    private base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Save audio blob to session storage as base64
    private async saveAudioBlobToSessionStorage(conversationId: number, audioBlob: Blob): Promise<string> {
        try {
            const sessionStorage = SessionStorageService.getInstance();
            await sessionStorage.initialize();
            
            // Convert blob to base64 for storage
            const base64Audio = await this.blobToBase64(audioBlob);
            
            // Get existing conversations
            const conversations = sessionStorage.getConversations();
            
            // Update the conversation with base64 audio data
            const updatedConversations = conversations.map(conv => 
                conv.id === conversationId 
                    ? { 
                        ...conv, 
                        audio_url: base64Audio, // Store base64 instead of URL
                        audio_generated_at: new Date()
                    }
                    : conv
            );
            
            // Save updated conversations
            sessionStorage.updateConversations(updatedConversations);
            
            // Create a temporary URL for immediate playback
            const audioUrl = URL.createObjectURL(audioBlob);
            
            console.log(`Audio blob saved for conversation ${conversationId} (${audioBlob.size} bytes)`);
            return audioUrl;
        } catch (error) {
            console.error('Error saving audio blob to session storage:', error);
            throw new Error('Failed to save audio blob to session storage');
        }
    }

    // Load audio from session storage and create playable URL
    public async loadAudioFromSessionStorage(conversationId: number): Promise<string | null> {
        try {
            const sessionStorage = SessionStorageService.getInstance();
            await sessionStorage.initialize();
            
            const conversations = sessionStorage.getConversations();
            const conversation = conversations.find(conv => conv.id === conversationId);
            
            if (!conversation || !conversation.audio_url) {
                return null;
            }
            
            // Convert base64 back to blob and create URL
            const audioBlob = this.base64ToBlob(conversation.audio_url);
            const audioUrl = URL.createObjectURL(audioBlob);
            
            console.log(`Audio loaded for conversation ${conversationId} (${audioBlob.size} bytes)`);
            return audioUrl;
        } catch (error) {
            console.error('Error loading audio from session storage:', error);
            return null;
        }
    }

    // Get available voices
    public getAvailableVoices(): Array<{ id: string; name: string; description: string }> {
        return [
            { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
            { id: 'echo', name: 'Echo', description: 'Warm, friendly voice' },
            { id: 'fable', name: 'Fable', description: 'Expressive, storytelling voice' },
            { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
            { id: 'nova', name: 'Nova', description: 'Bright, energetic voice' },
            { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle voice' }
        ];
    }
}
