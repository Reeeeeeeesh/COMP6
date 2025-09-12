import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu as MenuIcon, 
  Close, 
  ChevronRight,
  Notifications,
  HelpOutline,
  Brightness4,
  AccountCircle,
  ExitToApp
} from '@mui/icons-material';
import { NavigationHeader } from './NavigationHeader';
import { useUser, UserRole } from '../../contexts/UserContext';
import { useTenant } from '../../contexts/TenantContext';

// Sidebar navigation item interface
interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType;
  badge?: string;
  description?: string;
  allowedRoles: UserRole[];
  section: string;
}

// Persona-specific sidebar configurations
const sidebarConfigs: Record<UserRole, SidebarItem[]> = {
  analyst: [
    // Data Management Section
    {
      id: 'data-upload',
      label: 'Data Upload',
      path: '/batch?browse=1',
      icon: () => <span>📁</span>,
      section: 'Data Management',
      allowedRoles: ['analyst', 'admin'],
      description: 'Upload and process employee data files'
    },
    {
      id: 'data-library',
      label: 'Data Library',
      path: '/data-sources',
      icon: () => <span>📚</span>,
      section: 'Data Management',
      allowedRoles: ['analyst', 'admin'],
      description: 'Manage historical data sources'
    },
    {
      id: 'column-mapping',
      label: 'Column Mapping',
      path: '/batch?step=mapping',
      icon: () => <span>🔗</span>,
      section: 'Data Management',
      allowedRoles: ['analyst', 'admin'],
      description: 'Map data columns to system fields'
    },
    
    // Analysis Section
    {
      id: 'scenarios',
      label: 'Scenario Analysis',
      path: '/scenarios',
      icon: () => <span>🧪</span>,
      section: 'Analysis',
      allowedRoles: ['analyst', 'admin'],
      description: 'Run what-if scenarios and comparisons'
    },
    {
      id: 'calculator',
      label: 'Individual Calculator',
      path: '/calculator',
      icon: () => <span>🧮</span>,
      section: 'Analysis',
      allowedRoles: ['analyst', 'admin'],
      description: 'Calculate bonuses for individual employees'
    },
    
    // Plan Management Section
    {
      id: 'plan-studio',
      label: 'Plan Studio',
      path: '/admin/plan-builder',
      icon: () => <span>⚙️</span>,
      section: 'Plan Management',
      allowedRoles: ['admin'],
      description: 'Create and manage calculation plans'
    }
  ],
  
  executive: [
    // Insights Section
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      path: '/dashboard',
      icon: () => <span>📊</span>,
      section: 'Insights',
      allowedRoles: ['executive', 'admin'],
      description: 'Key performance indicators and metrics'
    },
    {
      id: 'reporting',
      label: 'Executive Reports',
      path: '/admin/executive-reporting',
      icon: () => <span>📋</span>,
      section: 'Insights',
      allowedRoles: ['executive', 'admin'],
      description: 'Generate comprehensive reports'
    },
    {
      id: 'trends',
      label: 'Performance Trends',
      path: '/dashboard?view=trends',
      icon: () => <span>📈</span>,
      section: 'Insights',
      allowedRoles: ['executive', 'admin'],
      description: 'Analyze performance over time'
    },
    
    // Export Section
    {
      id: 'exports',
      label: 'Data Exports',
      path: '/exports',
      icon: () => <span>⬇️</span>,
      section: 'Export & Share',
      allowedRoles: ['executive', 'admin'],
      description: 'Export data in various formats'
    }
  ],
  
  admin: [
    // System Management Section
    {
      id: 'revenue-banding',
      label: 'Revenue Banding',
      path: '/admin/revenue-banding',
      icon: () => <span>🎯</span>,
      section: 'System Management',
      allowedRoles: ['admin'],
      description: 'Configure revenue bands and thresholds'
    },
    {
      id: 'plan-builder',
      label: 'Plan Builder',
      path: '/admin/plan-builder',
      icon: () => <span>🛠️</span>,
      section: 'System Management',
      allowedRoles: ['admin'],
      description: 'Advanced plan creation and management'
    },
    {
      id: 'user-management',
      label: 'User Management',
      path: '/admin/users',
      icon: () => <span>👥</span>,
      section: 'System Management',
      allowedRoles: ['admin'],
      description: 'Manage users and permissions'
    },
    
    // Monitoring Section
    {
      id: 'system-health',
      label: 'System Health',
      path: '/admin/health',
      icon: () => <span>💚</span>,
      section: 'Monitoring',
      allowedRoles: ['admin'],
      description: 'System performance and health metrics'
    },
    {
      id: 'audit-trail',
      label: 'Audit Trail',
      path: '/admin/audit',
      icon: () => <span>📜</span>,
      section: 'Monitoring',
      allowedRoles: ['admin'],
      description: 'View system audit logs and changes'
    }
  ]
};

// PersonaLayout props interface
interface PersonaLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSidebar?: boolean;
  sidebarCollapsible?: boolean;
  breadcrumbs?: { label: string; path: string }[];
  actions?: React.ReactNode;
}

export const PersonaLayout: React.FC<PersonaLayoutProps> = ({
  children,
  title,
  showSidebar = true,
  sidebarCollapsible = true,
  breadcrumbs,
  actions
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, hasRole, getPersonaLabel } = useUser();
  const { currentTenant } = useTenant();
  const location = useLocation();

  // Get sidebar items for current user's role
  const sidebarItems = user ? (sidebarConfigs[user.role] || []) : [];
  
  // Filter sidebar items based on user permissions
  const allowedSidebarItems = sidebarItems.filter(item => 
    user && item.allowedRoles.includes(user.role)
  );

  // Group sidebar items by section
  const sidebarSections = allowedSidebarItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, SidebarItem[]>);

  // Check if current path is active
  const isActiveItem = (path: string) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <NavigationHeader title={title} />

      <div className="flex h-screen pt-20">
        {/* Sidebar */}
        {showSidebar && (
          <>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                onClick={toggleSidebar}
              />
            )}

            {/* Sidebar */}
            <div className={`
              fixed inset-y-0 left-0 z-50 lg:static lg:inset-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              ${sidebarCollapsed ? 'w-16' : 'w-64'}
              bg-white border-r border-gray-200 pt-20 transition-all duration-300 ease-in-out
              flex flex-col
            `}>
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                {!sidebarCollapsed && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {getPersonaLabel()}
                    </h2>
                    <p className="text-sm text-gray-500">{currentTenant?.displayName}</p>
                  </div>
                )}
                
                {sidebarCollapsible && (
                  <button
                    onClick={toggleSidebarCollapse}
                    className="p-1 rounded-md hover:bg-gray-100 lg:block hidden"
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    <ChevronRight className={`
                      w-5 h-5 text-gray-500 transition-transform duration-200
                      ${sidebarCollapsed ? 'rotate-0' : 'rotate-180'}
                    `} />
                  </button>
                )}
                
                {/* Mobile close button */}
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded-md hover:bg-gray-100 lg:hidden"
                >
                  <Close className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto py-4">
                {Object.entries(sidebarSections).map(([section, items]) => (
                  <div key={section} className="mb-6">
                    {!sidebarCollapsed && (
                      <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {section}
                      </h3>
                    )}
                    <nav className="space-y-1">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          to={item.path}
                          className={`
                            group flex items-center px-4 py-2 text-sm font-medium rounded-md mx-2
                            ${isActiveItem(item.path)
                              ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                          title={sidebarCollapsed ? `${item.label}: ${item.description}` : item.description}
                        >
                          <span className="mr-3 flex-shrink-0 text-lg">
                            <item.icon />
                          </span>
                          {!sidebarCollapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              {item.badge && (
                                <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      ))}
                    </nav>
                  </div>
                ))}
              </div>

              {/* Sidebar Footer */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-800">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto z-10">
          {/* Mobile Sidebar Toggle */}
          {showSidebar && (
            <button
              onClick={toggleSidebar}
              className="lg:hidden fixed bottom-4 right-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          )}

          {/* Page Content */}
          <div className="flex-1">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="bg-white border-b border-gray-200 px-6 py-3">
                <nav className="flex space-x-2 text-sm">
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
              </div>
            )}

            {/* Page Header */}
            {(title || actions) && (
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    {title && (
                      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    )}
                  </div>
                  {actions && (
                    <div className="flex items-center space-x-3">
                      {actions}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Main Content */}
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaLayout;
