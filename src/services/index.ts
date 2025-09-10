// Export all services and types
export { BaseApiService } from './BaseApiService';
export { DealService } from './DealService';
export { OpenAIService } from './OpenAIService';
export { DatabaseService } from './DatabaseService';
export * from './types';
export type { DealRecap } from './types';

// Export configuration
export { config } from '../config/env';

// Import services for singleton creation
import { DealService } from './DealService';
import { OpenAIService } from './OpenAIService';
import type { DealRecap } from './types';

// Service factory functions
export const createDealService = () => new DealService();
export const createOpenAIService = (apiKey?: string) => new OpenAIService(apiKey);

// Create default OpenAI service instance (uses environment variables)
export const openAIService = (() => {
    try {
        return new OpenAIService();
    } catch (error) {
        console.warn('OpenAI service not available:', error);
        return null;
    }
})();

// Helper function to extract deal from conversation
export const extractDealFromConversation = async (
    conversation: string, 
    users?: Array<{
        name: string;
        email: string;
        is_couterparty: boolean;
        company?: string | null;
        office?: string | null;
        desk?: string | null;
    }>
): Promise<Partial<DealRecap> | null> => {
    if (!openAIService) {
        throw new Error('OpenAI service is not available. Please check your API key configuration.');
    }
    return openAIService.extractDealFromConversation(conversation, users);
};

// Helper function to extract deal from email
export const extractDealFromEmail = async (
    emailContent: string, 
    users?: Array<{
        name: string;
        email: string;
        is_couterparty: boolean;
        company?: string | null;
        office?: string | null;
        desk?: string | null;
    }>
): Promise<Partial<DealRecap> | null> => {
    if (!openAIService) {
        throw new Error('OpenAI service is not available. Please check your API key configuration.');
    }
    return openAIService.extractDealFromEmail(emailContent, users);
};
