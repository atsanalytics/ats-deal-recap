// Environment configuration
export const config = {
    openai: {
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-nano',
    },
    app: {
        name: import.meta.env.VITE_APP_NAME || 'ATS Deal Recap',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    },
    debug: {
        enabled: import.meta.env.VITE_DEBUG_MODE === 'true',
        logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
    },
};

// Validate required environment variables
const requiredEnvVars = ['VITE_OPENAI_API_KEY'];

export const validateEnvironment = (): void => {
    const missingVars: string[] = [];
    
    requiredEnvVars.forEach(envVar => {
        if (!import.meta.env[envVar]) {
            missingVars.push(envVar);
        }
    });
    
    if (missingVars.length > 0) {
        console.error('Missing required environment variables:', missingVars);
        console.error('Please create a .env file with the required variables.');
        console.error('See .env.example for reference.');
        
        // In development, show helpful message
        if (import.meta.env.DEV) {
            console.warn('Running in development mode without OpenAI API key.');
            console.warn('Some features may not work properly.');
        }
    }
};

// Initialize environment validation
validateEnvironment();
