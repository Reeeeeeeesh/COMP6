import React from 'react';

interface UploadProgressProps {
  progress: number;
  isComplete: boolean;
  fileName: string;
  totalRows?: number;
  processedRows?: number;
  failedRows?: number;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  isComplete,
  fileName,
  totalRows,
  processedRows,
  failedRows
}) => {
  const getProgressColor = () => {
    if (isComplete) return 'bg-green-500';
    if (progress > 0) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const getProgressText = () => {
    if (isComplete) {
      return 'Upload Complete';
    } else if (progress > 90) {
      return 'Processing file...';
    } else if (progress > 50) {
      return 'Validating data...';
    } else if (progress > 0) {
      return 'Uploading file...';
    }
    return 'Preparing upload...';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Processing Your File
        </h3>
        <p className="text-gray-600">
          Please wait while we upload and validate your data
        </p>
      </div>

      {/* Progress Circle */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={isComplete ? 'text-green-500' : 'text-blue-500'}
              style={{
                strokeDasharray: `${2 * Math.PI * 50}`,
                strokeDashoffset: `${2 * Math.PI * 50 * (1 - progress / 100)}`,
                transition: 'stroke-dashoffset 0.5s ease-in-out'
              }}
            />
          </svg>
          
          {/* Progress percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {isComplete ? (
                <div className="text-green-500">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(progress)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{getProgressText()}</span>
          <span className="text-gray-900 font-medium">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* File Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">File:</span>
            <span className="text-sm text-gray-900 truncate max-w-xs">{fileName}</span>
          </div>
          
          {totalRows !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Rows:</span>
              <span className="text-sm text-gray-900">{totalRows.toLocaleString()}</span>
            </div>
          )}
          
          {processedRows !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Processed:</span>
              <span className="text-sm text-gray-900">{processedRows.toLocaleString()}</span>
            </div>
          )}
          
          {failedRows !== undefined && failedRows > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Failed:</span>
              <span className="text-sm text-red-600">{failedRows.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Processing Steps */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Processing Steps:</h4>
        
        <div className="space-y-2">
          <div className={`flex items-center space-x-3 ${progress >= 25 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              progress >= 25 ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}>
              {progress >= 25 && (
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" />
                </svg>
              )}
            </div>
            <span className="text-sm">File upload</span>
          </div>
          
          <div className={`flex items-center space-x-3 ${progress >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              progress >= 50 ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}>
              {progress >= 50 && (
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" />
                </svg>
              )}
            </div>
            <span className="text-sm">Format validation</span>
          </div>
          
          <div className={`flex items-center space-x-3 ${progress >= 75 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              progress >= 75 ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}>
              {progress >= 75 && (
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" />
                </svg>
              )}
            </div>
            <span className="text-sm">Data processing</span>
          </div>
          
          <div className={`flex items-center space-x-3 ${isComplete ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              isComplete ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}>
              {isComplete && (
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" />
                </svg>
              )}
            </div>
            <span className="text-sm">Validation complete</span>
          </div>
        </div>
      </div>

      {/* Loading Animation */}
      {!isComplete && (
        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};
