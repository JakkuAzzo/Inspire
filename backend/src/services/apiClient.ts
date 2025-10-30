import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: ApiClientConfig) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    this.client = axios.create({
      baseURL: config.baseURL,
      headers,
      timeout: config.timeout || 10000
    });
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      this.trackRequest();
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      this.trackRequest();
      const response = await this.client.post<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private trackRequest(): void {
    this.requestCount++;
    this.lastRequestTime = Date.now();
    
    if (process.env.LOG_API_REQUESTS === 'true') {
      console.log(`[API Request] Count: ${this.requestCount}, Time: ${new Date().toISOString()}`);
    }
  }

  private handleError(error: any): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      if (status === 429) {
        console.error('[API Error] Rate limit exceeded:', message);
      } else if (status === 401 || status === 403) {
        console.error('[API Error] Authentication failed:', message);
      } else {
        console.error('[API Error]', status, message);
      }
    } else {
      console.error('[API Error] Unexpected error:', error);
    }
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  getLastRequestTime(): number {
    return this.lastRequestTime;
  }
}
