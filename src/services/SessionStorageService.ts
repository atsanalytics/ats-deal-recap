// Session storage service for managing deal_recap data
import { 
    DealRecap, 
    DealRecapUser,
    DealRecapConversation
} from './types';

// Import JSON data files
import dealsData from '../data/deal_recap.json';
import usersData from '../data/deal_recap_user.json';
import chatsData from '../data/deal_recap_chat.json';
import messagesData from '../data/deal_recap_message.json';
import extractionsData from '../data/deal_recap_extraction.json';
import conversationsData from '../data/deal_recap_conversation.json';

// Session storage keys
const STORAGE_KEYS = {
    DEALS: 'deal_recap_deals',
    USERS: 'deal_recap_users',
    CHATS: 'deal_recap_chats',
    MESSAGES: 'deal_recap_messages',
    EXTRACTIONS: 'deal_recap_extractions',
    CONVERSATIONS: 'deal_recap_conversations',
    INITIALIZED: 'deal_recap_initialized'
} as const;

export class SessionStorageService {
    private static instance: SessionStorageService;
    private isInitialized: boolean = false;

    private constructor() {}

    public static getInstance(): SessionStorageService {
        if (!SessionStorageService.instance) {
            SessionStorageService.instance = new SessionStorageService();
        }
        return SessionStorageService.instance;
    }

    // Initialize session storage with JSON data if not already initialized
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Check if data is already in session storage
            const isDataInitialized = sessionStorage.getItem(STORAGE_KEYS.INITIALIZED);
            
            if (!isDataInitialized) {
                console.log('Initializing session storage with deal_recap data...');
                
                // Store JSON data in session storage
                sessionStorage.setItem(STORAGE_KEYS.DEALS, JSON.stringify(dealsData));
                sessionStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersData));
                sessionStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chatsData));
                sessionStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messagesData));
                sessionStorage.setItem(STORAGE_KEYS.EXTRACTIONS, JSON.stringify(extractionsData));
                sessionStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversationsData));
                sessionStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
                
                console.log('Session storage initialized successfully');
            } else {
                console.log('Session storage already initialized');
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing session storage:', error);
            throw new Error('Failed to initialize session storage');
        }
    }

    // Get data from session storage
    public getDeals(): any[] {
        const data = sessionStorage.getItem(STORAGE_KEYS.DEALS);
        return data ? JSON.parse(data) : [];
    }

    public getUsers(): DealRecapUser[] {
        const data = sessionStorage.getItem(STORAGE_KEYS.USERS);
        return data ? JSON.parse(data) : [];
    }

    public getChats(): any[] {
        const data = sessionStorage.getItem(STORAGE_KEYS.CHATS);
        return data ? JSON.parse(data) : [];
    }

    public getMessages(): any[] {
        const data = sessionStorage.getItem(STORAGE_KEYS.MESSAGES);
        return data ? JSON.parse(data) : [];
    }

    public getExtractions(): any[] {
        const data = sessionStorage.getItem(STORAGE_KEYS.EXTRACTIONS);
        return data ? JSON.parse(data) : [];
    }

    public getConversations(): DealRecapConversation[] {
        const data = sessionStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        return data ? JSON.parse(data) : [];
    }

    // Update data in session storage
    public updateDeals(deals: DealRecap[]): void {
        sessionStorage.setItem(STORAGE_KEYS.DEALS, JSON.stringify(deals));
    }

    public updateUsers(users: DealRecapUser[]): void {
        sessionStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    public updateChats(chats: any[]): void {
        sessionStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    }

    public updateMessages(messages: any[]): void {
        sessionStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }

    public updateExtractions(extractions: any[]): void {
        sessionStorage.setItem(STORAGE_KEYS.EXTRACTIONS, JSON.stringify(extractions));
    }

    public updateConversations(conversations: DealRecapConversation[]): void {
        sessionStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }

    // Get conversation by audio_id
    public getConversationByAudioId(audioId: number): DealRecapConversation | null {
        const conversations = this.getConversations();
        return conversations.find(conv => conv.audio_id === audioId) || null;
    }

    // Add new conversation with unique ID
    public addConversation(conversation: Omit<DealRecapConversation, 'id'>): DealRecapConversation {
        const conversations = this.getConversations();
        
        // Generate unique ID
        const maxId = conversations.length > 0 ? Math.max(...conversations.map(conv => conv.id)) : 0;
        const newId = maxId + 1;
        
        const newConversation: DealRecapConversation = {
            ...conversation,
            id: newId
        };
        
        const updatedConversations = [...conversations, newConversation];
        this.updateConversations(updatedConversations);
        
        return newConversation;
    }

    // Clear all session storage data
    public clearAll(): void {
        Object.values(STORAGE_KEYS).forEach(key => {
            sessionStorage.removeItem(key);
        });
        this.isInitialized = false;
        console.log('Session storage cleared');
    }

    // Check if session storage is initialized
    public isDataInitialized(): boolean {
        return sessionStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
    }

    // Get storage size information
    public getStorageInfo(): { used: number; available: number } {
        let used = 0;
        Object.values(STORAGE_KEYS).forEach(key => {
            const data = sessionStorage.getItem(key);
            if (data) {
                used += data.length;
            }
        });
        
        // Estimate available space (most browsers have ~5-10MB limit)
        const available = 5 * 1024 * 1024 - used; // 5MB - used
        
        return { used, available };
    }
}
