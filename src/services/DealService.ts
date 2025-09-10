import { BaseApiService } from './BaseApiService';
import { DatabaseService } from './DatabaseService';
import { 
    Deal, 
    DealListResponse, 
    ApiResponse, 
    DealRecap, 
    DealRecapUser,
    DealRecapChat,
    DealRecapMessage,
    DealRecapExtraction
} from './types';

export class DealService extends BaseApiService {
    private dbService: DatabaseService;

    constructor() {
        super('/api/deals');
        this.dbService = new DatabaseService();
    }

    // Database operations for Deal Recap
    async createDealRecap(dealData: Omit<DealRecap, 'id' | 'created_at' | 'updated_at'>): Promise<DealRecap> {
        try {
            const dbDeal: Omit<DealRecap, 'id' | 'created_at' | 'updated_at'> = {
                counter_party_company: dealData.counter_party_company,
                office: dealData.office,
                desk: dealData.desk,
                product: dealData.product,
                laycan_start: dealData.laycan_start || new Date(),
                laycan_end: dealData.laycan_end || new Date(),
                volume: dealData.volume,
                volume_uom: dealData.volume_uom || 'BBL',
                deliver_method: dealData.deliver_method || 'vessel',
                delivery_port: dealData.delivery_port || '',
                vessel_name: dealData.vessel_name,
                inco_term: dealData.inco_term || 'FOB',
                inspection_agent: dealData.inspection_agent || 'SGS',
                price: dealData.price,
                price_basis: dealData.price_basis,
                price_diff: dealData.price_diff,
                price_window_start: dealData.price_window_start || new Date(),
                price_window_end: dealData.price_window_end || new Date(),
                currency: dealData.currency,
                deal_type: dealData.deal_type,
                deal_subtype: dealData.deal_subtype,
                chat_id: dealData.chat_id,
                email_id: dealData.email_id
            };

            const createdDeal = await this.dbService.createDealRecap(dbDeal);
            
            // Convert back to DealRecap format
            return this.convertDbDealToDealRecap(createdDeal);
        } catch (error) {
            console.error('Error creating deal recap:', error);
            throw new Error(`Failed to create deal recap: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getDealRecapById(id: string): Promise<DealRecap | null> {
        try {
            const dbDeal = await this.dbService.getDealRecapById(id);
            if (!dbDeal) return null;
            
            return this.convertDbDealToDealRecap(dbDeal);
        } catch (error) {
            console.error('Error getting deal recap:', error);
            throw new Error(`Failed to get deal recap: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getAllDealRecaps(limit: number = 50, offset: number = 0): Promise<DealRecap[]> {
        try {
            const dbDeals = await this.dbService.getAllDealRecaps(limit, offset);
            return dbDeals.map(deal => this.convertDbDealToDealRecap(deal));
        } catch (error) {
            console.error('Error getting all deal recaps:', error);
            throw new Error(`Failed to get deal recaps: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async updateDealRecap(id: string, updates: Partial<DealRecap>): Promise<DealRecap | null> {
        try {
            const dbUpdates: Partial<DealRecap> = {};
            
            // Map DealRecap fields to database fields
            if (updates.counter_party_company !== undefined) dbUpdates.counter_party_company = updates.counter_party_company;
            if (updates.office !== undefined) dbUpdates.office = updates.office;
            if (updates.desk !== undefined) dbUpdates.desk = updates.desk;
            if (updates.product !== undefined) dbUpdates.product = updates.product;
            if (updates.laycan_start !== undefined) dbUpdates.laycan_start = updates.laycan_start;
            if (updates.laycan_end !== undefined) dbUpdates.laycan_end = updates.laycan_end;
            if (updates.volume !== undefined) dbUpdates.volume = updates.volume;
            if (updates.volume_uom !== undefined) dbUpdates.volume_uom = updates.volume_uom;
            if (updates.deliver_method !== undefined) dbUpdates.deliver_method = updates.deliver_method;
            if (updates.delivery_port !== undefined) dbUpdates.delivery_port = updates.delivery_port;
            if (updates.vessel_name !== undefined) dbUpdates.vessel_name = updates.vessel_name;
            if (updates.inco_term !== undefined) dbUpdates.inco_term = updates.inco_term;
            if (updates.inspection_agent !== undefined) dbUpdates.inspection_agent = updates.inspection_agent;
            if (updates.price !== undefined) dbUpdates.price = updates.price;
            if (updates.price_basis !== undefined) dbUpdates.price_basis = updates.price_basis;
            if (updates.price_diff !== undefined) dbUpdates.price_diff = updates.price_diff;
            if (updates.price_window_start !== undefined) dbUpdates.price_window_start = updates.price_window_start;
            if (updates.price_window_end !== undefined) dbUpdates.price_window_end = updates.price_window_end;
            if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
            if (updates.deal_type !== undefined) dbUpdates.deal_type = updates.deal_type;
            if (updates.deal_subtype !== undefined) dbUpdates.deal_subtype = updates.deal_subtype;
            if (updates.chat_id !== undefined) dbUpdates.chat_id = updates.chat_id;
            if (updates.email_id !== undefined) dbUpdates.email_id = updates.email_id;

            const updatedDeal = await this.dbService.updateDealRecap(id, dbUpdates);
            if (!updatedDeal) return null;
            
            return this.convertDbDealToDealRecap(updatedDeal);
        } catch (error) {
            console.error('Error updating deal recap:', error);
            throw new Error(`Failed to update deal recap: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteDealRecap(id: string): Promise<boolean> {
        try {
            return await this.dbService.deleteDealRecap(id);
        } catch (error) {
            console.error('Error deleting deal recap:', error);
            throw new Error(`Failed to delete deal recap: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // User operations
    async getAllUsers(): Promise<DealRecapUser[]> {
        try {
            return await this.dbService.getAllUsers();
        } catch (error) {
            console.error('Error getting all users:', error);
            throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getUserById(id: string): Promise<DealRecapUser | null> {
        try {
            return await this.dbService.getUserById(id);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getChatById(id: string): Promise<DealRecapChat | null> {
        try {
            return await this.dbService.getChatById(id);
        } catch (error) {
            console.error('Error getting chat by ID:', error);
            throw new Error(`Failed to get chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getAllChats(): Promise<DealRecapChat[]> {
        try {
            return await this.dbService.getAllChats();
        } catch (error) {
            console.error('Error getting all chats:', error);
            throw new Error(`Failed to get chats: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getExtractionByChatId(chatId: string): Promise<DealRecapExtraction | null> {
        try {
            return await this.dbService.getExtractionByChatId(chatId);
        } catch (error) {
            console.error('Error getting extraction by chat ID:', error);
            throw new Error(`Failed to get extraction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Chat and extraction operations
    async createChatWithExtraction(chatData: {
        chat: Omit<DealRecapChat, 'id'>;
        users: Omit<DealRecapUser, 'id'>[];
        messages: Omit<DealRecapMessage, 'id' | 'chat_id'>[];
        extraction?: Omit<DealRecapExtraction, 'id' | 'chat_id'>;
        DealRecap?: Omit<DealRecap, 'id' | 'created_at' | 'updated_at'>;
    }): Promise<{
        chat: DealRecapChat;
        users: DealRecapUser[];
        messages: DealRecapMessage[];
        extraction?: DealRecapExtraction;
        DealRecap?: DealRecap;
    }> {
        try {
            // Create chat
            const createdChat = await this.dbService.createChat({ title: 'Chat' });
            
            // Create users
            const createdUsers = await Promise.all(
                chatData.users.map(user => this.dbService.createUser({
                    name: user.name,
                    email: user.email || '',
                    is_couterparty: user.is_couterparty,
                    company: user.company,
                    office: user.office,
                    desk: user.desk
                }))
            );
            
            // Create messages
            const createdMessages = await Promise.all(
                chatData.messages.map(message => 
                    this.dbService.createMessage({
                        ...message,
                        chat_id: createdChat.id
                    })
                )
            );
            
            // Create extraction if provided
            let createdExtraction: DealRecapExtraction | undefined;
            if (chatData.extraction) {
                const extraction = await this.dbService.createExtraction({
                    chat_id: createdChat.id,
                    status: chatData.extraction.status,
                    confidence: chatData.extraction.confidence || 0.0
                });
                createdExtraction = {
                    id: extraction.id,
                    chat_id: extraction.chat_id,
                    status: extraction.status as any,
                    confidence: extraction.confidence
                };
            }
            
            // Create deal reference if provided
            let createdDealRecap: DealRecap | undefined;
            if (chatData.DealRecap) {
                const dealRef = await this.createDealRecap({
                    ...chatData.DealRecap,
                    chat_id: createdChat.id
                });
                createdDealRecap = dealRef;
            }
            
            return {
                chat: {
                    id: createdChat.id,
                    messages: createdMessages.map(msg => ({
                        id: msg.id,
                        chat_id: msg.chat_id,
                        user_id: msg.user_id,
                        date: msg.date,
                        content: msg.content
                    }))
                },
                users: createdUsers.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    is_couterparty: user.is_couterparty,
                    company: user.company || '',
                    office: user.office || '',
                    desk: user.desk || ''
                })),
                messages: createdMessages.map(msg => ({
                    id: msg.id,
                    chat_id: msg.chat_id,
                    user_id: msg.user_id,
                    date: msg.date,
                    content: msg.content
                })),
                extraction: createdExtraction,
                DealRecap: createdDealRecap
            };
        } catch (error) {
            console.error('Error creating chat with extraction:', error);
            throw new Error(`Failed to create chat with extraction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Helper method to convert database deal to DealRecap
    private convertDbDealToDealRecap(dbDeal: DealRecap): DealRecap {
        return {
            id: dbDeal.id,
            counter_party_company: dbDeal.counter_party_company,
            office: dbDeal.office as any,
            desk: dbDeal.desk as any,
            product: dbDeal.product as any,
            laycan_start: dbDeal.laycan_start,
            laycan_end: dbDeal.laycan_end,
            volume: dbDeal.volume,
            volume_uom: dbDeal.volume_uom as any,
            deliver_method: dbDeal.deliver_method as any,
            delivery_port: dbDeal.delivery_port,
            vessel_name: dbDeal.vessel_name,
            inco_term: dbDeal.inco_term as any,
            inspection_agent: dbDeal.inspection_agent as any,
            price: dbDeal.price,
            price_basis: dbDeal.price_basis as any,
            price_diff: dbDeal.price_diff,
            price_window_start: dbDeal.price_window_start,
            price_window_end: dbDeal.price_window_end,
            currency: dbDeal.currency as any,
            deal_type: dbDeal.deal_type as any,
            deal_subtype: dbDeal.deal_subtype as any,
            chat_id: dbDeal.chat_id,
            email_id: dbDeal.email_id,
            created_at: dbDeal.created_at,
            updated_at: dbDeal.updated_at
        };
    }

    // Legacy API methods (for backward compatibility)
    async getAllDeals(page: number = 1, limit: number = 10): Promise<ApiResponse<DealListResponse>> {
        return this.get<DealListResponse>(`?page=${page}&limit=${limit}`);
    }

    async getDealById(id: string): Promise<ApiResponse<Deal>> {
        return this.get<Deal>(`/${id}`);
    }

    async createDeal(dealData: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Deal>> {
        return this.post<Deal>('', dealData);
    }

    async updateDeal(id: string, dealData: Partial<Deal>): Promise<ApiResponse<Deal>> {
        return this.put<Deal>(`/${id}`, dealData);
    }

    async deleteDeal(id: string): Promise<ApiResponse<void>> {
        return this.delete<void>(`/${id}`);
    }

    async approveDeal(id: string): Promise<ApiResponse<Deal>> {
        return this.put<Deal>(`/${id}/approve`);
    }

    async rejectDeal(id: string): Promise<ApiResponse<Deal>> {
        return this.put<Deal>(`/${id}/reject`);
    }

    // Cleanup method
    async close(): Promise<void> {
        await this.dbService.close();
    }
}
