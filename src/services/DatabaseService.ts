// Mock database service for browser environment
import { 
    DealRecap, 
    DealRecapUser,
    DealRecapChat,
    DealRecapMessage,
    DealRecapExtraction
} from './types';
import { SessionStorageService } from './SessionStorageService';

// Query result interface
interface QueryResult<T> {
    rows: T[];
    rowCount: number;
}

// Mock database service class
export class DatabaseService {
    private isInitialized: boolean = false;
    private sessionStorage: SessionStorageService;

    constructor() {
        this.sessionStorage = SessionStorageService.getInstance();
        this.initializeMockDatabase();
    }

    private async initializeMockDatabase() {
        try {
            console.log('Initializing mock database for browser environment...');
            
            // Initialize session storage with JSON data if needed
            await this.sessionStorage.initialize();
            
            // Simulate database initialization
            await new Promise(resolve => setTimeout(resolve, 100));
            this.isInitialized = true;
            console.log('Mock database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize mock database:', error);
            throw new Error('Mock database initialization failed');
        }
    }

    // Generic query method (mock implementation)
    async query<T>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        try {
            if (!this.isInitialized) {
                throw new Error('Mock database not initialized');
            }
            
            console.log('Executing mock query:', sql, 'with params:', params);
            
            // Simulate database query delay
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Return empty result for generic queries
            return {
                rows: [] as T[],
                rowCount: 0
            };
        } catch (error) {
            console.error('Mock database query error:', error);
            throw new Error(`Mock database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Deal Recap operations
    async createDealRecap(deal: Omit<DealRecap, 'id' | 'created_at' | 'updated_at'>): Promise<DealRecap> {
        const deals = this.sessionStorage.getDeals();
        const newId = deals.length > 0 ? Math.max(...deals.map(d => d.id)) + 1 : 1;
        const newDeal = {
            ...deal,
            id: newId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        deals.push(newDeal as any);
        this.sessionStorage.updateDeals(deals);
        return {
            ...newDeal,
            created_at: new Date(newDeal.created_at),
            updated_at: new Date(newDeal.updated_at),
            laycan_start: newDeal.laycan_start ? new Date(newDeal.laycan_start) : undefined,
            laycan_end: newDeal.laycan_end ? new Date(newDeal.laycan_end) : undefined,
            price_window_start: newDeal.price_window_start ? new Date(newDeal.price_window_start) : undefined,
            price_window_end: newDeal.price_window_end ? new Date(newDeal.price_window_end) : undefined
        };
    }

    async getDealRecapById(id: string): Promise<DealRecap | null> {
        const deals = this.sessionStorage.getDeals();
        const deal = deals.find(d => d.id === parseInt(id));
        if (!deal) return null;
        
        return {
            ...deal,
            created_at: new Date(deal.created_at),
            updated_at: new Date(deal.updated_at),
            laycan_start: deal.laycan_start ? new Date(deal.laycan_start) : undefined,
            laycan_end: deal.laycan_end ? new Date(deal.laycan_end) : undefined,
            price_window_start: deal.price_window_start ? new Date(deal.price_window_start) : undefined,
            price_window_end: deal.price_window_end ? new Date(deal.price_window_end) : undefined,
            price: deal.price || undefined,
            price_basis: deal.price_basis || undefined,
            price_diff: deal.price_diff || undefined,
            vessel_name: deal.vessel_name || undefined,
            chat_id: deal.chat_id || undefined
        };
    }

    async getAllDealRecaps(limit: number = 50, offset: number = 0): Promise<DealRecap[]> {
        const deals = this.sessionStorage.getDeals();
        return deals
            .slice(offset, offset + limit)
            .map(deal => ({
                ...deal,
                created_at: new Date(deal.created_at),
                updated_at: new Date(deal.updated_at),
                laycan_start: deal.laycan_start ? new Date(deal.laycan_start) : undefined,
                laycan_end: deal.laycan_end ? new Date(deal.laycan_end) : undefined,
                price_window_start: deal.price_window_start ? new Date(deal.price_window_start) : undefined,
                price_window_end: deal.price_window_end ? new Date(deal.price_window_end) : undefined,
                price: deal.price || undefined,
                price_basis: deal.price_basis || undefined,
                price_diff: deal.price_diff || undefined,
                vessel_name: deal.vessel_name || undefined,
                chat_id: deal.chat_id || undefined
            }));
    }

    async updateDealRecap(id: string, updates: Partial<DealRecap>): Promise<DealRecap | null> {
        const deals = this.sessionStorage.getDeals();
        const index = deals.findIndex(d => d.id === parseInt(id));
        if (index === -1) return null;
        
        deals[index] = {
            ...deals[index],
            ...updates,
            updated_at: new Date().toISOString()
        } as any;
        
        this.sessionStorage.updateDeals(deals);
        const deal = deals[index];
        return {
            ...deal,
            created_at: new Date(deal.created_at as string),
            updated_at: new Date(deal.updated_at as string),
            laycan_start: deal.laycan_start ? new Date(deal.laycan_start as string) : undefined,
            laycan_end: deal.laycan_end ? new Date(deal.laycan_end as string) : undefined,
            price_window_start: deal.price_window_start ? new Date(deal.price_window_start as string) : undefined,
            price_window_end: deal.price_window_end ? new Date(deal.price_window_end as string) : undefined,
            price: deal.price || undefined,
            price_basis: deal.price_basis || undefined,
            price_diff: deal.price_diff || undefined,
            vessel_name: deal.vessel_name || undefined,
            chat_id: deal.chat_id || undefined
        };
    }

    async deleteDealRecap(id: string): Promise<boolean> {
        const deals = this.sessionStorage.getDeals();
        const index = deals.findIndex(d => d.id === parseInt(id));
        if (index === -1) return false;
        
        deals.splice(index, 1);
        this.sessionStorage.updateDeals(deals);
        return true;
    }

    // User operations
    async createUser(user: Omit<DealRecapUser, 'id'>): Promise<DealRecapUser> {
        const users = this.sessionStorage.getUsers();
        const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        const newUser = {
            ...user,
            id: newId,
            company: user.company || null,
            office: user.office || null,
            desk: user.desk || null
        };
        users.push(newUser as any);
        this.sessionStorage.updateUsers(users);
        return newUser;
    }

    async getUserById(id: string): Promise<DealRecapUser | null> {
        const users = this.sessionStorage.getUsers();
        return users.find(u => u.id === parseInt(id)) || null;
    }

    async getAllUsers(): Promise<DealRecapUser[]> {
        return [...this.sessionStorage.getUsers()];
    }

    // Chat operations
    async createChat(chat: { title?: string }): Promise<DealRecapChat> {
        const chats = this.sessionStorage.getChats();
        const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
        const newChat = {
            id: newId,
            title: chat.title || 'Chat',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        chats.push(newChat as any);
        this.sessionStorage.updateChats(chats);
        return {
            ...newChat,
            messages: [],
            created_at: new Date(newChat.created_at),
            updated_at: new Date(newChat.updated_at)
        };
    }

    async getChatById(id: string): Promise<DealRecapChat | null> {
        const chats = this.sessionStorage.getChats();
        const chat = chats.find(c => c.id === parseInt(id));
        if (!chat) return null;
        
        const messages = this.sessionStorage.getMessages().filter(m => m.chat_id === parseInt(id));
        return {
            ...chat,
            messages: messages.map(msg => ({
                ...msg,
                date: new Date(msg.date)
            })),
            created_at: new Date(chat.created_at),
            updated_at: new Date(chat.updated_at)
        };
    }

    async getAllChats(): Promise<DealRecapChat[]> {
        const chats = this.sessionStorage.getChats();
        const messages = this.sessionStorage.getMessages();
        return chats.map(chat => {
            const chatMessages = messages.filter(m => m.chat_id === chat.id);
            return {
                ...chat,
                messages: chatMessages.map(msg => ({
                    ...msg,
                    date: new Date(msg.date)
                })),
                created_at: new Date(chat.created_at),
                updated_at: new Date(chat.updated_at)
            };
        });
    }

    // Message operations
    async createMessage(message: Omit<DealRecapMessage, 'id'>): Promise<DealRecapMessage> {
        const messages = this.sessionStorage.getMessages();
        const newId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;
        const newMessage = {
            ...message,
            id: newId,
            date: message.date.toISOString()
        };
        messages.push(newMessage as any);
        this.sessionStorage.updateMessages(messages);
        return {
            ...newMessage,
            date: new Date(newMessage.date)
        };
    }

    async getMessagesByChatId(chatId: string): Promise<DealRecapMessage[]> {
        const messages = this.sessionStorage.getMessages();
        return messages
            .filter(m => m.chat_id === parseInt(chatId))
            .map(msg => ({
                ...msg,
                date: new Date(msg.date)
            }));
    }

    // Extraction operations
    async createExtraction(extraction: Omit<DealRecapExtraction, 'id'>): Promise<DealRecapExtraction> {
        const extractions = this.sessionStorage.getExtractions();
        const newId = extractions.length > 0 ? Math.max(...extractions.map(e => e.id)) + 1 : 1;
        const newExtraction = {
            ...extraction,
            id: newId,
            deal_id: extraction.deal_id || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        extractions.push(newExtraction as any);
        this.sessionStorage.updateExtractions(extractions);
        return {
            ...newExtraction,
            created_at: new Date(newExtraction.created_at),
            updated_at: new Date(newExtraction.updated_at)
        };
    }

    async getExtractionByChatId(chatId: string): Promise<DealRecapExtraction | null> {
        const extractions = this.sessionStorage.getExtractions();
        const extraction = extractions.find(e => e.chat_id === parseInt(chatId));
        if (!extraction) return null;
        
        return {
            ...extraction,
            status: extraction.status as 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'FAILED',
            created_at: new Date(extraction.created_at),
            updated_at: new Date(extraction.updated_at)
        };
    }

    async updateExtraction(id: string, updates: Partial<DealRecapExtraction>): Promise<DealRecapExtraction | null> {
        const extractions = this.sessionStorage.getExtractions();
        const index = extractions.findIndex(e => e.id === parseInt(id));
        if (index === -1) return null;
        
        extractions[index] = {
            ...extractions[index],
            ...updates,
            updated_at: new Date().toISOString()
        } as any;
        
        this.sessionStorage.updateExtractions(extractions);
        const extraction = extractions[index];
        return {
            ...extraction,
            status: extraction.status as 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'FAILED',
            created_at: new Date(extraction.created_at),
            updated_at: new Date(extraction.updated_at)
        };
    }

    // Complex queries
    async getChatWithMessagesAndUsers(chatId: string): Promise<{
        chat: DealRecapChat;
        messages: DealRecapMessage[];
        users: DealRecapUser[];
    } | null> {
        const chat = await this.getChatById(chatId);
        if (!chat) return null;

        const messages = await this.getMessagesByChatId(chatId);
        const userIds = [...new Set(messages.map(msg => msg.user_id))];
        
        const users = this.sessionStorage.getUsers();
        const foundUsers = userIds
            .map(userId => users.find(u => u.id === userId))
            .filter(user => user !== null) as DealRecapUser[];

        return { chat, messages, users: foundUsers };
    }

    async getDealRecapWithChat(dealId: string): Promise<{
        deal: DealRecap;
        chat?: {
            chat: DealRecapChat;
            messages: DealRecapMessage[];
            users: DealRecapUser[];
        };
    } | null> {
        const deal = await this.getDealRecapById(dealId);
        if (!deal) return null;

        let chatData = null;
        if (deal.chat_id) {
            chatData = await this.getChatWithMessagesAndUsers(deal.chat_id.toString());
        }

        return { deal, chat: chatData || undefined };
    }

    // Connection management
    async close(): Promise<void> {
        try {
            this.isInitialized = false;
            console.log('Mock database connection closed');
        } catch (error) {
            console.error('Error closing mock database:', error);
        }
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            return this.isInitialized;
        } catch (error) {
            console.error('Mock database health check failed:', error);
            return false;
        }
    }
}