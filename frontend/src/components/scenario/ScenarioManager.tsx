import React, { useState, useEffect } from 'react';
import { 
  listScenarios, 
  createScenario, 
  deleteScenario, 
  duplicateScenario, 
  getScenario,
  type ScenarioData, 
  type ScenarioListResponse,
  type ScenarioCreateData
} from '../../services/scenarioService';
import { BatchParameters } from '../batch/BatchParameterConfig';
import { ScenarioAuditTrail } from './ScenarioAuditTrail';

interface ScenarioManagerProps {
  sessionId: string;
  currentParameters?: BatchParameters;
  onLoadScenario: (scenario: ScenarioData) => void;
  onSaveComplete?: (scenario: ScenarioData) => void;
  onCompareScenarios?: () => void;
}

interface SaveScenarioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  isLoading: boolean;
}

const SaveScenarioDialog: React.FC<SaveScenarioDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isLoading 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onSave(name.trim(), description.trim());
      setName('');
      setDescription('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Save Scenario</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="scenario-name" className="block text-sm font-medium text-gray-700 mb-2">
              Scenario Name *
            </label>
            <input
              id="scenario-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter scenario name"
              required
              disabled={isLoading}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="scenario-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="scenario-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter scenario description"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Saving...' : 'Save Scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DuplicateScenarioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (name: string, description: string) => Promise<void>;
  originalScenario: ScenarioData | null;
  isLoading: boolean;
}

const DuplicateScenarioDialog: React.FC<DuplicateScenarioDialogProps> = ({ 
  isOpen, 
  onClose, 
  onDuplicate, 
  originalScenario,
  isLoading 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && originalScenario) {
      setName(`${originalScenario.name} (Copy)`);
      setDescription(originalScenario.description || '');
    }
  }, [isOpen, originalScenario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onDuplicate(name.trim(), description.trim());
      setName('');
      setDescription('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Duplicate Scenario</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="duplicate-name" className="block text-sm font-medium text-gray-700 mb-2">
              New Scenario Name *
            </label>
            <input
              id="duplicate-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new scenario name"
              required
              disabled={isLoading}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="duplicate-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="duplicate-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter scenario description"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Duplicating...' : 'Duplicate Scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ScenarioManager: React.FC<ScenarioManagerProps> = ({
  sessionId,
  currentParameters,
  onLoadScenario,
  onSaveComplete,
  onCompareScenarios
}) => {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperation, setIsLoadingOperation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<ScenarioData | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditTrailScenario, setAuditTrailScenario] = useState<ScenarioData | null>(null);

  // Load scenarios on component mount and session change
  useEffect(() => {
    loadScenarios();
  }, [sessionId]);

  const loadScenarios = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response: ScenarioListResponse = await listScenarios(sessionId, nameFilter || undefined);
      setScenarios(response.scenarios);
    } catch (err) {
      console.error('Error loading scenarios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveScenario = async (name: string, description: string) => {
    if (!currentParameters || !sessionId) return;
    
    setIsLoadingOperation(true);
    setError(null);
    
    try {
      const scenarioData: ScenarioCreateData = {
        session_id: sessionId,
        name,
        description: description || undefined,
        parameters: currentParameters
      };
      
      const savedScenario = await createScenario(scenarioData);
      
      setShowSaveDialog(false);
      await loadScenarios(); // Refresh the list
      
      if (onSaveComplete) {
        onSaveComplete(savedScenario);
      }
    } catch (err) {
      console.error('Error saving scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to save scenario');
    } finally {
      setIsLoadingOperation(false);
    }
  };

  const handleLoadScenario = async (scenarioId: string) => {
    setIsLoadingOperation(true);
    setError(null);
    
    try {
      const scenario = await getScenario(scenarioId);
      onLoadScenario(scenario);
    } catch (err) {
      console.error('Error loading scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scenario');
    } finally {
      setIsLoadingOperation(false);
    }
  };

  const handleDeleteScenario = async (scenarioId: string, scenarioName: string) => {
    if (!confirm(`Are you sure you want to delete the scenario "${scenarioName}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoadingOperation(true);
    setError(null);
    
    try {
      await deleteScenario(scenarioId);
      await loadScenarios(); // Refresh the list
    } catch (err) {
      console.error('Error deleting scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete scenario');
    } finally {
      setIsLoadingOperation(false);
    }
  };

  const handleDuplicateScenario = async (name: string, description: string) => {
    if (!duplicateTarget) return;
    
    setIsLoadingOperation(true);
    setError(null);
    
    try {
      await duplicateScenario(duplicateTarget.id, name, description || undefined);
      setShowDuplicateDialog(false);
      setDuplicateTarget(null);
      await loadScenarios(); // Refresh the list
    } catch (err) {
      console.error('Error duplicating scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate scenario');
    } finally {
      setIsLoadingOperation(false);
    }
  };

  const openDuplicateDialog = (scenario: ScenarioData) => {
    setDuplicateTarget(scenario);
    setShowDuplicateDialog(true);
  };

  const openAuditTrail = (scenario: ScenarioData) => {
    setAuditTrailScenario(scenario);
    setShowAuditTrail(true);
  };

  const closeAuditTrail = () => {
    setShowAuditTrail(false);
    setAuditTrailScenario(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Scenario Management</h2>
        <div className="flex space-x-3">
          {onCompareScenarios && (
            <button
              onClick={onCompareScenarios}
              disabled={isLoadingOperation}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Compare Scenarios
            </button>
          )}
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!currentParameters || isLoadingOperation}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Current Scenario
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filter scenarios by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={loadScenarios}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scenarios List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading scenarios...</p>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No scenarios found.</p>
            {nameFilter && (
              <p className="text-sm text-gray-400 mt-1">
                Try clearing the search filter or creating a new scenario.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{scenario.name}</h3>
                    {scenario.description && (
                      <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Created: {formatDate(scenario.created_at)}</span>
                      <span>Updated: {formatDate(scenario.updated_at)}</span>
                      {scenario.has_calculation_results && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Has Results
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleLoadScenario(scenario.id)}
                      disabled={isLoadingOperation}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => openDuplicateDialog(scenario)}
                      disabled={isLoadingOperation}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => openAuditTrail(scenario)}
                      disabled={isLoadingOperation}
                      className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 disabled:opacity-50"
                    >
                      View History
                    </button>
                    <button
                      onClick={() => handleDeleteScenario(scenario.id, scenario.name)}
                      disabled={isLoadingOperation}
                      className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Scenario Dialog */}
      <SaveScenarioDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveScenario}
        isLoading={isLoadingOperation}
      />

      {/* Duplicate Scenario Dialog */}
      <DuplicateScenarioDialog
        isOpen={showDuplicateDialog}
        onClose={() => {
          setShowDuplicateDialog(false);
          setDuplicateTarget(null);
        }}
        onDuplicate={handleDuplicateScenario}
        originalScenario={duplicateTarget}
        isLoading={isLoadingOperation}
      />

      {/* Audit Trail Modal */}
      {showAuditTrail && auditTrailScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
            <ScenarioAuditTrail
              scenarioId={auditTrailScenario.id}
              scenarioName={auditTrailScenario.name}
              onError={(error) => setError(error)}
              onClose={closeAuditTrail}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 