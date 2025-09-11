import React, { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  Warning, 
  Home, 
  ContactSupport,
  ArrowBack 
} from '@mui/icons-material';
import { useUser, UserRole, UserPermission } from '../../contexts/UserContext';
import { useTenant } from '../../contexts/TenantContext';

// Permission check types
type PermissionCheck = {
  type: 'role' | 'permission' | 'feature' | 'custom';
  roles?: UserRole[];
  permissions?: UserPermission[];
  features?: string[];
  customCheck?: (user: any, tenant: any) => boolean;
};

// Fallback behavior options
type FallbackBehavior = 'redirect' | 'hide' | 'disable' | 'show-message';

// RoleGuard props interface
interface RoleGuardProps {
  children: ReactNode;
  
  // Permission requirements
  require: PermissionCheck;
  
  // Fallback behavior when access is denied
  fallback?: FallbackBehavior;
  
  // Redirect path for 'redirect' fallback
  redirectTo?: string;
  
  // Custom fallback component
  fallbackComponent?: ReactNode;
  
  // Custom error message
  errorMessage?: string;
  
  // Show loading state while checking permissions
  showLoading?: boolean;
  
  // Strict mode - fail if user context is not loaded
  strict?: boolean;
  
  // Element to render when access is denied (for 'show-message' fallback)
  as?: 'div' | 'span' | 'section';
}

// Default error messages
const getDefaultErrorMessage = (type: PermissionCheck['type'], context: any = {}) => {
  switch (type) {
    case 'role':
      return `Access denied. This feature requires one of the following roles: ${context.roles?.join(', ') || 'specific role'}.`;
    case 'permission':
      return `Access denied. You don't have the required permissions to view this content.`;
    case 'feature':
      return `Feature not available. This feature is not enabled for your organization.`;
    case 'custom':
      return `Access denied. You don't meet the requirements to access this content.`;
    default:
      return 'Access denied. You don\'t have permission to view this content.';
  }
};

// Access denied component
const AccessDeniedMessage: React.FC<{
  message: string;
  type: PermissionCheck['type'];
  context?: any;
  as?: 'div' | 'span' | 'section';
  showActions?: boolean;
}> = ({ message, type, context, as: Element = 'div', showActions = true }) => {
  const location = useLocation();

  const getIcon = () => {
    switch (type) {
      case 'role':
      case 'permission':
        return <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />;
      case 'feature':
        return <Warning className="w-12 h-12 text-yellow-500 mx-auto mb-4" />;
      default:
        return <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />;
    }
  };

  const getSeverityColor = () => {
    switch (type) {
      case 'role':
      case 'permission':
        return 'border-red-200 bg-red-50';
      case 'feature':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Element className={`rounded-lg border p-6 text-center ${getSeverityColor()}`}>
      {getIcon()}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      
      {showActions && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ArrowBack className="w-4 h-4 mr-2" />
            Go Back
          </button>
          
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Link>
          
          <Link
            to="/user-guide"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <ContactSupport className="w-4 h-4 mr-2" />
            Get Help
          </Link>
        </div>
      )}
      
      {/* Debug info in development */}
      {import.meta.env.DEV && context && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Debug Info (Development)
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({ type, context, path: location.pathname }, null, 2)}
          </pre>
        </details>
      )}
    </Element>
  );
};

// Loading component
const LoadingPermissions: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Checking permissions...</span>
  </div>
);

// Main RoleGuard component
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  require,
  fallback = 'show-message',
  redirectTo = '/',
  fallbackComponent,
  errorMessage,
  showLoading = true,
  strict = false,
  as = 'div'
}) => {
  const { user, hasRole, hasPermission, isLoading } = useUser();
  const { currentTenant, hasFeature } = useTenant();

  // Show loading if user context is still loading
  if (isLoading && showLoading) {
    return <LoadingPermissions />;
  }

  // Strict mode: fail if user is not loaded
  if (strict && !user) {
    const message = 'Authentication required. Please log in to access this content.';
    
    if (fallback === 'redirect') {
      return <Navigate to="/login" replace />;
    }
    
    return <AccessDeniedMessage 
      message={message}
      type="permission"
      as={as}
      showActions={fallback === 'show-message'}
    />;
  }

  // Check permissions based on requirement type
  let hasAccess = false;
  let checkContext: any = {};

  switch (require.type) {
    case 'role':
      checkContext = { roles: require.roles };
      hasAccess = require.roles ? require.roles.some(role => hasRole(role)) : false;
      break;
      
    case 'permission':
      checkContext = { permissions: require.permissions };
      hasAccess = require.permissions ? require.permissions.some(permission => hasPermission(permission)) : false;
      break;
      
    case 'feature':
      checkContext = { features: require.features };
      hasAccess = require.features ? require.features.every(feature => hasFeature(feature)) : false;
      break;
      
    case 'custom':
      checkContext = { customCheck: true };
      hasAccess = require.customCheck ? require.customCheck(user, currentTenant) : false;
      break;
      
    default:
      hasAccess = false;
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle access denied based on fallback behavior
  const message = errorMessage || getDefaultErrorMessage(require.type, checkContext);

  switch (fallback) {
    case 'redirect':
      return <Navigate to={redirectTo} replace />;
      
    case 'hide':
      return null;
      
    case 'disable':
      // Wrap children in a disabled container
      return (
        <div 
          className="opacity-50 pointer-events-none cursor-not-allowed"
          title={message}
        >
          {children}
        </div>
      );
      
    case 'show-message':
      return fallbackComponent || (
        <AccessDeniedMessage 
          message={message}
          type={require.type}
          context={checkContext}
          as={as}
        />
      );
      
    default:
      return <AccessDeniedMessage 
        message={message}
        type={require.type}
        context={checkContext}
        as={as}
      />;
  }
};

// Convenience components for common use cases
export const RequireRole: React.FC<{
  roles: UserRole[];
  children: ReactNode;
  fallback?: FallbackBehavior;
  redirectTo?: string;
}> = ({ roles, children, fallback, redirectTo }) => (
  <RoleGuard
    require={{ type: 'role', roles }}
    fallback={fallback}
    redirectTo={redirectTo}
  >
    {children}
  </RoleGuard>
);

export const RequirePermission: React.FC<{
  permissions: UserPermission[];
  children: ReactNode;
  fallback?: FallbackBehavior;
  redirectTo?: string;
}> = ({ permissions, children, fallback, redirectTo }) => (
  <RoleGuard
    require={{ type: 'permission', permissions }}
    fallback={fallback}
    redirectTo={redirectTo}
  >
    {children}
  </RoleGuard>
);

export const RequireFeature: React.FC<{
  features: string[];
  children: ReactNode;
  fallback?: FallbackBehavior;
}> = ({ features, children, fallback }) => (
  <RoleGuard
    require={{ type: 'feature', features }}
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

// Higher-order component version
export const withRoleGuard = <P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RoleGuardProps, 'children'>
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <RoleGuard {...guardProps}>
      <Component {...props} ref={ref} />
    </RoleGuard>
  ));
};

export default RoleGuard;