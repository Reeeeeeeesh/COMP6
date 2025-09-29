import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL } from '../config';

// API client interface for better typing
export interface ApiClient extends AxiosInstance {
  getTenantId: () => string;
  setTenantId: (tenantId: string) => void;
}

// Global tenant ID state
let currentTenantId: string = 'default';

// Create axios instance with base configuration
const createApiClient = (): ApiClient => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  }) as ApiClient;

  // Request interceptor to add tenant header
  instance.interceptors.request.use(
    (config: AxiosRequestConfig) => {
      // Add tenant ID header to all requests
      config.headers = {
        ...config.headers,
        'X-Tenant-ID': currentTenantId,
      };

      // Add development authentication token if available
      if (import.meta.env.DEV) {
        const devToken = (import.meta as any).env?.VITE_DEV_AUTH_TOKEN;
        if (devToken) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${devToken}`,
          };
        }
      }

      // Add request timestamp for debugging
      config.metadata = {
        ...config.metadata,
        requestStartTime: Date.now(),
      };

      // Log API calls in development
      if (import.meta.env.DEV) {
        console.log(`🔥 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          tenant: currentTenantId,
          headers: config.headers,
          data: config.data
        });
      }

      return config;
    },
    (error: AxiosError) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging and error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Calculate request duration
      const duration = Date.now() - (response.config.metadata?.requestStartTime || Date.now());
      
      // Log successful responses in development
      if (import.meta.env.DEV) {
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          duration: `${duration}ms`,
          tenant: currentTenantId,
          data: response.data
        });
      }

      return response;
    },
    (error: AxiosError) => {
      // Calculate request duration even for errors
      const duration = Date.now() - (error.config?.metadata?.requestStartTime || Date.now());

      // Enhanced error logging
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        duration: `${duration}ms`,
        tenant: currentTenantId,
        message: error.message,
        response: error.response?.data
      });

      // Handle specific HTTP status codes
      if (error.response?.status === 401) {
        // Handle unauthorized access
        console.warn('🚫 Unauthorized access - consider redirecting to login');
        // In a real app, you might dispatch a logout action here
        // store.dispatch(logout());
      } else if (error.response?.status === 403) {
        // Handle forbidden access
        console.warn('🚫 Access forbidden - user lacks permission');
        // You might want to show a permission denied message
      } else if (error.response?.status === 404) {
        // Handle not found
        console.warn('🔍 Resource not found');
      } else if (error.response?.status >= 500) {
        // Handle server errors
        console.error('🔥 Server error - consider showing user-friendly message');
      }

      return Promise.reject(error);
    }
  );

  // Add helper methods to the instance
  instance.getTenantId = () => currentTenantId;
  instance.setTenantId = (tenantId: string) => {
    currentTenantId = tenantId;
    console.log(`🏢 Tenant switched to: ${tenantId}`);
  };

  return instance;
};

// Create the main API client instance
export const apiClient: ApiClient = createApiClient();

// Helper function to initialize tenant ID from context
export const initializeTenantId = (tenantId: string) => {
  currentTenantId = tenantId;
  apiClient.setTenantId(tenantId);
};

// Helper function to get current tenant ID
export const getCurrentTenantId = () => currentTenantId;

// Type-safe API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    tenant: string;
    requestId?: string;
  };
}

// Helper function to handle API responses consistently
export const handleApiResponse = <T>(response: AxiosResponse): ApiResponse<T> => {
  return {
    success: true,
    data: response.data,
    metadata: {
      timestamp: new Date().toISOString(),
      tenant: currentTenantId,
    }
  };
};

// Helper function to handle API errors consistently
export const handleApiError = (error: AxiosError): ApiResponse => {
  return {
    success: false,
    error: error.response?.data?.message || error.message || 'An unexpected error occurred',
    metadata: {
      timestamp: new Date().toISOString(),
      tenant: currentTenantId,
    }
  };
};

// Pre-configured request methods with better typing
export const apiRequest = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.get(url, config)
      .then(handleApiResponse)
      .catch(handleApiError),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.post(url, data, config)
      .then(handleApiResponse)
      .catch(handleApiError),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.put(url, data, config)
      .then(handleApiResponse)
      .catch(handleApiError),

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.delete(url, config)
      .then(handleApiResponse)
      .catch(handleApiError),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data, config)
      .then(handleApiResponse)
      .catch(handleApiError),
};

// Default export
export default apiClient;
