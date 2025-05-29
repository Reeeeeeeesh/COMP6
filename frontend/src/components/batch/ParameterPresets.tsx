import React, { useState, useEffect, useCallback } from 'react';
import { BatchParameters } from './BatchParameterConfig';
import { getParameterPresets, createParameterPreset } from '../../services/parameterPresetService';

// Convert from API model (PresetType) to component model
interface ParameterPreset {
  id: string;
  name: string;
  description?: string;
  parameters: BatchParameters;
  isDefault?: boolean;
  created_at: string;
}

interface ParameterPresetsProps {
  onSelectPreset: (preset: BatchParameters) => void;
  onSavePreset: (preset: Omit<ParameterPreset, 'id' | 'created_at'>) => void;
  currentParameters: BatchParameters;
}

export const ParameterPresets: React.FC<ParameterPresetsProps> = ({
  onSelectPreset,
  onSavePreset,
  currentParameters
}) => {
  const [presets, setPresets] = useState<ParameterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Load presets
  const loadPresets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const presetsData = await getParameterPresets();
      
      setPresets(presetsData.map(preset => ({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        parameters: preset.parameters,
        isDefault: preset.is_default,
        created_at: preset.created_at
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load parameter presets');
      
      // Fallback to default presets if API fails
      const defaultPresets: ParameterPreset[] = [
        {
          id: '1',
          name: 'Standard Configuration',
          description: 'Default parameters for standard bonus calculations',
          parameters: {
            targetBonusPct: 0.15,
            investmentWeight: 0.6,
            qualitativeWeight: 0.4,
            investmentScoreMultiplier: 1.0,
            qualScoreMultiplier: 1.0,
            raf: 1.0,
            rafSensitivity: 0.2,
            rafLowerClamp: 0,
            rafUpperClamp: 1.5,
            mrtCapPct: 2.0,
            useDirectRaf: true,
            baseSalaryCapMultiplier: 3.0
          },
          isDefault: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'High Performance',
          description: 'Parameters optimized for high-performing teams',
          parameters: {
            targetBonusPct: 0.2,
            investmentWeight: 0.7,
            qualitativeWeight: 0.3,
            investmentScoreMultiplier: 1.2,
            qualScoreMultiplier: 1.1,
            raf: 1.0,
            rafSensitivity: 0.3,
            rafLowerClamp: 0,
            rafUpperClamp: 2.0,
            mrtCapPct: 3.0,
            useDirectRaf: true,
            baseSalaryCapMultiplier: 4.0
          },
          created_at: new Date().toISOString()
        }
      ];
      
      setPresets(defaultPresets);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load presets on component mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Handle preset selection
  const handleSelectPreset = (preset: ParameterPreset) => {
    onSelectPreset(preset.parameters);
  };

  // Handle saving a new preset
  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      setError('Preset name is required');
      return;
    }

    const newPreset = {
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      parameters: currentParameters,
      is_default: false
    };

    try {
      // Save preset using the service
      await createParameterPreset(newPreset);
      
      // Refresh the presets list
      await loadPresets();
      
      // Call the onSavePreset callback
      onSavePreset(newPreset);
      
      // Reset form
      setPresetName('');
      setPresetDescription('');
      setShowSaveForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save parameter preset');
    }
  };

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-lg font-medium mb-4">Parameter Presets</h3>
      
      {isLoading && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {presets.map(preset => (
          <div 
            key={preset.id}
            className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
              preset.isDefault ? 'border-blue-500' : 'border-gray-200'
            }`}
            onClick={() => handleSelectPreset(preset)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{preset.name}</h4>
                {preset.description && (
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                )}
              </div>
              {preset.isDefault && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Default</span>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Target Bonus:</span>
                <span>{(preset.parameters.targetBonusPct * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Investment Weight:</span>
                <span>{(preset.parameters.investmentWeight * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Qualitative Weight:</span>
                <span>{(preset.parameters.qualitativeWeight * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {!showSaveForm ? (
        <button
          onClick={() => setShowSaveForm(true)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Save Current Parameters as Preset
        </button>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Save Current Parameters as Preset</h4>
          <div className="mb-3">
            <label className="block mb-1 text-sm font-medium">Preset Name</label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter preset name"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">Description (Optional)</label>
            <textarea
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter description"
              rows={2}
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSavePreset}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Save Preset
            </button>
            <button
              onClick={() => setShowSaveForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParameterPresets;
