import React from 'react';
import { ArrowLeft, Upload, Calculator, PlayCircle, BarChart3, FileText, Lightbulb, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserGuide: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      id: 1,
      title: "Batch Processing Module",
      icon: <Upload className="w-6 h-6" />,
      description: "Upload and process multiple employee bonus calculations at once",
      sections: [
        {
          subtitle: "Getting Started",
          content: [
            "Click 'Start Batch Upload' on the home page",
            "Upload a CSV file containing employee data",
            "Required columns: employee_id, first_name, last_name, department, position, salary, hire_date",
            "Optional columns: target_bonus_pct, investment_weight, qualitative_weight, etc."
          ]
        },
        {
          subtitle: "File Requirements",
          content: [
            "File format: CSV (Comma Separated Values)",
            "Maximum file size: 10MB",
            "Encoding: UTF-8 recommended",
            "Column headers must be in the first row"
          ]
        },
        {
          subtitle: "Parameter Configuration",
          content: [
            "Set global parameters that apply to all employees",
            "Configure fund performance, risk adjustment factors",
            "Set bonus caps and calculation multipliers",
            "Save parameter presets for reuse"
          ]
        },
        {
          subtitle: "Results Review",
          content: [
            "View calculated bonuses in an interactive table",
            "Sort and filter results by any column",
            "Export results to CSV or Excel format",
            "View summary statistics and distribution charts"
          ]
        }
      ]
    },
    {
      id: 2,
      title: "Individual Calculator",
      icon: <Calculator className="w-6 h-6" />,
      description: "Calculate bonuses for individual employees with real-time results",
      sections: [
        {
          subtitle: "Direct Entry Mode",
          content: [
            "Click 'Open Calculator' on the home page",
            "Enter employee details manually",
            "Fill in all required fields (salary, department, etc.)",
            "Adjust calculation parameters as needed"
          ]
        },
        {
          subtitle: "Load from Batch Results",
          content: [
            "First complete a batch calculation",
            "In batch results, click 'Calculate Individual' for any employee",
            "Employee data will be pre-loaded",
            "Modify parameters to see real-time changes"
          ]
        },
        {
          subtitle: "Real-time Calculation",
          content: [
            "Results update automatically as you type",
            "See breakdown of investment and qualitative scores",
            "View impact of risk adjustment factors",
            "Understand how bonus caps are applied"
          ]
        },
        {
          subtitle: "Results Analysis",
          content: [
            "View detailed calculation breakdown",
            "See visual charts of bonus components",
            "Compare against target bonus percentages",
            "Export individual calculation report"
          ]
        }
      ]
    },
    {
      id: 3,
      title: "Scenario Playground",
      icon: <PlayCircle className="w-6 h-6" />,
      description: "Create and compare 'what-if' scenarios with existing data",
      sections: [
        {
          subtitle: "Creating Scenarios",
          content: [
            "Click 'Create Scenario' on the home page",
            "Load data from a previous batch calculation",
            "Name your scenario for easy identification",
            "Set initial parameter values"
          ]
        },
        {
          subtitle: "Parameter Adjustment",
          content: [
            "Modify global parameters in real-time",
            "See immediate impact on all employees",
            "Adjust fund performance metrics",
            "Change risk factors and bonus caps"
          ]
        },
        {
          subtitle: "Visualizations",
          content: [
            "View bonus distribution charts",
            "See department-wise breakdowns",
            "Analyze impact of parameter changes",
            "Compare before/after scenarios"
          ]
        },
        {
          subtitle: "Scenario Management",
          content: [
            "Save scenarios for future reference",
            "Load and modify existing scenarios",
            "Compare multiple scenarios side-by-side",
            "Export scenario reports and data"
          ]
        }
      ]
    }
  ];

  const tips = [
    {
      icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
      title: "Pro Tip",
      content: "Always start with a small test file (5-10 employees) to verify your data format before uploading large batches."
    },
    {
      icon: <AlertCircle className="w-5 h-5 text-blue-500" />,
      title: "Best Practice",
      content: "Save parameter presets for different calculation scenarios (e.g., 'Q1 2024', 'High Performance', 'Conservative') to ensure consistency."
    },
    {
      icon: <FileText className="w-5 h-5 text-green-500" />,
      title: "Data Quality",
      content: "Ensure salary data is in numeric format without currency symbols. Use decimal notation for percentages (0.15 for 15%)."
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-purple-500" />,
      title: "Analysis",
      content: "Use the Scenario Playground to model different market conditions and see their impact on total bonus pool allocation."
    }
  ];

  const commonIssues = [
    {
      problem: "CSV file upload fails",
      solution: "Check file encoding (UTF-8), remove special characters from headers, ensure file size is under 10MB"
    },
    {
      problem: "Calculation errors for some employees",
      solution: "Verify all required fields have valid numeric values, check for missing salary or percentage data"
    },
    {
      problem: "Unexpected bonus amounts",
      solution: "Review parameter settings, check if bonus caps are being applied, verify risk adjustment factors"
    },
    {
      problem: "Cannot load individual calculator from batch",
      solution: "Ensure batch calculation completed successfully, check that employee data is valid"
    }
  ];

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
            <h1 className="text-2xl font-bold text-gray-900">User Guide</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to the Bonus Calculator
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            This comprehensive tool helps you calculate employee bonuses using sophisticated algorithms 
            that consider investment performance, qualitative assessments, and risk factors. Follow this 
            guide to make the most of all available features.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Batch Processing</h3>
              <p className="text-sm text-gray-600">Process multiple employees at once</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Calculator className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Individual Calculator</h3>
              <p className="text-sm text-gray-600">Real-time single employee calculations</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <PlayCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Scenario Playground</h3>
              <p className="text-sm text-gray-600">Model what-if scenarios</p>
            </div>
          </div>
        </div>

        {/* Detailed Steps */}
        {steps.map((step) => (
          <div key={step.id} className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                {step.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>

            {step.sections.map((section, index) => (
              <div key={index} className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">{section.subtitle}</h4>
                <ul className="space-y-2">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}

        {/* Tips and Best Practices */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Tips & Best Practices</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mr-3">
                  {tip.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{tip.title}</h4>
                  <p className="text-sm text-gray-600">{tip.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Common Issues & Solutions</h3>
          <div className="space-y-4">
            {commonIssues.map((issue, index) => (
              <div key={index} className="border-l-4 border-red-400 pl-4 py-2">
                <h4 className="font-semibold text-gray-900 mb-1">Problem: {issue.problem}</h4>
                <p className="text-gray-600">Solution: {issue.solution}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Formula Reference */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Bonus Calculation Formula</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Core Formula</h4>
            <div className="font-mono text-sm bg-white p-4 rounded border">
              <div>Final Bonus = min(Target Bonus × Composite Score × RAF, Bonus Cap)</div>
              <div className="mt-2 text-gray-600">Where:</div>
              <ul className="mt-2 text-gray-600 space-y-1">
                <li>• Target Bonus = Salary × Target Bonus %</li>
                <li>• Composite Score = (Investment Score × Investment Weight) + (Qualitative Score × Qualitative Weight)</li>
                <li>• RAF = Risk Adjustment Factor</li>
                <li>• Bonus Cap = Salary × Bonus Cap % (if applicable)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Need Additional Help?</h3>
          <p className="text-gray-600 mb-4">
            If you encounter issues not covered in this guide, please contact your system administrator 
            or IT support team for assistance.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Return to Bonus Calculator
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuide; 