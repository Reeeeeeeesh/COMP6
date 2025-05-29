import React, { useCallback, useState, useRef } from 'react';
import { API_BASE_URL } from '../../config';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  sessionId: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  disabled = false,
  sessionId: _sessionId
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  }, [disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const validExtensions = ['.csv', '.txt'];
    
    const isValidType = validTypes.includes(file.type) || 
                       validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      alert('Please select a CSV file (.csv or .txt)');
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return false;
    }

    return true;
  };

  const handleUpload = useCallback(() => {
    if (selectedFile && !disabled) {
      onFileSelect(selectedFile);
    }
  }, [selectedFile, disabled, onFileSelect]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const downloadTemplate = useCallback(async (templateType: 'standard' | 'minimal') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/batch/template/csv?template_type=${templateType}`);
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_template_${templateType}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Template Download Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          Download CSV Template
        </h3>
        <p className="text-blue-700 mb-4">
          Start with our template to ensure your data is formatted correctly.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => downloadTemplate('standard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Download Standard Template
          </button>
          <button
            onClick={() => downloadTemplate('minimal')}
            className="px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Download Minimal Template
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Upload Your CSV File
        </h3>

        {!selectedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : disabled
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={disabled}
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              
              <div>
                <p className="text-lg text-gray-600">
                  Drag and drop your CSV file here, or{' '}
                  <button
                    onClick={handleBrowseClick}
                    disabled={disabled}
                    className="text-blue-600 hover:text-blue-500 font-medium focus:outline-none focus:underline"
                  >
                    browse to upload
                  </button>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports CSV files up to 10MB with maximum 10,000 rows
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRemoveFile}
                  disabled={disabled}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && (
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={disabled || !selectedFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {disabled ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        )}
      </div>

      {/* Requirements Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          File Requirements
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• File format: CSV (.csv) or text (.txt)</li>
          <li>• Maximum file size: 10MB</li>
          <li>• Maximum rows: 10,000</li>
          <li>• Required columns: employee_id, base_salary</li>
          <li>• First row should contain column headers</li>
        </ul>
      </div>
    </div>
  );
};
