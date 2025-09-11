import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tenant interface
export interface Tenant {
  id: string;
  name: string;
  displayName: string;
  domain?: string;
  logo?: string;
  primaryColor: string;
  isActive: boolean;
  settings: {
    features: {
      revenueBanding: boolean;
      advancedAnalytics: boolean;
      customBranding: boolean;
      apiAccess: boolean;
      bulkOperations: boolean;
    };
    limits: {
      maxUsers: number;
      maxPlans: number;
      maxUploadsPerMonth: number;
      dataRetentionDays: number;
    };
    branding: {
      companyName: string;
      logoUrl?: string;
      primaryColor: string;
      secondaryColor: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Context value interface
interface TenantContextValue {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentTenant: (tenant: Tenant) => void;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
  
  // Helpers
  hasFeature: (feature: keyof Tenant['settings']['features']) => boolean;
  isWithinLimit: (limit: keyof Tenant['settings']['limits'], currentValue: number) => boolean;
  getTenantHeader: () => string; // For X-Tenant-ID header
}

// Default tenant for development
const defaultTenant: Tenant = {
  id: 'default',
  name: 'default',
  displayName: 'Demo Organization',
  primaryColor: '#3B82F6',
  isActive: true,
  settings: {
    features: {
      revenueBanding: true,
      advancedAnalytics: true,
      customBranding: false,
      apiAccess: true,
      bulkOperations: true
    },
    limits: {
      maxUsers: 100,
      maxPlans: 50,
      maxUploadsPerMonth: 1000,
      dataRetentionDays: 365
    },
    branding: {
      companyName: 'Demo Organization',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981'
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Create context
const TenantContext = createContext<TenantContextValue | null>(null);

// Context provider props
interface TenantContextProviderProps {
  children: ReactNode;
}

// Context provider component
export const TenantContextProvider: React.FC<TenantContextProviderProps> = ({ children }) => {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize tenant context
  useEffect(() => {
    const initializeTenant = () => {
      try {
        // Check localStorage for persisted tenant
        const savedTenantId = localStorage.getItem('bonus_calculator_tenant_id');
        const savedTenants = localStorage.getItem('bonus_calculator_available_tenants');
        
        let tenants: Tenant[] = [];
        
        if (savedTenants) {
          tenants = JSON.parse(savedTenants);
        } else {
          // Initialize with default tenant for development
          tenants = [defaultTenant];
          localStorage.setItem('bonus_calculator_available_tenants', JSON.stringify(tenants));
        }
        
        setAvailableTenants(tenants);
        
        // Set current tenant
        let currentTenant = tenants.find(t => t.id === savedTenantId);
        if (!currentTenant && tenants.length > 0) {
          currentTenant = tenants[0]; // Default to first available tenant
        }
        
        if (currentTenant) {
          setCurrentTenantState(currentTenant);
          localStorage.setItem('bonus_calculator_tenant_id', currentTenant.id);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing tenant context:', err);
        setError('Failed to initialize tenant configuration');
        // Fallback to default tenant
        setCurrentTenantState(defaultTenant);
        setAvailableTenants([defaultTenant]);
        setIsLoading(false);
      }
    };

    initializeTenant();
  }, []);

  // Set current tenant with persistence
  const setCurrentTenant = (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    localStorage.setItem('bonus_calculator_tenant_id', tenant.id);
    setError(null);
  };

  // Switch tenant with validation
  const switchTenant = async (tenantId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tenant = availableTenants.find(t => t.id === tenantId);
      if (!tenant) {
        throw new Error(`Tenant with ID ${tenantId} not found`);
      }
      
      if (!tenant.isActive) {
        throw new Error('Selected tenant is not active');
      }
      
      // In a real application, you might validate tenant access here
      // await validateTenantAccess(tenantId);
      
      setCurrentTenant(tenant);
      
      // Notify the application that tenant has changed
      window.dispatchEvent(new CustomEvent('tenant-changed', { 
        detail: { tenant } 
      }));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch tenant';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh available tenants
  const refreshTenants = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real application, this would fetch from API
      // const response = await fetch('/api/v1/tenants');
      // const tenants = await response.json();
      
      // For now, keep existing tenants
      const savedTenants = localStorage.getItem('bonus_calculator_available_tenants');
      if (savedTenants) {
        const tenants = JSON.parse(savedTenants);
        setAvailableTenants(tenants);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh tenants';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Feature checking
  const hasFeature = (feature: keyof Tenant['settings']['features']): boolean => {
    if (!currentTenant) return false;
    return currentTenant.settings.features[feature];
  };

  // Limit checking
  const isWithinLimit = (limit: keyof Tenant['settings']['limits'], currentValue: number): boolean => {
    if (!currentTenant) return false;
    return currentValue < currentTenant.settings.limits[limit];
  };

  // Get tenant header for API calls
  const getTenantHeader = (): string => {
    return currentTenant?.id || 'default';
  };

  const contextValue: TenantContextValue = {
    currentTenant,
    availableTenants,
    isLoading,
    error,
    setCurrentTenant,
    switchTenant,
    refreshTenants,
    hasFeature,
    isWithinLimit,
    getTenantHeader
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

// Custom hook to use tenant context
export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantContextProvider');
  }
  return context;
};

// Helper function to create tenant
export const createTenant = (tenantData: Omit<Tenant, 'createdAt' | 'updatedAt'>): Tenant => {
  return {
    ...tenantData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Helper function to add tenant to available list
export const addTenantToAvailableList = (tenant: Tenant) => {
  const savedTenants = localStorage.getItem('bonus_calculator_available_tenants');
  let tenants: Tenant[] = [];
  
  if (savedTenants) {
    tenants = JSON.parse(savedTenants);
  }
  
  // Check if tenant already exists
  const existingIndex = tenants.findIndex(t => t.id === tenant.id);
  if (existingIndex >= 0) {
    tenants[existingIndex] = tenant; // Update existing
  } else {
    tenants.push(tenant); // Add new
  }
  
  localStorage.setItem('bonus_calculator_available_tenants', JSON.stringify(tenants));
  
  // Refresh the context
  window.dispatchEvent(new CustomEvent('tenants-updated'));
};

export default TenantContext;