import { useMemo } from 'react';
import { useUser, UserRole } from '../contexts/UserContext';
import { useTenant } from '../contexts/TenantContext';

// Persona configuration interface
export interface PersonaConfig {
  role: UserRole;
  label: string;
  description: string;
  color: string;
  primaryRoutes: string[];
  quickActions: {
    label: string;
    path: string;
    icon: string;
  }[];
  capabilities: string[];
  restrictions: string[];
}

// Persona configurations
const personaConfigs: Record<UserRole, PersonaConfig> = {
  analyst: {
    role: 'analyst',
    label: 'Data Analyst',
    description: 'Design calculation plans, process data, and run complex analysis scenarios.',
    color: 'blue',
    primaryRoutes: ['/batch', '/scenarios', '/calculator', '/admin/plan-builder'],
    quickActions: [
      { label: 'Upload Data', path: '/batch?browse=1', icon: '📁' },
      { label: 'Run Scenarios', path: '/scenarios', icon: '🧪' },
      { label: 'Build Plans', path: '/admin/plan-builder', icon: '⚙️' }
    ],
    capabilities: [
      'Data upload and processing',
      'Plan creation and validation',
      'Scenario modeling and analysis',
      'Individual calculations',
      'Data quality monitoring'
    ],
    restrictions: [
      'Cannot manage users',
      'Cannot configure system settings',
      'Limited executive reporting access'
    ]
  },
  
  executive: {
    role: 'executive',
    label: 'Executive',
    description: 'View business insights, generate reports, and track performance metrics.',
    color: 'purple',
    primaryRoutes: ['/dashboard', '/admin/executive-reporting', '/exports'],
    quickActions: [
      { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
      { label: 'Generate Reports', path: '/admin/executive-reporting', icon: '📋' },
      { label: 'Export Data', path: '/exports', icon: '⬇️' }
    ],
    capabilities: [
      'Executive dashboards',
      'Business intelligence reports',
      'Performance metrics',
      'Trend analysis',
      'Data exports'
    ],
    restrictions: [
      'Cannot upload raw data',
      'Cannot create calculation plans',
      'Cannot manage system configuration'
    ]
  },
  
  admin: {
    role: 'admin',
    label: 'Administrator',
    description: 'Manage platform configuration, users, and access all system capabilities.',
    color: 'green',
    primaryRoutes: ['/admin/revenue-banding', '/admin/plan-builder', '/admin/users', '/admin/health'],
    quickActions: [
      { label: 'Configure System', path: '/admin/revenue-banding', icon: '🎯' },
      { label: 'Manage Users', path: '/admin/users', icon: '👥' },
      { label: 'Build Plans', path: '/admin/plan-builder', icon: '🛠️' }
    ],
    capabilities: [
      'Full system access',
      'User and permission management',
      'System configuration',
      'Platform monitoring',
      'All data operations',
      'Advanced reporting'
    ],
    restrictions: []
  }
};

// Hook for accessing persona-specific functionality
export const usePersona = () => {
  const { user, hasRole, hasPermission } = useUser();
  const { currentTenant, hasFeature } = useTenant();

  // Get current persona configuration
  const currentPersona = useMemo(() => {
    return user ? personaConfigs[user.role] : null;
  }, [user?.role]);

  // Get available personas (for admin users who can switch roles)
  const availablePersonas = useMemo(() => {
    if (!user) return [];
    
    // Admin users can access all personas
    if (user.role === 'admin') {
      return Object.values(personaConfigs);
    }
    
    // Other users only see their own persona
    return currentPersona ? [currentPersona] : [];
  }, [user?.role, currentPersona]);

  // Check if user can access a specific persona
  const canAccessPersona = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  };

  // Get persona-specific navigation items
  const getPersonaNavigation = (role?: UserRole) => {
    const targetRole = role || user?.role;
    if (!targetRole) return [];
    
    const config = personaConfigs[targetRole];
    return config?.primaryRoutes.map(route => ({
      path: route,
      label: route.split('/').pop()?.replace('-', ' ') || route,
      accessible: canAccessRoute(route)
    })) || [];
  };

  // Check if user can access a specific route
  const canAccessRoute = (route: string): boolean => {
    if (!user) return false;
    
    // Route-specific permission checks
    const routePermissions: Record<string, { roles?: UserRole[]; features?: string[] }> = {
      '/batch': { roles: ['analyst', 'admin'] },
      '/scenarios': { roles: ['analyst', 'admin'] },
      '/calculator': { roles: ['analyst', 'admin'] },
      '/admin/plan-builder': { roles: ['admin'] },
      '/admin/executive-reporting': { roles: ['executive', 'admin'] },
      '/admin/revenue-banding': { roles: ['admin'] },
      '/admin/users': { roles: ['admin'] },
      '/exports': { roles: ['executive', 'admin'] }
    };
    
    const routeConfig = routePermissions[route];
    if (!routeConfig) return true; // Allow access to unspecified routes
    
    // Check role requirements
    if (routeConfig.roles && !routeConfig.roles.includes(user.role)) {
      return false;
    }
    
    // Check feature requirements
    if (routeConfig.features && !routeConfig.features.every(feature => hasFeature(feature))) {
      return false;
    }
    
    return true;
  };

  // Get persona-specific quick actions
  const getQuickActions = (role?: UserRole) => {
    const targetRole = role || user?.role;
    if (!targetRole) return [];
    
    const config = personaConfigs[targetRole];
    return config?.quickActions.filter(action => canAccessRoute(action.path)) || [];
  };

  // Get persona capabilities with tenant feature filtering
  const getPersonaCapabilities = (role?: UserRole) => {
    const targetRole = role || user?.role;
    if (!targetRole) return [];
    
    const config = personaConfigs[targetRole];
    if (!config) return [];
    
    // Filter capabilities based on tenant features
    return config.capabilities.filter(capability => {
      // Add tenant feature checks here if needed
      return true; // For now, return all capabilities
    });
  };

  // Get workspace statistics for current persona
  const getWorkspaceStats = () => {
    if (!user || !currentPersona) return null;
    
    // Mock stats - in real app, these would come from API
    const mockStats = {
      analyst: {
        'Data Uploads': { count: 12, trend: 'up' },
        'Plans Created': { count: 3, trend: 'stable' },
        'Scenarios Run': { count: 25, trend: 'up' }
      },
      executive: {
        'Reports Generated': { count: 5, trend: 'up' },
        'Dashboard Views': { count: 48, trend: 'up' },
        'Exports Created': { count: 8, trend: 'stable' }
      },
      admin: {
        'System Changes': { count: 2, trend: 'stable' },
        'Users Managed': { count: 15, trend: 'up' },
        'Configurations': { count: 7, trend: 'down' }
      }
    };
    
    return mockStats[user.role] || {};
  };

  // Switch to a different persona (for admin users)
  const switchPersona = (role: UserRole) => {
    if (!canAccessPersona(role)) {
      console.warn(`Cannot switch to persona: ${role}`);
      return false;
    }
    
    // In a real app, this might update user context or redirect
    // For now, we'll dispatch a custom event
    window.dispatchEvent(new CustomEvent('persona-switch', {
      detail: { from: user?.role, to: role }
    }));
    
    return true;
  };

  // Get personalized landing page
  const getPersonaLandingPage = () => {
    if (!user || !currentPersona) return '/';
    
    // Use user preferences if available
    if (user.preferences.defaultLandingPage) {
      return user.preferences.defaultLandingPage;
    }
    
    // Default landing pages per persona
    const defaultLandings: Record<UserRole, string> = {
      analyst: '/dashboard',
      executive: '/dashboard',
      admin: '/dashboard'
    };
    
    return defaultLandings[user.role] || '/';
  };

  return {
    // Current persona info
    currentPersona,
    availablePersonas,
    
    // Permission checks
    canAccessPersona,
    canAccessRoute,
    
    // Navigation helpers
    getPersonaNavigation,
    getQuickActions,
    getPersonaCapabilities,
    
    // Workspace data
    getWorkspaceStats,
    
    // Actions
    switchPersona,
    getPersonaLandingPage,
    
    // Context data
    user,
    tenant: currentTenant,
    
    // Utilities
    hasRole,
    hasPermission,
    hasFeature
  };
};

export default usePersona;
