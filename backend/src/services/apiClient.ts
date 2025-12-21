import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiKeyManager } from './apiKeyManager';

export const defaultApiKeyManager = new ApiKeyManager({
  FREESOUND_API_KEY: process.env.FREESOUND_API_KEY,
  JAMENDO_CLIENT_ID: process.env.JAMENDO_CLIENT_ID,
  NEWS_API_KEY: process.env.NEWS_API_KEY,
  IMGFLIP_USERNAME: process.env.IMGFLIP_USERNAME,
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY
});

export interface ApiClientError extends Error {
  status?: number;
  code?: string;
  metadata?: Record<string, any>;
}

export interface ApiClientConfig {
  baseURL: string;
  apiKey?: string;
  apiKeyName?: string;
  apiKeyManager?: ApiKeyManager;
  headers?: Record<string, string>;
  timeout?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private apiKeyName?: string;
  private apiKeyManager?: ApiKeyManager;

  constructor(config: ApiClientConfig) {
    this.apiKeyName = config.apiKeyName;
    this.apiKeyManager = config.apiKeyManager;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    };

    const token = config.apiKey || (config.apiKeyName ? this.apiKeyManager?.getKey(config.apiKeyName) : undefined);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    this.client = axios.create({
      baseURL: config.baseURL,
      headers,
      timeout: config.timeout || 10000
    });
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      await this.waitForBackoff();
      this.trackRequest();
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      await this.waitForBackoff();
      this.trackRequest();
      const response = await this.client.post<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async waitForBackoff() {
    if (this.apiKeyName && this.apiKeyManager) {
      await this.apiKeyManager.waitIfRateLimited(this.apiKeyName);
    }
  }

  private trackRequest(): void {
    this.requestCount++;
    this.lastRequestTime = Date.now();
    
    if (process.env.LOG_API_REQUESTS === 'true') {
      console.log(`[API Request] Count: ${this.requestCount}, Time: ${new Date().toISOString()}`);
    }
  }

  private handleError(error: any): ApiClientError {
    const wrapped: ApiClientError = new Error('API request failed');
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      wrapped.message = message;
      wrapped.status = status;
      wrapped.metadata = {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      };
      if (status === 429 && this.apiKeyName && this.apiKeyManager) {
        this.apiKeyManager.markRateLimit(this.apiKeyName);
      }
      console.error('[API Error]', { status, message, url: error.config?.url });
    } else if (error instanceof Error) {
      wrapped.message = error.message;
      console.error('[API Error] Unexpected error:', error.message);
    }
    return wrapped;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  getLastRequestTime(): number {
    return this.lastRequestTime;
  }
}
