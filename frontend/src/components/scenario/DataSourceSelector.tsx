import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

interface BatchSource {
  id: string;
  filename: string;
  upload_date: string;
  employee_count: number;
  file_size: number;
  has_calculation_results: boolean;
}

interface DataSourceSelectorProps {
  sessionId: string;
  onSourceSelect: (source: { type: 'batch', id: string, data: BatchSource }) => void;
  onError?: (error: string) => void;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  sessionId,
  onSourceSelect,
  onError
}) => {
  const [batches, setBatches] = useState<BatchSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching available batch sources for session:', sessionId);
        const response = await fetch(
          `${API_BASE_URL}/api/v1/scenarios/sources/batches?session_id=${sessionId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch batch sources: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Batch sources response:', result);

        if (result.success) {
          setBatches(result.data.sources || []);
        } else {
          throw new Error(result.error || 'Failed to load batch sources');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred while loading data sources';
        console.error('Error fetching batch sources:', err);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchBatches();
    }
  }, [sessionId, onError]);

  const handleSourceSelect = (batch: BatchSource) => {
    console.log('Selected batch source:', batch);
    onSourceSelect({
      type: 'batch',
      id: batch.id,
      data: batch
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="p-6 border rounded-lg bg-white shadow">
        <h2 className="text-xl font-bold mb-4">Select Data Source for Scenario</h2>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading available data sources...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Select Data Source for Scenario</h2>
      <p className="text-gray-600 mb-6">
        Choose a completed batch upload to create a scenario playground. 
        You'll be able to modify parameters and see real-time calculation changes.
      </p>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error Loading Data Sources</p>
          <p>{error}</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">No Data Sources Available</p>
          <p>
            No completed batch uploads found for this session. 
            Please upload and process a batch file first to create scenarios.
          </p>
        </div>
      ) : (
        <div>
          <h3 className="font-bold mb-4 text-gray-800">
            Available Batches ({batches.length})
          </h3>
          
          <div className="space-y-3">
            {batches.map(batch => (
              <div 
                key={batch.id} 
                className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => handleSourceSelect(batch)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-gray-800">{batch.filename}</p>
                      {batch.has_calculation_results && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Calculated
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Uploaded:</span> {formatDate(batch.upload_date)}
                      </div>
                      <div>
                        <span className="font-medium">Employees:</span> {batch.employee_count.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">File Size:</span> {formatFileSize(batch.file_size)}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <span className="text-green-600 ml-1">Ready for Scenarios</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-center">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Create Scenario
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 What happens next?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• All employee data from the selected batch will be loaded into the scenario</li>
              <li>• You can modify calculation parameters and see results update in real-time</li>
              <li>• Compare different scenarios side-by-side</li>
              <li>• Export scenario results for analysis</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}; 