import { useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { apiClient, initializeTenantId } from '../services/apiClient';

/**
 * Hook that synchronizes API client with tenant context
 * This ensures X-Tenant-ID header is automatically updated when tenant changes
 */
export const useApi = () => {
  const { currentTenant, getTenantHeader } = useTenant();

  // Synchronize API client tenant ID with context
  useEffect(() => {
    if (currentTenant) {
      const tenantId = getTenantHeader();
      initializeTenantId(tenantId);
    }
  }, [currentTenant, getTenantHeader]);

  // Listen for tenant changes and update API client
  useEffect(() => {
    const handleTenantChange = (event: CustomEvent) => {
      const { tenant } = event.detail;
      if (tenant?.id) {
        initializeTenantId(tenant.id);
      }
    };

    window.addEventListener('tenant-changed', handleTenantChange as EventListener);
    
    return () => {
      window.removeEventListener('tenant-changed', handleTenantChange as EventListener);
    };
  }, []);

  return {
    apiClient,
    currentTenant,
    tenantId: currentTenant?.id || 'default'
  };
};

export default useApi;