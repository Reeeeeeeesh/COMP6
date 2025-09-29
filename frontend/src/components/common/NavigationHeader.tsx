import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  Calculate, 
  PlayArrow, 
  Settings, 
  Assessment,
  Dashboard,
  DataUsage,
  Build,
  Report,
  People,
  Storage,
  Business,
  BarChart,
  WorkOutline,
  FileCopy,
  Share,
  Add,
  Assignment,
  Approval,
  TrendingUp
} from '@mui/icons-material';
import { useUser, UserRole } from '../../contexts/UserContext';
import { useTenant } from '../../contexts/TenantContext';

interface NavigationHeaderProps {
  title?: string;
  showBackToHome?: boolean;
  showPersonaTabs?: boolean;
}

// Navigation item interface
interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType;
  allowedRoles: UserRole[];
  quickAction?: boolean;
  description?: string;
}

// Persona-based navigation items
const navigationItems: NavigationItem[] = [
  // Core items available to all roles
  { path: '/', label: 'Home', icon: Home, allowedRoles: ['analyst', 'executive', 'admin'] },
  { path: '/personas', label: 'Personas', icon: People, allowedRoles: ['admin'], description: 'Switch between different role views' },
  { path: '/dashboard', label: 'Dashboard', icon: Dashboard, allowedRoles: ['analyst', 'executive', 'admin'] },
  
  // Analyst persona items
  { path: '/batch', label: 'Data Hub', icon: Upload, allowedRoles: ['analyst', 'admin'], description: 'Upload and process data files' },
  { path: '/plans', label: 'Plan Studio', icon: WorkOutline, allowedRoles: ['analyst', 'admin'], description: 'Create and manage compensation plans' },
  { path: '/approvals', label: 'Approvals', icon: Assignment, allowedRoles: ['analyst', 'executive', 'admin'], description: 'Review and approve compensation plans' },
  { path: '/calculator', label: 'Calculator', icon: Calculate, allowedRoles: ['analyst', 'admin'], description: 'Individual calculations' },
  { path: '/scenarios', label: 'Scenarios', icon: PlayArrow, allowedRoles: ['analyst', 'admin'], description: 'What-if analysis' },
  
  // Executive persona items
  { path: '/admin/executive-reporting', label: 'Reports', icon: Assessment, allowedRoles: ['executive', 'admin'], description: 'Executive reporting and insights' },
  
  // Admin persona items
  { path: '/plans/templates', label: 'Plan Templates', icon: FileCopy, allowedRoles: ['admin'], description: 'Manage plan templates' },
  { path: '/plans/shared', label: 'Shared Plans', icon: Share, allowedRoles: ['admin'], description: 'View shared compensation plans' },
  { path: '/admin/revenue-banding', label: 'Revenue Banding', icon: BarChart, allowedRoles: ['admin'], description: 'Configure revenue bands and settings' },
  { path: '/admin/team-raf', label: 'Team RAF Console', icon: TrendingUp, allowedRoles: ['admin'], description: 'Configure team Revenue Adjustment Factors' },
];

// Quick action items per persona
const quickActions: Record<UserRole, NavigationItem[]> = {
  analyst: [
    { path: '/batch?browse=1', label: 'Upload Data', icon: Upload, allowedRoles: ['analyst', 'admin'], quickAction: true },
    { path: '/plans/create', label: 'Create Plan', icon: Add, allowedRoles: ['analyst', 'admin'], quickAction: true },
    { path: '/approvals', label: 'My Approvals', icon: Assignment, allowedRoles: ['analyst', 'executive', 'admin'], quickAction: true },
    { path: '/scenarios', label: 'New Scenario', icon: PlayArrow, allowedRoles: ['analyst', 'admin'], quickAction: true },
  ],
  executive: [
    { path: '/approvals', label: 'Pending Approvals', icon: Assignment, allowedRoles: ['analyst', 'executive', 'admin'], quickAction: true },
    { path: '/admin/executive-reporting', label: 'Generate Report', icon: Report, allowedRoles: ['executive', 'admin'], quickAction: true },
    { path: '/dashboard', label: 'View Metrics', icon: BarChart, allowedRoles: ['executive', 'admin'], quickAction: true },
  ],
  admin: [
    { path: '/plans/create', label: 'New Plan', icon: Add, allowedRoles: ['admin'], quickAction: true },
    { path: '/approvals', label: 'All Approvals', icon: Assignment, allowedRoles: ['admin'], quickAction: true },
    { path: '/plans/templates', label: 'Manage Templates', icon: FileCopy, allowedRoles: ['admin'], quickAction: true },
    { path: '/admin/revenue-banding', label: 'Configure', icon: Settings, allowedRoles: ['admin'], quickAction: true },
    { path: '/admin/team-raf', label: 'Team RAF', icon: TrendingUp, allowedRoles: ['admin'], quickAction: true },
    { path: '/batch?browse=1', label: 'Bulk Upload', icon: Storage, allowedRoles: ['admin'], quickAction: true },
  ]
};

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  showBackToHome = true,
  showPersonaTabs = true
}) => {
  const location = useLocation();
  const { user, hasRole, getPersonaLabel } = useUser();
  const { currentTenant, switchTenant, availableTenants } = useTenant();

  // Filter navigation items based on user role
  const allowedNavigationItems = navigationItems.filter(item => 
    user && item.allowedRoles.includes(user.role)
  );

  // Get quick actions for current user role
  const currentQuickActions = user ? (quickActions[user.role] || []) : [];

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const navItem = navigationItems.find(item => item.path === currentPath);
      if (navItem) {
        breadcrumbs.push({ label: navItem.label, path: currentPath });
      } else {
        // Fallback for dynamic routes
        breadcrumbs.push({ 
          label: segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '), 
          path: currentPath 
        });
      }
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (!user) {
    return (
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section - User Info and Tenant Selector */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-800">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{getPersonaLabel()}</p>
              </div>
            </div>
          </div>

          {/* Tenant Selector */}
          {availableTenants.length > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Tenant:</span>
              <select
                className="text-sm border border-gray-300 rounded px-2 py-1"
                value={currentTenant?.id || ''}
                onChange={(e) => switchTenant(e.target.value)}
              >
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main Navigation Section */}
        <div className="flex justify-between items-center py-4">
          {/* Title and Breadcrumbs Section */}
          <div className="flex flex-col space-y-2">
            {/* Breadcrumbs */}
            <nav className="flex space-x-1 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <span className="text-gray-400">/</span>}
                  <Link
                    to={crumb.path}
                    className={`hover:text-blue-600 transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
            
            {/* Page Title */}
            {title && (
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            {allowedNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                               (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors group relative ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title={item.description}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                  {item.description && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {item.description}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Actions Bar - Only show on dashboard or home */}
        {(location.pathname === '/' || location.pathname === '/dashboard') && currentQuickActions.length > 0 && (
          <div className="py-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
              <div className="flex space-x-2">
                {currentQuickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.path}
                      to={action.path}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 
