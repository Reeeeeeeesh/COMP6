import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Upload, Calculate, PlayArrow, Settings } from '@mui/icons-material';

interface NavigationHeaderProps {
  title?: string;
  showBackToHome?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  showBackToHome = true
}) => {
  const location = useLocation();

  const navigationItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/batch', label: 'Batch Upload', icon: Upload },
    { path: '/calculator', label: 'Calculator', icon: Calculate },
    { path: '/scenarios', label: 'Scenarios', icon: PlayArrow },
    { path: '/admin/revenue-banding', label: 'Admin', icon: Settings },
  ];

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Title Section */}
          <div className="flex items-center space-x-4">
            {showBackToHome && (
              <Link 
                to="/"
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Back to Home"
              >
                <Home className="w-6 h-6" />
              </Link>
            )}
            {title && (
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                               (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}; 