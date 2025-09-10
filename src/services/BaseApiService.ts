import { ApiResponse, ApiError } from './types';

export class BaseApiService {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
        if (!response.ok) {
            const error: ApiError = {
                message: response.statusText || 'An error occurred',
                status: response.status,
                code: response.status.toString(),
            };
            throw error;
        }

        const data = await response.json();
        return {
            data,
            success: true,
            status: response.status,
        };
    }

    private async handleBlobResponse(response: Response): Promise<Blob> {
        if (!response.ok) {
            const error: ApiError = {
                message: response.statusText || 'An error occurred',
                status: response.status,
                code: response.status.toString(),
            };
            throw error;
        }

        return await response.blob();
    }

    private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
        return {
            ...this.defaultHeaders,
            ...customHeaders,
        };
    }

    async get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(headers),
        });

        return this.handleResponse<T>(response);
    }

    async post<T>(
        endpoint: string,
        data?: any,
        headers?: Record<string, string>
    ): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(headers),
            body: data ? JSON.stringify(data) : undefined,
        });

        return this.handleResponse<T>(response);
    }

    async put<T>(
        endpoint: string,
        data?: any,
        headers?: Record<string, string>
    ): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(headers),
            body: data ? JSON.stringify(data) : undefined,
        });

        return this.handleResponse<T>(response);
    }

    async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(headers),
        });

        return this.handleResponse<T>(response);
    }

    setAuthToken(token: string): void {
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    removeAuthToken(): void {
        delete this.defaultHeaders['Authorization'];
    }

    async postBlob(
        endpoint: string,
        data?: any,
        headers?: Record<string, string>
    ): Promise<Blob> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(headers),
            body: data ? JSON.stringify(data) : undefined,
        });

        return this.handleBlobResponse(response);
    }
}
