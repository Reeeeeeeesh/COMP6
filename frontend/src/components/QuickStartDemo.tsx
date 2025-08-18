/**
 * Quick Start Demo Component - Interactive bonus calculator demonstration
 * Shows users how the system works using sample data in under 2 minutes
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Play,
  Users, 
  Settings, 
  Calculator, 
  BarChart3,
  FileText,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  demoEmployees, 
  demoParameters, 
  demoSummary, 
  demoWorkflowSteps, 
  demoMessages,
  DemoEmployee 
} from '../utils/demoData';

const QuickStartDemo: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const stepIcons = [
    <Users className="w-6 h-6" />,
    <Settings className="w-6 h-6" />,
    <Calculator className="w-6 h-6" />,
    <BarChart3 className="w-6 h-6" />
  ];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleNextStep = () => {
    if (currentStep < demoWorkflowSteps.length - 1) {
      setIsAnimating(true);
      
      // Mark current step as completed
      setCompletedSteps(prev => [...prev, currentStep]);
      
      // Simulate calculation time for step 3
      const delay = currentStep === 2 ? 1500 : 500;
      
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        if (currentStep === 2) {
          setShowResults(true);
        }
        setIsAnimating(false);
      }, delay);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCompletedSteps(prev => prev.filter(step => step !== currentStep - 1));
      if (currentStep === 3) {
        setShowResults(false);
      }
    }
  };

  const handleStartRealCalculation = () => {
    navigate('/batch');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Sample Employee Data
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Employee Data</h3>
              <p className="text-gray-600">{demoMessages.step1}</p>
            </div>
            
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <p className="text-sm font-medium text-gray-700">Sample Employee Data (6 employees)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bonus %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {demoEmployees.map((employee, index) => (
                      <tr key={employee.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{employee.department}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{employee.position}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {formatCurrency(employee.salary)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {(employee.target_bonus_pct * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 In real use, you'd upload a CSV file with your employee data. The system will automatically detect columns and help you map them correctly.
              </p>
            </div>
          </div>
        );

      case 1: // Parameters Configuration
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Calculation Parameters</h3>
              <p className="text-gray-600">{demoMessages.step2}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Performance Factors</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fund Performance</span>
                    <span className="text-lg font-medium text-green-600">
                      {(demoParameters.fund_performance * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Risk Adjustment</span>
                    <span className="text-lg font-medium text-blue-600">
                      {(demoParameters.risk_adjustment_factor * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Calculation Rules</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bonus Cap</span>
                    <span className="text-lg font-medium text-orange-600">
                      {(demoParameters.bonus_cap_percentage * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Investment Weight</span>
                    <span className="text-lg font-medium text-purple-600">
                      {(demoParameters.investment_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ These parameters look good for a strong performance year with moderate risk. You can adjust these based on your company's performance and policies.
              </p>
            </div>
          </div>
        );

      case 2: // Calculation in Progress
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 3: Running Calculations</h3>
              <p className="text-gray-600">{demoMessages.step3}</p>
            </div>
            
            <div className="bg-white rounded-lg border p-8">
              {isAnimating ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Calculator className="w-8 h-8 text-blue-600 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Calculating bonuses...</h4>
                  <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Processing 6 employees...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Calculations Complete!</h4>
                  <p className="text-gray-600">All employee bonuses have been calculated successfully.</p>
                  <div className="mt-4 inline-flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    6 employees processed in 0.3 seconds
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3: // Results Display
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 4: Review Results</h3>
              <p className="text-gray-600">{demoMessages.step4}</p>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{demoSummary.total_employees}</div>
                <div className="text-sm text-gray-600">Employees</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(demoSummary.total_bonus_pool)}
                </div>
                <div className="text-sm text-gray-600">Total Bonus Pool</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(demoSummary.average_bonus)}
                </div>
                <div className="text-sm text-gray-600">Average Bonus</div>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">Calculated Bonuses</p>
                <button className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bonus</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">% of Salary</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {demoEmployees.map((employee) => (
                      <tr key={employee.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{employee.department}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {formatCurrency(employee.salary)}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          {formatCurrency(employee.calculated_bonus || 0)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {((employee.calculated_bonus || 0) / employee.salary * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-3">
                🎉 {demoMessages.completion}
              </p>
              <div className="text-center">
                <button
                  onClick={() => navigate('/advanced-guide')}
                  className="text-sm text-green-700 hover:text-green-900 underline mr-4"
                >
                  View Advanced Features Guide
                </button>
                <span className="text-gray-400">•</span>
                <button
                  onClick={() => navigate('/batch')}
                  className="text-sm text-green-700 hover:text-green-900 underline ml-4"
                >
                  Start with Your Data
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Quick Start Demo</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">2-Minute Bonus Calculator Tour</h2>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {demoWorkflowSteps.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {demoWorkflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    completedSteps.includes(index)
                      ? 'bg-green-100 text-green-600'
                      : index === currentStep
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {completedSteps.includes(index) ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    stepIcons[index]
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    index === currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < demoWorkflowSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          {currentStep < demoWorkflowSteps.length - 1 ? (
            <button
              onClick={handleNextStep}
              disabled={isAnimating}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isAnimating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStartRealCalculation}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Real Calculation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickStartDemo;