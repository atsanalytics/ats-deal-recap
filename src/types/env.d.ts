/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OPENAI_API_KEY: string;
    readonly VITE_OPENAI_BASE_URL: string;
    readonly VITE_OPENAI_MODEL: string;
    readonly VITE_API_BASE_URL: string;
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_VERSION: string;
    readonly VITE_DEBUG_MODE: string;
    readonly VITE_LOG_LEVEL: string;
    readonly VITE_DB_HOST: string;
    readonly VITE_DB_PORT: string;
    readonly VITE_DB_NAME: string;
    readonly VITE_DB_USER: string;
    readonly VITE_DB_PASSWORD: string;
    readonly VITE_DB_SSL: string;
    readonly VITE_DB_MAX_CONNECTIONS: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
