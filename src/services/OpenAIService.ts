import { BaseApiService } from './BaseApiService';
import { 
    OpenAIRequest, 
    OpenAIResponse, 
    OpenAIApiResponse, 
    OpenAIMessage,
    OpenAITool,
    OpenAIToolChoice,
    DealRecap 
} from './types';
import { config } from '../config/env';

export class OpenAIService extends BaseApiService {
    private apiKey: string;

    constructor(apiKey?: string) {
        const key = apiKey || config.openai.apiKey;
        
        if (!key) {
            throw new Error('OpenAI API key is required. Please set VITE_OPENAI_API_KEY in your .env file.');
        }
        
        super(config.openai.baseUrl);
        this.apiKey = key;
        this.setAuthToken(key);
    }

    private async handleOpenAIResponse(response: Response): Promise<OpenAIApiResponse> {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
                message: errorData.error?.message || response.statusText || 'OpenAI API error',
                status: response.status,
                code: errorData.error?.code || response.status.toString(),
            };
        }

        const data: OpenAIResponse = await response.json();
        return {
            data,
            success: true,
            status: response.status,
        };
    }

    async chatCompletion(request: OpenAIRequest): Promise<OpenAIApiResponse> {
        const response = await fetch(`${config.openai.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(request),
        });

        return this.handleOpenAIResponse(response);
    }

    async extractDealFromConversation(conversation: string, users?: Array<{
        name: string;
        email: string;
        is_couterparty: boolean;
        company?: string | null;
        office?: string | null;
        desk?: string | null;
    }>): Promise<Partial<DealRecap> | null> {
        // Build user context for better extraction
        const userContext = users && users.length > 0 ? `
USER CONTEXT:
${users.map(user => 
    `- ${user.name} (${user.email}): ${user.is_couterparty ? 'Counterparty' : 'Our Company'} - ${user.company || 'Unknown Company'}${user.office ? ` - Office: ${user.office}` : ''}${user.desk ? ` - Desk: ${user.desk}` : ''}`
).join('\n')}

Based on the user context above:
- Identify which users are from our company (is_couterparty = false) vs counterparties (is_couterparty = true)
- Use the office and desk information to determine the correct trading desk and office
- Use company names to identify the correct counterparty company
` : '';

        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: `You are an expert deal extraction AI for the energy trading industry. Your task is to analyze conversations between traders and extract structured deal information.

Extract deal information from conversations about crude oil, gasoline, diesel, jet fuel, and fuel oil trading. Look for:
- Counter party company names
- Product types (crude, gasoline, diesel, jet_fuel, fuel_oil) - THIS IS REQUIRED
- Volumes and units of measurement (BBL, MT, GAL, L)
- Delivery methods (vessel, pipeline, truck, rail)
- Delivery ports and locations
- Laycan periods (loading/canceling dates)
- Pricing information (fixed prices or basis + differential)
- Incoterms (FOB, CIF, CFR, etc.)
- Inspection agents (SGS, Bureau Veritas, Intertek)
- Deal types (crude_physical, product_physical, paper)
- Deal subtypes (spot, term, swaps, options)

${userContext}

IMPORTANT: 
- You MUST always extract the product type. If you cannot determine the product from the conversation, make your best inference based on context clues (e.g., if they mention "crude" or "oil", use "crude"; if they mention "gas" or "gasoline", use "gasoline", etc.).
- Use the user context to accurately identify counterparty companies and our trading office/desk.
- If user context is provided, prioritize the office and desk information from our company users for the office and desk fields.

If no clear deal information is found, return null.`
            },
            {
                role: 'user',
                content: `Please extract deal information from this conversation:\n\n${conversation}`
            }
        ];

        const tools: OpenAITool[] = [
            {
                type: 'function',
                function: {
                    name: 'extract_deal_reference',
                    description: 'Extract structured deal reference information from a trading conversation',
                    parameters: {
                        type: 'object',
                        properties: {
                            counter_party_company: {
                                type: 'string',
                                description: 'Name of the counter party company'
                            },
                            office: {
                                type: 'string',
                                enum: ['ATC', 'ATS', 'ATL', 'ATA', 'ATF'],
                                description: 'Trading office (ATC, ATS, ATL, ATA, ATF)'
                            },
                            desk: {
                                type: 'string',
                                enum: ['crude', 'gasoline', 'diesel', 'jet_fuel', 'fuel_oil'],
                                description: 'Trading desk specialization'
                            },
                            product: {
                                type: 'string',
                                enum: ['crude', 'gasoline', 'diesel', 'jet_fuel', 'fuel_oil'],
                                description: 'Product being traded'
                            },
                            laycan_start: {
                                type: 'string',
                                format: 'date',
                                description: 'Laycan start date (YYYY-MM-DD format)'
                            },
                            laycan_end: {
                                type: 'string',
                                format: 'date',
                                description: 'Laycan end date (YYYY-MM-DD format)'
                            },
                            volume: {
                                type: 'number',
                                description: 'Volume amount'
                            },
                            volume_uom: {
                                type: 'string',
                                enum: ['BBL', 'MT', 'GAL', 'L'],
                                description: 'Unit of measurement for volume'
                            },
                            deliver_method: {
                                type: 'string',
                                enum: ['vessel', 'pipeline', 'truck', 'rail'],
                                description: 'Method of delivery'
                            },
                            delivery_port: {
                                type: 'string',
                                description: 'Delivery port or location'
                            },
                            vessel_name: {
                                type: 'string',
                                description: 'Vessel name (if applicable)'
                            },
                            inco_term: {
                                type: 'string',
                                enum: ['FOB', 'CIF', 'CFR', 'EXW', 'DAP', 'DDP'],
                                description: 'Incoterms'
                            },
                            inspection_agent: {
                                type: 'string',
                                enum: ['SGS', 'Bureau_Veritas', 'Intertek'],
                                description: 'Inspection agent'
                            },
                            price: {
                                type: 'number',
                                description: 'Fixed price (if applicable)'
                            },
                            price_basis: {
                                type: 'string',
                                enum: ['dated_brent', 'wti', 'dubai', 'gasoline_singapore_92', 'gasoil'],
                                description: 'Price basis reference (if applicable)'
                            },
                            price_diff: {
                                type: 'number',
                                description: 'Price differential (if applicable)'
                            },
                            price_window_start: {
                                type: 'string',
                                format: 'date',
                                description: 'Price window start date (YYYY-MM-DD format)'
                            },
                            price_window_end: {
                                type: 'string',
                                format: 'date',
                                description: 'Price window end date (YYYY-MM-DD format)'
                            },
                            currency: {
                                type: 'string',
                                enum: ['USD', 'EUR', 'GBP'],
                                description: 'Currency'
                            },
                            deal_type: {
                                type: 'string',
                                enum: ['crude_physical', 'product_physical', 'paper'],
                                description: 'Type of deal'
                            },
                            deal_subtype: {
                                type: 'string',
                                enum: ['spot', 'term', 'swaps', 'options'],
                                description: 'Deal subtype'
                            }
                        },
                        required: [
                            'counter_party_company',
                            'office',
                            'desk',
                            'product',
                            'volume'
                        ]
                    } as any
                }
            }
        ];

        const tool_choice: OpenAIToolChoice = { type: 'function', function: { name: 'extract_deal_reference' } };

        try {
            const response = await this.chatCompletion({
                model: config.openai.model,
                messages,
                tools,
                tool_choice,
            });

            // Extract the function call result
            const choice = response.data.choices[0];
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                const toolCall = choice.message.tool_calls[0];
                if (toolCall.function.name === 'extract_deal_reference') {
                    const extractedData = JSON.parse(toolCall.function.arguments);
                    
                    // Convert date strings to Date objects
                    const DealRecap: Partial<DealRecap> = {
                        counter_party_company: extractedData.counter_party_company,
                        office: extractedData.office,
                        desk: extractedData.desk,
                        product: extractedData.product,
                        laycan_start: new Date(extractedData.laycan_start),
                        laycan_end: new Date(extractedData.laycan_end),
                        volume: extractedData.volume,
                        volume_uom: extractedData.volume_uom,
                        deliver_method: extractedData.deliver_method,
                        delivery_port: extractedData.delivery_port,
                        vessel_name: extractedData.vessel_name || undefined,
                        inco_term: extractedData.inco_term,
                        inspection_agent: extractedData.inspection_agent,
                        price: extractedData.price || undefined,
                        price_basis: extractedData.price_basis || undefined,
                        price_diff: extractedData.price_diff || undefined,
                        price_window_start: new Date(extractedData.price_window_start),
                        price_window_end: new Date(extractedData.price_window_end),
                        currency: extractedData.currency,
                        deal_type: extractedData.deal_type,
                        deal_subtype: extractedData.deal_subtype,
                    };

                    return DealRecap;
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting deal from conversation:', error);
            throw new Error('Failed to extract deal information from conversation');
        }
    }

    async extractDealFromEmail(emailContent: string, users?: Array<{
        name: string;
        email: string;
        is_couterparty: boolean;
        company?: string | null;
        office?: string | null;
        desk?: string | null;
    }>): Promise<Partial<DealRecap> | null> {
        // Build user context for better extraction
        const userContext = users && users.length > 0 ? `
USER CONTEXT:
${users.map(user => 
    `- ${user.name} (${user.email}): ${user.is_couterparty ? 'Counterparty' : 'Our Company'} - ${user.company || 'Unknown Company'}${user.office ? ` - Office: ${user.office}` : ''}${user.desk ? ` - Desk: ${user.desk}` : ''}`
).join('\n')}

Based on the user context above:
- Identify which users are from our company (is_couterparty = false) vs counterparties (is_couterparty = true)
- Use the office and desk information to determine the correct trading desk and office
- Use company names to identify the correct counterparty company
` : '';

        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: `You are an expert deal extraction AI for the energy trading industry. Your task is to analyze email chains between traders and extract structured deal information.

Extract deal information from email conversations about crude oil, gasoline, diesel, jet fuel, and fuel oil trading. Look for:
- Counter party company names
- Product types (crude, gasoline, diesel, jet_fuel, fuel_oil) - THIS IS REQUIRED
- Volumes and units of measurement (BBL, MT, GAL, L)
- Delivery methods (vessel, pipeline, truck, rail)
- Delivery ports and locations
- Laycan periods (loading/canceling dates)
- Pricing information (fixed prices or basis + differential)
- Incoterms (FOB, CIF, CFR, etc.)
- Inspection agents (SGS, Bureau Veritas, Intertek)
- Deal types (crude_physical, product_physical, paper)
- Deal subtypes (spot, term, swaps, options)

${userContext}

IMPORTANT: 
- You MUST always extract the product type. If you cannot determine the product from the email, make your best inference based on context clues (e.g., if they mention "crude" or "oil", use "crude"; if they mention "gas" or "gasoline", use "gasoline", etc.).
- Use the user context to accurately identify counterparty companies and our trading office/desk.
- If user context is provided, prioritize the office and desk information from our company users for the office and desk fields.
- Email chains may contain multiple emails - analyze the entire chain for complete deal information.

If no clear deal information is found, return null.`
            },
            {
                role: 'user',
                content: `Please extract deal information from this email chain:\n\n${emailContent}`
            }
        ];

        const tools: OpenAITool[] = [
            {
                type: 'function',
                function: {
                    name: 'extract_deal_reference',
                    description: 'Extract structured deal reference information from a trading email chain',
                    parameters: {
                        type: 'object',
                        properties: {
                            counter_party_company: {
                                type: 'string',
                                description: 'Name of the counter party company'
                            },
                            office: {
                                type: 'string',
                                enum: ['ATC', 'ATS', 'ATL', 'ATA', 'ATF'],
                                description: 'Trading office (ATC, ATS, ATL, ATA, ATF)'
                            },
                            desk: {
                                type: 'string',
                                enum: ['crude', 'gasoline', 'diesel', 'jet_fuel', 'fuel_oil'],
                                description: 'Trading desk specialization'
                            },
                            product: {
                                type: 'string',
                                enum: ['crude', 'gasoline', 'diesel', 'jet_fuel', 'fuel_oil'],
                                description: 'Product being traded'
                            },
                            laycan_start: {
                                type: 'string',
                                format: 'date',
                                description: 'Laycan start date (YYYY-MM-DD format)'
                            },
                            laycan_end: {
                                type: 'string',
                                format: 'date',
                                description: 'Laycan end date (YYYY-MM-DD format)'
                            },
                            volume: {
                                type: 'number',
                                description: 'Volume amount'
                            },
                            volume_uom: {
                                type: 'string',
                                enum: ['BBL', 'MT', 'GAL', 'L'],
                                description: 'Unit of measurement for volume'
                            },
                            deliver_method: {
                                type: 'string',
                                enum: ['vessel', 'pipeline', 'truck', 'rail'],
                                description: 'Delivery method'
                            },
                            delivery_port: {
                                type: 'string',
                                description: 'Delivery port or location'
                            },
                            vessel_name: {
                                type: 'string',
                                description: 'Vessel name (if applicable)'
                            },
                            inco_term: {
                                type: 'string',
                                enum: ['FOB', 'CIF', 'CFR', 'EXW', 'DAP', 'DDP'],
                                description: 'Incoterm'
                            },
                            inspection_agent: {
                                type: 'string',
                                enum: ['SGS', 'Bureau_Veritas', 'Intertek'],
                                description: 'Inspection agent'
                            },
                            price: {
                                type: 'number',
                                description: 'Fixed price (if applicable)'
                            },
                            price_basis: {
                                type: 'string',
                                enum: ['dated_brent', 'wti', 'dubai', 'gasoil'],
                                description: 'Price basis (if applicable)'
                            },
                            price_diff: {
                                type: 'number',
                                description: 'Price differential (if applicable)'
                            },
                            price_window_start: {
                                type: 'string',
                                format: 'date',
                                description: 'Price window start date (YYYY-MM-DD format)'
                            },
                            price_window_end: {
                                type: 'string',
                                format: 'date',
                                description: 'Price window end date (YYYY-MM-DD format)'
                            },
                            currency: {
                                type: 'string',
                                enum: ['USD', 'EUR', 'GBP'],
                                description: 'Currency'
                            },
                            deal_type: {
                                type: 'string',
                                enum: ['crude_physical', 'product_physical', 'paper'],
                                description: 'Deal type'
                            },
                            deal_subtype: {
                                type: 'string',
                                enum: ['spot', 'term', 'swaps', 'options'],
                                description: 'Deal subtype'
                            }
                        },
                        required: ['counter_party_company', 'office', 'desk', 'product', 'volume']
                    }
                }
            }
        ];

        const tool_choice: OpenAIToolChoice = { type: 'function', function: { name: 'extract_deal_reference' } };

        try {
            const response = await this.chatCompletion({
                model: config.openai.model,
                messages,
                tools,
                tool_choice,
            });

            const choice = response.data.choices[0];
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                const toolCall = choice.message.tool_calls[0];
                if (toolCall.function.name === 'extract_deal_reference') {
                    const extractedData = JSON.parse(toolCall.function.arguments);
                    
                    // Convert date strings to Date objects
                    const DealRecap: Partial<DealRecap> = {
                        counter_party_company: extractedData.counter_party_company,
                        office: extractedData.office,
                        desk: extractedData.desk,
                        product: extractedData.product,
                        laycan_start: new Date(extractedData.laycan_start),
                        laycan_end: new Date(extractedData.laycan_end),
                        volume: extractedData.volume,
                        volume_uom: extractedData.volume_uom,
                        deliver_method: extractedData.deliver_method,
                        delivery_port: extractedData.delivery_port,
                        vessel_name: extractedData.vessel_name || undefined,
                        inco_term: extractedData.inco_term,
                        inspection_agent: extractedData.inspection_agent,
                        price: extractedData.price || undefined,
                        price_basis: extractedData.price_basis || undefined,
                        price_diff: extractedData.price_diff || undefined,
                        price_window_start: new Date(extractedData.price_window_start),
                        price_window_end: new Date(extractedData.price_window_end),
                        currency: extractedData.currency,
                        deal_type: extractedData.deal_type,
                        deal_subtype: extractedData.deal_subtype,
                    };

                    return DealRecap;
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting deal from email:', error);
            throw new Error('Failed to extract deal information from email');
        }
    }

    async parseConversationToChat(conversation: string): Promise<{
        title: string;
        users: Array<{
            name: string;
            email: string;
            is_couterparty: boolean;
            company: string;
            office?: string;
            desk?: string;
        }>;
        messages: Array<{
            user_email: string;
            content: string;
            date: string;
        }>;
    }> {
        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: `You are an expert at parsing trading conversations. Your task is to extract structured information from conversations between traders.

Parse the conversation and extract:
1. A concise, descriptive title for the chat (max 50 characters)
2. All unique users mentioned in the conversation with their details
3. All messages with their sender information and timestamps

For users, determine if they are counterparties based on their company:
- If company is ATS Trading or office is ATC/ATS/ATL/ATA/ATF, then is_couterparty = false (our company)
- If company is any other company (Shell, BP, Exxon, etc.), then is_couterparty = true (counterparty)
- If no company information is available, use "Unknown" as company and set is_couterparty = true (assume counterparty)

For messages, extract the content and assign realistic timestamps based on the conversation flow.

Handle different scenarios:
- If speakers are identified by name, use their names
- If speakers are generic (e.g., "Speaker", "Trader", "Counterparty"), use those names
- If no clear speaker identification, use "Unknown" as name and email
- For single-person conversations, create one user entry
- For unknown speakers, use "Unknown" as name and "unknown@unknown.com" as email

Format the response as structured data.`
            },
            {
                role: 'user',
                content: `Please parse this trading conversation:\n\n${conversation}`
            }
        ];

        const tools: OpenAITool[] = [
            {
                type: 'function',
                function: {
                    name: 'parse_conversation',
                    description: 'Parse a trading conversation into structured chat data',
                    parameters: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                description: 'A concise, descriptive title for the chat (max 50 characters)'
                            },
                            users: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            description: 'Full name of the user'
                                        },
                                        email: {
                                            type: 'string',
                                            description: 'Email address of the user'
                                        },
                                        is_couterparty: {
                                            type: 'boolean',
                                            description: 'Whether this user is a counterparty (false for ATC/ATS/ATL/ATA/ATF employees, true for external companies like Shell, BP, Exxon, etc.)'
                                        },
                                        company: {
                                            type: 'string',
                                            description: 'Counterparty ompany name, null if ATC/ATS/ATL/ATA/ATF employee'
                                        },
                                        office: {
                                            type: 'string',
                                            enum: ['ATC', 'ATS', 'ATL', 'ATA', 'ATF'],
                                            description: 'Office if ATC/ATS/ATL/ATA/ATF employee, null if external company'
                                        },
                                        desk: {
                                            type: 'string',
                                            enum: ['crude', 'gasoline', 'diesel', 'jet_fuel', 'fuel_oil'],
                                            description: 'Desk if ATC/ATS/ATL/ATA/ATF employee, null if external company'
                                        }
                                    },
                                    required: ['name', 'email', 'is_couterparty']
                                }
                            },
                            messages: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        user_email: {
                                            type: 'string',
                                            description: 'Email of the user who sent this message'
                                        },
                                        content: {
                                            type: 'string',
                                            description: 'The message content'
                                        },
                                        date: {
                                            type: 'string',
                                            format: 'date-time',
                                            description: 'ISO timestamp for the message'
                                        }
                                    },
                                    required: ['user_email', 'content', 'date']
                                }
                            }
                        },
                        required: ['title', 'users', 'messages']
                    } as any
                }
            }
        ];

        const tool_choice: OpenAIToolChoice = { type: 'function', function: { name: 'parse_conversation' } };

        try {
            const response = await this.chatCompletion({
                model: config.openai.model,
                messages,
                tools,
                tool_choice,
            });

            const choice = response.data.choices[0];
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                const toolCall = choice.message.tool_calls[0];
                if (toolCall.function.name === 'parse_conversation') {
                    return JSON.parse(toolCall.function.arguments);
                }
            }

            throw new Error('Failed to parse conversation');
        } catch (error) {
            console.error('Error parsing conversation:', error);
            throw new Error('Failed to parse conversation into chat data');
        }
    }

    async generateMockConversation(parameters: {
        product?: string;
        volume?: number;
        counterparty?: string;
        office?: string;
        desk?: string;
        deliveryPort?: string;
        pricingModel?: 'fixed' | 'basis';
    }): Promise<string> {
        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: `You are an expert in energy trading conversations. Generate realistic trading conversations between two traders discussing a deal.

The conversation should include:
- Natural, professional trading language
- Specific deal details (product, volume, pricing, delivery terms)
- User information (names, companies, offices, desks, emails)
- Negotiation elements (price discussions, terms, conditions)
- Technical details (vessel names, ports, inspection agents, incoterms)
- Realistic timeline and laycan periods

Format the conversation as a string with each message on a new line, following this pattern:
"Name (Company Office Desk): Message content"

Include email addresses in the format: "Name (Company Office Desk - email@company.com): Message content"

Make the conversation realistic, professional, and include all necessary deal information that could be extracted later.`
            },
            {
                role: 'user',
                content: `Generate a mock trading conversation with these parameters:
- Product: ${parameters.product || 'crude oil'}
- Volume: ${parameters.volume || '500,000'} barrels
- Counterparty: ${parameters.counterparty || 'Shell Trading'}
- Office: ${parameters.office || 'ATS'}
- Desk: ${parameters.desk || 'crude'}
- Delivery Port: ${parameters.deliveryPort || 'Rotterdam'}
- Pricing Model: ${parameters.pricingModel || 'basis'}

Make it a realistic conversation between our trader and the counterparty, including negotiation, technical details, and final agreement.`
            }
        ];

        try {
            const response = await this.chatCompletion({
                model: config.openai.model,
                messages
            });

            const choice = response.data.choices[0];
            if (choice.message.content) {
                return choice.message.content;
            }

            throw new Error('No conversation generated');
        } catch (error) {
            console.error('Error generating mock conversation:', error);
            throw new Error('Failed to generate mock conversation');
        }
    }

    // Generate speech using OpenAI TTS API
    public async generateSpeech(text: string, voice: string = 'alloy'): Promise<Blob> {
        try {
            const blob = await this.postBlob('/audio/speech', {
                model: 'tts-1',
                input: text,
                voice: voice,
                response_format: 'mp3'
            }, {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            });

            return blob;
        } catch (error) {
            console.error('Error generating speech:', error);
            throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Transcribe audio using OpenAI Whisper API
    public async transcribeAudio(audioBlob: Blob, participants: string[]): Promise<string> {
        try {
            // Create FormData for multipart/form-data request
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.mp3');
            formData.append('model', 'whisper-1');
            formData.append('response_format', 'text');

            // Make the transcription request
            const response = await fetch(`${config.openai.baseUrl}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
            }

            const transcription = await response.text();
            
            // Format the transcription with participants
            const formattedConversation = await this.formatTranscriptionWithParticipants(transcription, participants);
            
            return formattedConversation;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Format transcription text with participant names
    private async formatTranscriptionWithParticipants(transcription: string, participants: string[]): Promise<string> {
        try {
            // Clean up the transcription
            let formattedText = transcription.trim();
            
            // If we have participants, try to format the conversation
            if (participants.length >= 2) {
                // Use OpenAI to help format the conversation with proper speaker attribution
                return await this.formatConversationWithAI(formattedText, participants);
            } else {
                // If no participants, return the raw transcription
                return formattedText;
            }
        } catch (error) {
            console.error('Error formatting transcription:', error);
            return transcription; // Return raw transcription if formatting fails
        }
    }

    // Use AI to format the conversation with proper speaker attribution
    private async formatConversationWithAI(transcription: string, participants: string[]): Promise<string> {
        try {
            let prompt: string;
            
            if (participants.length === 0) {
                // No participants provided - let AI identify speakers
                prompt = `Please format this audio transcription into a conversation. 
                
Transcription:
${transcription}

Please format it as a conversation where each line follows this pattern:
"Speaker Name: Message content"

Make sure to:
1. Identify who is speaking based on context and conversation flow
2. Use appropriate names for speakers (e.g., "Trader", "Counterparty", "Speaker 1", etc.)
3. Add proper line breaks between speakers
4. Keep the original meaning and content intact
5. Format it like a natural conversation
6. If it's a single person speaking, format as "Speaker: Message content"

Return only the formatted conversation text.`;
            } else if (participants.length === 1) {
                // Single participant provided
                const participant = participants[0];
                prompt = `Please format this audio transcription into a conversation. 
                
Participant:
- ${participant}

Transcription:
${transcription}

Please format it as a conversation where each line follows this pattern:
"Speaker Name: Message content"

Make sure to:
1. Identify who is speaking based on context and conversation flow
2. Use the provided participant name when appropriate
3. Add other speakers as needed (e.g., "Counterparty", "Other Speaker")
4. Add proper line breaks between speakers
5. Keep the original meaning and content intact
6. Format it like a natural conversation
7. If it's a single person speaking, use the provided participant name

Return only the formatted conversation text.`;
            } else {
                // Multiple participants provided
                const participant1 = participants[0];
                const participant2 = participants[1];
                prompt = `Please format this audio transcription into a conversation between participants. 
                
Participants:
- ${participant1}
- ${participant2}

Transcription:
${transcription}

Please format it as a conversation where each line follows this pattern:
"Speaker Name: Message content"

Make sure to:
1. Identify who is speaking based on context and conversation flow
2. Use the provided participant names when appropriate
3. Add proper line breaks between speakers
4. Keep the original meaning and content intact
5. Format it like a natural conversation

Return only the formatted conversation text.`;
            }

            const response = await this.chatCompletion({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that formats audio transcriptions into properly structured conversations with speaker attribution.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            });

            if (response.success && response.data.choices.length > 0) {
                return response.data.choices[0].message.content || transcription;
            } else {
                return transcription; // Fallback to raw transcription
            }
        } catch (error) {
            console.error('Error formatting conversation with AI:', error);
            return transcription; // Fallback to raw transcription
        }
    }

}
