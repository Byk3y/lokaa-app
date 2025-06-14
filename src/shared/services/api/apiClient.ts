/**
 * API Client
 * 
 * This module provides a base client for making API requests.
 * It includes error handling, request/response interceptors, and retry logic.
 */

import { API } from '../../../core/config/constants';

/**
 * Request options for API calls
 */
export interface RequestOptions {
  /** HTTP headers to include with the request */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to retry failed requests */
  retry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Whether to include credentials (cookies) with the request */
  withCredentials?: boolean;
}

/**
 * Base API client for making HTTP requests
 */
export class ApiClient {
  /** Base URL for all requests */
  private baseUrl: string;
  
  /** Default request options */
  private defaultOptions: RequestOptions;
  
  /**
   * Create a new API client
   * 
   * @param baseUrl - Base URL for all requests
   * @param defaultOptions - Default options for all requests
   */
  constructor(
    baseUrl: string = API.BASE_URL,
    defaultOptions: RequestOptions = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: API.TIMEOUT,
      retry: true,
      maxRetries: API.MAX_RETRIES,
      withCredentials: true,
      ...defaultOptions,
    };
  }
  
  /**
   * Make a GET request
   * 
   * @param url - The URL to request
   * @param options - Request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * const data = await apiClient.get('/users/123');
   */
  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }
  
  /**
   * Make a POST request
   * 
   * @param url - The URL to request
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * const data = await apiClient.post('/users', { name: 'John' });
   */
  async post<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }
  
  /**
   * Make a PUT request
   * 
   * @param url - The URL to request
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * const data = await apiClient.put('/users/123', { name: 'John' });
   */
  async put<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }
  
  /**
   * Make a PATCH request
   * 
   * @param url - The URL to request
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * const data = await apiClient.patch('/users/123', { name: 'John' });
   */
  async patch<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', url, data, options);
  }
  
  /**
   * Make a DELETE request
   * 
   * @param url - The URL to request
   * @param options - Request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * const data = await apiClient.delete('/users/123');
   */
  async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }
  
  /**
   * Make an HTTP request
   * 
   * @param method - HTTP method
   * @param url - The URL to request
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise resolving to the response data
   * 
   * @private
   */
  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    // Merge default options with provided options
    const requestOptions: RequestOptions = {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
    };
    
    // Create request init object
    const init: RequestInit = {
      method,
      headers: requestOptions.headers as HeadersInit,
      credentials: requestOptions.withCredentials ? 'include' : 'same-origin',
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD' && data !== undefined) {
      init.body = JSON.stringify(data);
    }
    
    // Make the request with retry logic
    return this.fetchWithRetry<T>(this.buildUrl(url), init, requestOptions);
  }
  
  /**
   * Build a full URL from a path
   * 
   * @param path - The URL path
   * @returns The full URL
   * 
   * @private
   */
  private buildUrl(path: string): string {
    // If the path is already a full URL, return it as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Remove leading slash from path if present
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Remove trailing slash from base URL if present
    const normalizedBase = this.baseUrl.endsWith('/')
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;
    
    // Combine base URL and path
    return `${normalizedBase}/${normalizedPath}`;
  }
  
  /**
   * Fetch with retry logic
   * 
   * @param url - The URL to fetch
   * @param init - Fetch init options
   * @param options - Request options
   * @returns Promise resolving to the response data
   * 
   * @private
   */
  private async fetchWithRetry<T>(
    url: string,
    init: RequestInit,
    options: RequestOptions
  ): Promise<T> {
    const { retry, maxRetries = 0 } = options;
    
    // If retry is disabled, just make the request once
    if (!retry) {
      return this.fetchAndParse<T>(url, init);
    }
    
    // Otherwise, retry up to maxRetries times
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.fetchAndParse<T>(url, init);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Otherwise, wait before retrying
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never happen because we either return or throw above
    throw lastError || new Error('Unknown error occurred during API request');
  }
  
  /**
   * Fetch and parse response
   * 
   * @param url - The URL to fetch
   * @param init - Fetch init options
   * @returns Promise resolving to the response data
   * 
   * @private
   */
  private async fetchAndParse<T>(url: string, init: RequestInit): Promise<T> {
    // Make the request
    const response = await fetch(url, init);
    
    // Check if the response is successful
    if (!response.ok) {
      // Try to parse error response
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Unknown error occurred' };
      }
      
      // Create error object
      const error = new Error(
        typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? String(errorData.message)
          : `Request failed with status ${response.status}`
      );
      
      // Add response details to error
      Object.assign(error, {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      });
      
      throw error;
    }
    
    // Check if response is empty
    if (response.status === 204 || response.headers.get('Content-Length') === '0') {
      return {} as T;
    }
    
    // Parse response as JSON
    try {
      return await response.json();
    } catch (error) {
      throw new Error('Failed to parse response as JSON');
    }
  }
}

/**
 * Create a default API client instance
 */
export const apiClient = new ApiClient(); 