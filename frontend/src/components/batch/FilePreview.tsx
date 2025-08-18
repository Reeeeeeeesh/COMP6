import React, { useState, useMemo } from 'react';
import { UploadData } from './BatchUploadContainer';

interface FilePreviewProps {
  uploadData: UploadData;
  onReset: () => void;
  onContinue: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  uploadData,
  onReset,
  onContinue
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'columns' | 'data'>('overview');

  const validationSummary = useMemo(() => {
    const totalRows = uploadData.total_rows;
    const processedRows = uploadData.processed_rows;
    const failedRows = uploadData.failed_rows;
    const successRate = totalRows > 0 ? ((processedRows - failedRows) / totalRows) * 100 : 0;
    
    return {
      totalRows,
      processedRows,
      failedRows,
      validRows: processedRows - failedRows,
      successRate
    };
  }, [uploadData]);

  const columnStats = useMemo(() => {
    const requiredColumns = ['employee_id', 'base_salary'];
    const optionalColumns = ['first_name', 'last_name', 'email', 'department', 'position'];
    
    const foundRequired = requiredColumns.filter(col => 
      uploadData.columns.some(c => c.name === col && c.has_data)
    );
    const foundOptional = optionalColumns.filter(col => 
      uploadData.columns.some(c => c.name === col && c.has_data)
    );
    
    return {
      requiredColumns,
      optionalColumns,
      foundRequired,
      foundOptional,
      missingRequired: requiredColumns.filter(col => !foundRequired.includes(col)),
      totalColumns: uploadData.columns.length
    };
  }, [uploadData.columns]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'integer':
      case 'float':
        return '🔢';
      case 'string':
        return '📝';
      case 'date':
        return '📅';
      case 'boolean':
        return '✓';
      default:
        return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            File Preview & Validation
          </h3>
          <p className="text-gray-600">
            Review your uploaded data before proceeding
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(uploadData.status)}`}>
            {uploadData.status.charAt(0).toUpperCase() + uploadData.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'columns', label: 'Columns', icon: '📋' },
            { id: 'data', label: 'Sample Data', icon: '🔍' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Validation Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">
                  {(validationSummary.totalRows ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">Total Rows</div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-900">
                  {(validationSummary.validRows ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-green-700">Valid Rows</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-900">
                  {(validationSummary.failedRows ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-red-700">Failed Rows</div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">
                  {validationSummary.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700">Success Rate</div>
              </div>
            </div>

            {/* Column Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Column Analysis</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Required Columns</h5>
                  <div className="space-y-2">
                    {columnStats.requiredColumns.map(col => (
                      <div key={col} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{col}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          columnStats.foundRequired.includes(col)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {columnStats.foundRequired.includes(col) ? 'Found' : 'Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">
                    Optional Columns ({columnStats.foundOptional.length} found)
                  </h5>
                  <div className="space-y-2">
                    {columnStats.foundOptional.slice(0, 5).map(col => (
                      <div key={col} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{col}</span>
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                          Found
                        </span>
                      </div>
                    ))}
                    {columnStats.foundOptional.length > 5 && (
                      <div className="text-xs text-gray-500">
                        +{columnStats.foundOptional.length - 5} more columns
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings/Errors */}
            {columnStats.missingRequired.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h4 className="text-sm font-medium text-red-800">Missing Required Columns</h4>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  The following required columns are missing: {columnStats.missingRequired.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'columns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {uploadData.columns.map((column, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getDataTypeIcon(column.data_type)}</span>
                      <h4 className="font-medium text-gray-900">{column.name}</h4>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {column.data_type}
                      </span>
                    </div>
                    
                    <span className={`text-xs px-2 py-1 rounded ${
                      column.has_data ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {column.has_data ? 'Has Data' : 'Empty'}
                    </span>
                  </div>
                  
                  {column.sample_values.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sample values:</p>
                      <div className="flex flex-wrap gap-1">
                        {column.sample_values.map((value, idx) => (
                          <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {value || '(empty)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'data' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(uploadData.sample_data[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadData.sample_data.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {value || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {uploadData.sample_data.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No sample data available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onReset}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Upload Different File
        </button>
        
        <button
          onClick={onContinue}
          disabled={columnStats.missingRequired.length > 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Calculations
        </button>
      </div>
    </div>
  );
};
