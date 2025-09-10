// Common API response types
export interface ApiResponse<T = any> {
    data: T;
    message?: string;
    success: boolean;
    status: number;
}

export interface ApiError {
    message: string;
    status: number;
    code?: string;
}

// Example types for ATS Deal Recap
export interface Deal {
    id: string;
    title: string;
    description: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
}

export interface DealListResponse {
    deals: Deal[];
    total: number;
    page: number;
    limit: number;
}

// User type for ATS Deal Recap
export interface DealRecapUser {
    id: number;
    name: string;
    email: string;
    is_couterparty: boolean;
    company?: string | null;
    office?: 'ATC' | 'ATS' | string | null;
    desk?: 'crude' | 'gasoline' | 'diesel' | 'jet_fuel' | 'fuel_oil' | string | null;
}

// Message type for chat functionality
export interface DealRecapMessage {
    id: number;
    chat_id: number;
    user_id: number;
    date: Date;
    content: string;
}

// Chat type for conversation management
export interface DealRecapChat {
    id: number;
    messages: DealRecapMessage[];
    title?: string;
    created_at?: Date;
    updated_at?: Date;
}   

// Extraction type for deal extraction from conversations
export interface DealRecapExtraction {
    id: number;
    chat_id: number;
    deal_id?: number;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    confidence?: number; // 0.0 to 1.0
    created_at?: Date;
    updated_at?: Date;
}

// Conversation type for storing raw conversations
export interface DealRecapConversation {
    id: number;
    conversation: string;
    chat_id?: number | null;
    audio_id?: number | null;
    audio_url?: string | null;
    audio_generated_at?: Date | null;
}

// Deal Reference type for ATS Deal Recap
export interface DealRecap {
    id: number;
    counter_party_company: string;
    office: 'ATC' | 'ATS' | string;
    desk: 'crude' | 'gasoline' | 'diesel' | 'jet_fuel' | 'fuel_oil' | string;
    product: 'crude' | 'gasoline' | 'diesel' | 'jet_fuel' | 'fuel_oil' | string;
    laycan_start?: Date;
    laycan_end?: Date;
    volume: number;
    volume_uom?: 'BBL' | 'MT' | 'GAL' | 'L' | string;
    deliver_method?: 'vessel' | 'pipeline' | 'truck' | 'rail' | string;
    delivery_port?: string;
    vessel_name?: string; // Optional for non-vessel deliveries
    inco_term?: 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'DAP' | 'DDP' | string;
    inspection_agent?: 'SGS' | 'Bureau_Veritas' | 'Intertek' | string;
    // Pricing: Either fixed price OR price basis + differential
    price?: number; // Fixed price (optional)
    price_basis?: 'dated_brent' | 'wti' | 'dubai' | 'gasoil' | string; // Price reference (optional)
    price_diff?: number; // Price differential (optional)
    price_window_start?: Date;
    price_window_end?: Date;
    // Source tracking
    chat_id?: number; // If extracted from chat
    email_id?: number; // If extracted from email
    currency?: 'USD' | 'EUR' | 'GBP' | string;
    deal_type?: 'crude_physical' | 'product_physical' | 'paper' | string;
    deal_subtype?: 'spot' | 'term' | 'swaps' | 'options' | string;
    created_at?: Date;
    updated_at?: Date;
}

// OpenAI API types
export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    tool_calls?: OpenAIToolCall[];
}

export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface OpenAITool {
    type: string;
    function: OpenAIFunction;
}

export interface OpenAIFunction {
    name: string;
    description?: string;
    parameters?: OpenAIParameters;
}

export interface OpenAIParameters {
    type: string;
    properties: Record<string, OpenAIProperty>;
    required?: string[];
}

export interface OpenAIProperty {
    type: string;
    name?: string;
    description?: string;
    format?: string;
    required?: boolean;
    enum?: string[];
    properties?: OpenAIProperty[];
    items?: OpenAIProperty;
}   

export interface OpenAIToolChoice {
    type: 'function';
    function: {
        name: string;
    };
}

export interface OpenAIRequest {
    model: string;
    messages: OpenAIMessage[];
    tools?: OpenAITool[];
    tool_choice?: OpenAIToolChoice;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface OpenAIChoice {
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
}

export interface OpenAIUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: OpenAIChoice[];
    usage: OpenAIUsage;
}

export interface OpenAIApiResponse {
    data: OpenAIResponse;
    success: boolean;
    status: number;
}

export interface DealRecapAudio {
    id: number;
    participants: string[];
    audio_url: string;
    audio_generated_at: string;
}

// Email type for email chain management
export interface DealRecapEmail {
    id: number;
    subject: string;
    content: string;
    participants: string[];
    created_at: Date;
    updated_at: Date;
}