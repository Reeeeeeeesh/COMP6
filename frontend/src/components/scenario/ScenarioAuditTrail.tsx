import React, { useState, useEffect, useMemo } from 'react';
import { getScenarioAuditHistory, type AuditLogEntry } from '../../services/scenarioService';

interface ScenarioAuditTrailProps {
  scenarioId: string;
  scenarioName: string;
  onError?: (error: string) => void;
  onClose?: () => void;
}

interface ActionTypeConfig {
  label: string;
  color: string;
  icon: string;
  bgColor: string;
}

const ACTION_TYPES: Record<string, ActionTypeConfig> = {
  created: {
    label: 'Created',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: '🆕'
  },
  updated: {
    label: 'Updated',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: '✏️'
  },
  calculated: {
    label: 'Calculated',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    icon: '🧮'
  },
  duplicated: {
    label: 'Duplicated',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    icon: '📋'
  },
  deleted: {
    label: 'Deleted',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: '🗑️'
  }
};

export const ScenarioAuditTrail: React.FC<ScenarioAuditTrailProps> = ({
  scenarioId,
  scenarioName,
  onError,
  onClose
}) => {
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAuditHistory();
  }, [scenarioId]);

  const loadAuditHistory = async () => {
    try {
      setLoading(true);
      const response = await getScenarioAuditHistory(scenarioId, 50);
      setAuditHistory(response.audit_history);
    } catch (error) {
      console.error('Error loading audit history:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  const filteredAuditHistory = useMemo(() => {
    if (actionFilter === 'all') return auditHistory;
    return auditHistory.filter(entry => entry.action === actionFilter);
  }, [auditHistory, actionFilter]);

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const exportAuditTrail = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Changes'].join(','),
      ...filteredAuditHistory.map(entry => [
        new Date(entry.timestamp).toLocaleString(),
        entry.action,
        entry.new_values ? Object.keys(entry.new_values).join('; ') : 'N/A'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scenarioName}_audit_trail.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const formatChanges = (entry: AuditLogEntry) => {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    if (entry.old_values && entry.new_values) {
      Object.keys(entry.new_values).forEach(key => {
        if (entry.old_values![key] !== entry.new_values![key]) {
          changes.push({
            field: key,
            oldValue: entry.old_values![key],
            newValue: entry.new_values![key]
          });
        }
      });
    } else if (entry.new_values && entry.action === 'created') {
      Object.keys(entry.new_values).forEach(key => {
        changes.push({
          field: key,
          oldValue: null,
          newValue: entry.new_values![key]
        });
      });
    }

    return changes;
  };

  const renderChangeValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }
    if (typeof value === 'object') {
      return <span className="text-xs text-gray-600 font-mono">{JSON.stringify(value, null, 2)}</span>;
    }
    return <span className="font-mono">{String(value)}</span>;
  };

  const uniqueActions = useMemo(() => {
    const actions = new Set(auditHistory.map(entry => entry.action));
    return Array.from(actions);
  }, [auditHistory]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading audit history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Audit Trail</h2>
            <p className="text-gray-600 mt-1">Version history for "{scenarioName}"</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportAuditTrail}
              disabled={filteredAuditHistory.length === 0}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter by action:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions ({auditHistory.length})</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {ACTION_TYPES[action]?.label || action} ({auditHistory.filter(e => e.action === action).length})
                </option>
              ))}
            </select>
          </div>
          
          <div className="text-sm text-gray-500">
            Showing {filteredAuditHistory.length} of {auditHistory.length} entries
          </div>
        </div>
      </div>

      {/* Audit History */}
      <div className="px-6 py-4">
        {filteredAuditHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No audit entries found for the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAuditHistory.map((entry) => {
              const actionConfig = ACTION_TYPES[entry.action] || {
                label: entry.action,
                color: 'text-gray-700',
                bgColor: 'bg-gray-50',
                icon: '📝'
              };
              const isExpanded = expandedEntries.has(entry.id);
              const changes = formatChanges(entry);
              const { date, time } = formatTimestamp(entry.timestamp);

              return (
                <div key={entry.id} className="border border-gray-200 rounded-lg">
                  {/* Entry Header */}
                  <div 
                    className={`px-4 py-3 ${actionConfig.bgColor} cursor-pointer hover:bg-opacity-70 transition-colors`}
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{actionConfig.icon}</span>
                        <div>
                          <span className={`font-medium ${actionConfig.color}`}>
                            {actionConfig.label}
                          </span>
                          <div className="text-sm text-gray-600">
                            {date} at {time}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {changes.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {changes.length} change{changes.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Entry Details */}
                  {isExpanded && (
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      {changes.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Changes:</h4>
                          {changes.map((change, idx) => (
                            <div key={idx} className="pl-4 border-l-2 border-gray-300">
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                {change.field}
                              </div>
                              {change.oldValue !== null && (
                                <div className="text-sm text-gray-600 mb-1">
                                  <span className="text-red-600 font-medium">From: </span>
                                  {renderChangeValue(change.oldValue)}
                                </div>
                              )}
                              <div className="text-sm text-gray-600">
                                <span className="text-green-600 font-medium">
                                  {change.oldValue !== null ? 'To: ' : 'Set to: '}
                                </span>
                                {renderChangeValue(change.newValue)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          No detailed changes recorded for this action.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}; 