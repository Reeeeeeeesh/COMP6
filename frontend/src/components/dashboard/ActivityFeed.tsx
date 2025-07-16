import React from 'react';
import { 
  Upload, 
  Calculator, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Users
} from 'lucide-react';
import { ActivityItem, RecentUpload } from '../../services/dashboardService';

interface ActivityFeedProps {
  activities: ActivityItem[];
  recentUploads: RecentUpload[];
  loading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  recentUploads,
  loading = false
}) => {
  const getActivityIcon = (type: string, status: string) => {
    const iconClass = "w-5 h-5";
    
    switch (type) {
      case 'upload':
        return <Upload className={`${iconClass} text-blue-600`} />;
      case 'calculation':
        return <Calculator className={`${iconClass} text-green-600`} />;
      default:
        return <FileText className={`${iconClass} text-gray-600`} />;
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClass = "w-4 h-4";
    
    switch (status) {
      case 'completed':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'failed':
        return <XCircle className={`${iconClass} text-red-500`} />;
      case 'processing':
        return <Clock className={`${iconClass} text-yellow-500`} />;
      default:
        return <Clock className={`${iconClass} text-gray-500`} />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent Activities */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No recent activity</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(activity.status)}
                      <span className="text-xs text-gray-500 font-medium">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Uploads Summary */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Uploads</h3>
        <div className="space-y-4">
          {recentUploads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No recent uploads</p>
            </div>
          ) : (
            recentUploads.map((upload) => (
              <div key={upload.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 hover:from-gray-100 hover:to-gray-200 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      {upload.filename}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(upload.status)}
                    <span className="text-xs text-gray-500 font-medium">
                      {formatTimeAgo(upload.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{upload.total_rows} employees</span>
                    </div>
                    {upload.processed_rows > 0 && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{upload.processed_rows} processed</span>
                      </div>
                    )}
                    {upload.failed_rows > 0 && (
                      <div className="flex items-center space-x-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="font-medium">{upload.failed_rows} failed</span>
                      </div>
                    )}
                  </div>
                  
                  {upload.has_calculations && upload.avg_bonus && (
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        Avg: ${upload.avg_bonus.toLocaleString()}
                      </div>
                      {upload.total_bonus_pool && (
                        <div className="text-xs text-gray-500 font-medium">
                          Total: ${upload.total_bonus_pool.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};