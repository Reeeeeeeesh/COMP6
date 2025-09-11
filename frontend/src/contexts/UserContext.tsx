import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// User role types as specified in implementation plan
export type UserRole = 'analyst' | 'executive' | 'admin';

// User permissions for granular access control
export type UserPermission = 
  | 'view_dashboard'
  | 'upload_data' 
  | 'create_plans'
  | 'approve_plans'
  | 'execute_plans'
  | 'view_executive_reports'
  | 'manage_users'
  | 'configure_system'
  | 'access_revenue_banding'
  | 'view_audit_trail'
  | 'export_data'
  | 'manage_scenarios';

// User preferences for personalization
export interface UserPreferences {
  defaultLandingPage: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSaveInterval: number; // in minutes
  tablePageSize: number;
  chartDefaults: {
    type: 'bar' | 'line' | 'pie';
    colors: string[];
  };
}

// Main User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: UserPermission[];
  preferences: UserPreferences;
  tenantId: string;
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
}

// Context value interface
interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  hasPermission: (permission: UserPermission) => boolean;
  hasRole: (role: UserRole) => boolean;
  logout: () => void;
  
  // Persona helpers
  getPersonaRoutes: () => string[];
  getPersonaLabel: () => string;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  defaultLandingPage: '/',
  theme: 'system',
  notifications: true,
  autoSaveInterval: 5,
  tablePageSize: 25,
  chartDefaults: {
    type: 'bar',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  }
};

// Role-based permissions mapping
const rolePermissions: Record<UserRole, UserPermission[]> = {
  analyst: [
    'view_dashboard',
    'upload_data',
    'create_plans',
    'manage_scenarios',
    'view_audit_trail',
    'export_data'
  ],
  executive: [
    'view_dashboard',
    'view_executive_reports',
    'export_data',
    'view_audit_trail'
  ],
  admin: [
    'view_dashboard',
    'upload_data',
    'create_plans',
    'approve_plans',
    'execute_plans',
    'view_executive_reports',
    'manage_users',
    'configure_system',
    'access_revenue_banding',
    'view_audit_trail',
    'export_data',
    'manage_scenarios'
  ]
};

// Persona route mapping
const personaRoutes: Record<UserRole, string[]> = {
  analyst: ['/data-hub', '/plan-studio', '/scenarios', '/dashboard'],
  executive: ['/dashboard', '/reporting', '/summaries'],
  admin: ['/users', '/platform', '/revenue-banding', '/dashboard']
};

// Persona labels
const personaLabels: Record<UserRole, string> = {
  analyst: 'Data Analyst',
  executive: 'Executive',
  admin: 'Administrator'
};

// Create context
const UserContext = createContext<UserContextValue | null>(null);

// Context provider props
interface UserContextProviderProps {
  children: ReactNode;
}

// Context provider component
export const UserContextProvider: React.FC<UserContextProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize user context (interim mock implementation)
  useEffect(() => {
    const initializeUser = () => {
      try {
        // Check localStorage for persisted user
        const savedUser = localStorage.getItem('bonus_calculator_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUserState(parsedUser);
        } else {
          // Create default mock user for development
          // TODO: Replace with actual authentication integration
          const mockUser: User = {
            id: 'mock-user-123',
            email: 'user@company.com',
            name: 'Demo User',
            role: 'analyst', // Default role
            permissions: rolePermissions.analyst,
            preferences: { ...defaultPreferences },
            tenantId: 'default',
            createdAt: new Date(),
            lastLoginAt: new Date()
          };
          setUserState(mockUser);
          localStorage.setItem('bonus_calculator_user', JSON.stringify(mockUser));
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing user context:', err);
        setError('Failed to initialize user session');
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Set user with persistence
  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('bonus_calculator_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('bonus_calculator_user');
    }
  };

  // Update user preferences
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      preferences: { ...user.preferences, ...newPreferences }
    };
    setUser(updatedUser);
  };

  // Permission checking
  const hasPermission = (permission: UserPermission): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  // Role checking
  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  // Logout functionality
  const logout = () => {
    setUser(null);
    setError(null);
  };

  // Get persona-specific routes
  const getPersonaRoutes = (): string[] => {
    if (!user) return [];
    return personaRoutes[user.role] || [];
  };

  // Get persona label
  const getPersonaLabel = (): string => {
    if (!user) return '';
    return personaLabels[user.role] || '';
  };

  const contextValue: UserContextValue = {
    user,
    isLoading,
    error,
    setUser,
    updatePreferences,
    hasPermission,
    hasRole,
    logout,
    getPersonaRoutes,
    getPersonaLabel
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use user context
export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserContextProvider');
  }
  return context;
};

// Helper function to create user with proper permissions
export const createUserWithRole = (userData: Omit<User, 'permissions'>, role: UserRole): User => {
  return {
    ...userData,
    role,
    permissions: rolePermissions[role]
  };
};

export default UserContext;