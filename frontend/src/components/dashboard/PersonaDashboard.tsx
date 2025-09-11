import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DataUsage, 
  Assessment, 
  Settings, 
  Upload, 
  PlayArrow, 
  Build,
  TrendingUp,
  People,
  Schedule,
  CheckCircle,
  BarChart
} from '@mui/icons-material';
import { useUser, UserRole } from '../../contexts/UserContext';
import { useTenant } from '../../contexts/TenantContext';

// Helper functions removed - using inline logic to prevent scope issues

// Persona card interface
interface PersonaCard {
  role: UserRole;
  title: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  gradient: string;
  features: string[];
  quickActions: {
    label: string;
    path: string;
    icon: React.ComponentType;
    description: string;
  }[];
  recentActivity?: {
    type: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

// Persona configurations
const personaCards: PersonaCard[] = [
  {
    role: 'analyst',
    title: 'Data Analyst',
    description: 'Design plans, process data, and run complex analysis scenarios.',
    icon: DataUsage,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-600',
    features: [
      'Advanced data processing',
      'Plan creation & validation', 
      'What-if scenario modeling',
      'Custom calculation workflows',
      'Data quality monitoring'
    ],
    quickActions: [
      {
        label: 'Upload Data',
        path: '/batch?browse=1',
        icon: Upload,
        description: 'Process employee data files'
      },
      {
        label: 'Build Plan',
        path: '/admin/plan-builder',
        icon: Build,
        description: 'Create calculation plans'
      },
      {
        label: 'Run Scenarios',
        path: '/scenarios',
        icon: PlayArrow,
        description: 'Test different parameters'
      }
    ]
  },
  {
    role: 'executive',
    title: 'Executive',
    description: 'View high-level insights, generate reports, and track business impact.',
    icon: Assessment,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-600',
    features: [
      'Executive dashboards',
      'Business intelligence reports',
      'Trend analysis & forecasting',
      'Pool utilization tracking',
      'Performance benchmarking'
    ],
    quickActions: [
      {
        label: 'View Dashboard',
        path: '/dashboard',
        icon: BarChart,
        description: 'Key performance metrics'
      },
      {
        label: 'Generate Report',
        path: '/admin/executive-reporting',
        icon: Assessment,
        description: 'Executive reporting suite'
      },
      {
        label: 'View Trends',
        path: '/dashboard',
        icon: TrendingUp,
        description: 'Performance trends'
      }
    ]
  },
  {
    role: 'admin',
    title: 'Administrator',
    description: 'Manage platform configuration, users, and system settings.',
    icon: Settings,
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    features: [
      'User & permission management',
      'System configuration',
      'Revenue banding setup',
      'Platform monitoring',
      'Data governance controls'
    ],
    quickActions: [
      {
        label: 'Configure System',
        path: '/admin/revenue-banding',
        icon: Settings,
        description: 'System configuration'
      },
      {
        label: 'Manage Users',
        path: '/admin/users',
        icon: People,
        description: 'User management'
      },
      {
        label: 'Plan Builder',
        path: '/admin/plan-builder',
        icon: Build,
        description: 'Advanced plan management'
      }
    ]
  }
];

// Mock activity data (in real app, this would come from API)
const getMockRecentActivity = (role: UserRole) => {
  switch (role) {
    case 'analyst':
      return [
        { type: 'Data Uploads', count: 12, trend: 'up' as const },
        { type: 'Plans Created', count: 3, trend: 'stable' as const },
        { type: 'Scenarios Run', count: 25, trend: 'up' as const }
      ];
    case 'executive':
      return [
        { type: 'Reports Generated', count: 5, trend: 'up' as const },
        { type: 'Dashboard Views', count: 48, trend: 'up' as const },
        { type: 'Exports Created', count: 8, trend: 'stable' as const }
      ];
    case 'admin':
      return [
        { type: 'System Changes', count: 2, trend: 'stable' as const },
        { type: 'Users Managed', count: 15, trend: 'up' as const },
        { type: 'Configurations', count: 7, trend: 'down' as const }
      ];
  }
};

export const PersonaDashboard: React.FC = () => {
  const { user, hasRole, updatePreferences } = useUser();
  const { currentTenant } = useTenant();
  const [selectedPersona, setSelectedPersona] = useState<UserRole | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Check if this is a first-time user
  useEffect(() => {
    const hasVisited = localStorage.getItem('bonus_calculator_visited');
    if (!hasVisited) {
      setIsFirstTimeUser(true);
      localStorage.setItem('bonus_calculator_visited', 'true');
    }
  }, []);

  // Get user's current persona card
  const currentPersonaCard = personaCards.find(card => card.role === user?.role);
  
  // Get persona cards the user can access
  const accessiblePersonas = personaCards.filter(card => 
    user && (user.role === card.role || user.role === 'admin')
  );

  const handlePersonaSelect = (role: UserRole) => {
    setSelectedPersona(role);
    // Update user preferences to remember this selection
    if (user) {
      updatePreferences({
        defaultLandingPage: role === user.role ? '/dashboard' : `/persona/${role}`
      });
    }
  };


  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your personalized dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="mb-4">
            <span className="inline-block w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isFirstTimeUser ? 'Welcome to Bonus Calculator!' : `Welcome back, ${user.name}!`}
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            {isFirstTimeUser 
              ? 'Choose your role to get started with a personalized experience.' 
              : 'Your personalized workspace is ready.'}
          </p>
          <p className="text-sm text-gray-500">
            {currentTenant.displayName} • {currentPersonaCard?.title || 'Multi-role Access'}
          </p>
        </div>

        {/* Current User's Persona Card - Highlighted */}
        {currentPersonaCard && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Current Role</h2>
            <div className="max-w-4xl mx-auto">
              <PersonaCardComponent 
                card={currentPersonaCard}
                isActive={true}
                isPrimary={true}
                onSelect={() => handlePersonaSelect(currentPersonaCard.role)}
              />
            </div>
          </div>
        )}

        {/* Other Available Personas (for admin users) */}
        {user.role === 'admin' && accessiblePersonas.length > 1 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Available Roles
            </h2>
            <p className="text-center text-gray-600 mb-8">
              As an administrator, you have access to all platform capabilities.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {accessiblePersonas
                .filter(card => card.role !== user.role)
                .map((card) => (
                  <PersonaCardComponent
                    key={card.role}
                    card={card}
                    isActive={selectedPersona === card.role}
                    isPrimary={false}
                    onSelect={() => handlePersonaSelect(card.role)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Getting Started Section for New Users */}
        {isFirstTimeUser && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🚀 Ready to Get Started?</h3>
              <p className="text-gray-600 mb-6">
                New to the platform? Take our quick tour to learn the essentials.
              </p>
              <div className="flex justify-center space-x-4">
                <Link 
                  to="/user-guide"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Take Quick Tour
                </Link>
                <Link 
                  to="/dashboard"
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Skip to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Individual Persona Card Component
interface PersonaCardProps {
  card: PersonaCard;
  isActive: boolean;
  isPrimary: boolean;
  onSelect: () => void;
}

const PersonaCardComponent: React.FC<PersonaCardProps> = ({ 
  card, 
  isActive, 
  isPrimary, 
  onSelect 
}) => {
  const Icon = card.icon;
  const recentActivity = getMockRecentActivity(card.role);

  return (
    <div 
      className={`
        rounded-xl p-8 cursor-pointer transition-all duration-300 transform hover:scale-105
        ${isPrimary 
          ? `bg-gradient-to-r ${card.gradient} text-white shadow-2xl` 
          : 'bg-white hover:shadow-xl border border-gray-200'
        }
        ${isActive ? 'ring-4 ring-blue-300' : ''}
      `}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className={`
          w-16 h-16 rounded-full flex items-center justify-center mr-4
          ${isPrimary 
            ? 'bg-white bg-opacity-20' 
            : card.color === 'blue' ? 'bg-blue-100' 
              : card.color === 'purple' ? 'bg-purple-100'
              : card.color === 'green' ? 'bg-green-100'
              : 'bg-gray-100'
          }
        `}>
          <Icon className={`
            w-8 h-8 
            ${isPrimary 
              ? 'text-white' 
              : card.color === 'blue' ? 'text-blue-600' 
                : card.color === 'purple' ? 'text-purple-600'
                : card.color === 'green' ? 'text-green-600'
                : 'text-gray-600'
            }
          `} />
        </div>
        <div>
          <h3 className={`
            text-2xl font-bold 
            ${isPrimary ? 'text-white' : 'text-gray-900'}
          `}>
            {card.title}
          </h3>
          <p className={`
            text-sm 
            ${isPrimary ? 'text-white text-opacity-90' : 'text-gray-600'}
          `}>
            {card.role.toUpperCase()} ROLE
          </p>
        </div>
      </div>

      {/* Description */}
      <p className={`
        mb-6 
        ${isPrimary ? 'text-white text-opacity-90' : 'text-gray-600'}
      `}>
        {card.description}
      </p>

      {/* Features */}
      <div className="mb-6">
        <h4 className={`
          font-semibold mb-3 
          ${isPrimary ? 'text-white' : 'text-gray-900'}
        `}>
          Key Features:
        </h4>
        <ul className="space-y-2">
          {card.features.map((feature, index) => (
            <li 
              key={index} 
              className={`
                flex items-center text-sm 
                ${isPrimary ? 'text-white text-opacity-90' : 'text-gray-600'}
              `}
            >
              <CheckCircle className={`
                w-4 h-4 mr-2 
                ${isPrimary 
                  ? 'text-white text-opacity-75' 
                  : card.color === 'blue' ? 'text-blue-500' 
                    : card.color === 'purple' ? 'text-purple-500'
                    : card.color === 'green' ? 'text-green-500'
                    : 'text-gray-500'
                }
              `} />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Recent Activity */}
      {recentActivity && (
        <div className="mb-6">
          <h4 className={`
            font-semibold mb-3 
            ${isPrimary ? 'text-white' : 'text-gray-900'}
          `}>
            Recent Activity (7 days):
          </h4>
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div 
                key={index}
                className={`
                  flex justify-between items-center text-sm 
                  ${isPrimary ? 'text-white text-opacity-90' : 'text-gray-600'}
                `}
              >
                <span>{activity.type}</span>
                <span className="flex items-center space-x-1">
                  <span className="font-medium">{activity.count}</span>
                  <span className={
                    activity.trend === 'up' ? 'text-green-600' :
                    activity.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }>
                    {activity.trend === 'up' ? '↗️' : 
                     activity.trend === 'down' ? '↘️' : '→'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h4 className={`
          font-semibold mb-3 
          ${isPrimary ? 'text-white' : 'text-gray-900'}
        `}>
          Quick Actions:
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {card.quickActions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Link
                key={index}
                to={action.path}
                className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isPrimary 
                    ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white' 
                    : card.color === 'blue' ? 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                      : card.color === 'purple' ? 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                      : card.color === 'green' ? 'bg-green-50 hover:bg-green-100 text-green-700'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }
                `}
                title={action.description}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionIcon className="w-4 h-4 mr-2" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PersonaDashboard;
