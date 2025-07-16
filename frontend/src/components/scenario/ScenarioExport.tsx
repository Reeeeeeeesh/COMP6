import React, { useState } from 'react';
import { BatchParameters } from '../batch/BatchParameterConfig';

interface EmployeeData {
  id: string;
  employee_data: {
    employee_id?: string;
    first_name?: string;
    last_name?: string;
    department?: string;
    position?: string;
    salary?: number;
    additional_data?: {
      investment_score?: string;
      qualitative_score?: string;
      raf?: string;
      is_mrt?: string;
      [key: string]: string | undefined;
    };
  };
  batch_upload_id: string;
  calculation_result?: any;
}

interface CalculationSummary {
  totalEmployees: number;
  totalBonusPool: number;
  avgBonusAmount: number;
  avgBonusPercentage: number;
  medianBonusAmount: number;
  cappedEmployees: number;
  mrtEmployees: number;
  mrtCappedEmployees: number;
  departmentBreakdown: Record<string, {
    count: number;
    totalBonus: number;
    avgBonus: number;
    avgSalary: number;
  }>;
  bonusDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

interface ScenarioExportProps {
  scenarioName: string;
  employees: EmployeeData[];
  currentSummary: CalculationSummary;
  originalSummary?: CalculationSummary;
  currentParameters: BatchParameters;
  originalParameters?: BatchParameters;
  onExportComplete?: (format: string, filename: string) => void;
}

type ExportFormat = 'csv' | 'json' | 'summary-pdf' | 'detailed-csv';

interface ExportOption {
  format: ExportFormat;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const ScenarioExport: React.FC<ScenarioExportProps> = ({
  scenarioName,
  employees,
  currentSummary,
  originalSummary,
  currentParameters,
  originalParameters,
  onExportComplete
}) => {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [lastExport, setLastExport] = useState<{ format: string; filename: string; time: Date } | null>(null);

  const exportOptions: ExportOption[] = [
    {
      format: 'csv',
      title: 'Basic CSV Export',
      description: 'Employee data with calculated bonuses in CSV format',
      icon: '📊',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      format: 'detailed-csv',
      title: 'Detailed CSV Export',
      description: 'Complete employee data with all calculation details',
      icon: '📋',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      format: 'json',
      title: 'JSON Export',
      description: 'Complete scenario data in JSON format for integration',
      icon: '🔗',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      format: 'summary-pdf',
      title: 'Summary Report',
      description: 'Executive summary with key metrics and insights',
      icon: '📄',
      color: 'bg-amber-50 border-amber-200 hover:bg-amber-100'
    }
  ];

  // Generate timestamp for filename
  const getTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Clean filename
  const cleanFileName = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  // Download file helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to CSV (basic)
  const exportToCSV = () => {
    const headers = [
      'Employee ID',
      'First Name',
      'Last Name',
      'Department',
      'Position',
      'Base Salary',
      'Calculated Bonus',
      'Bonus Percentage',
      'Total Compensation',
      'Is MRT',
      'Investment Score',
      'Qualitative Score',
      'RAF Value'
    ];

    const rows = employees.map(emp => {
      const calculatedBonus = emp.calculation_result?.finalBonus || 0;
      const salary = emp.employee_data.salary || 0;
      const bonusPercentage = salary > 0 ? (calculatedBonus / salary * 100).toFixed(2) : '0';
      
      return [
        emp.employee_data.employee_id || '',
        emp.employee_data.first_name || '',
        emp.employee_data.last_name || '',
        emp.employee_data.department || '',
        emp.employee_data.position || '',
        salary.toString(),
        calculatedBonus.toFixed(2),
        bonusPercentage,
        (salary + calculatedBonus).toFixed(2),
        emp.employee_data.additional_data?.is_mrt || 'false',
        emp.employee_data.additional_data?.investment_score || '',
        emp.employee_data.additional_data?.qualitative_score || '',
        emp.employee_data.additional_data?.raf || ''
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const timestamp = getTimestamp();
    const filename = `${cleanFileName(scenarioName)}_basic_export_${timestamp}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    
    return filename;
  };

  // Export to detailed CSV
  const exportToDetailedCSV = () => {
    const headers = [
      'Employee ID',
      'First Name',
      'Last Name',
      'Department',
      'Position',
      'Base Salary',
      'Investment Score',
      'Qualitative Score',
      'RAF Value',
      'Is MRT',
      'Target Bonus %',
      'Investment Weight',
      'Qualitative Weight',
      'Investment Component',
      'Qualitative Component',
      'Combined Score',
      'RAF Adjusted Score',
      'Calculated Bonus',
      'Cap Applied',
      'Final Bonus',
      'Bonus Percentage',
      'Total Compensation'
    ];

    const rows = employees.map(emp => {
      const result = emp.calculation_result || {};
      const salary = emp.employee_data.salary || 0;
      
      return [
        emp.employee_data.employee_id || '',
        emp.employee_data.first_name || '',
        emp.employee_data.last_name || '',
        emp.employee_data.department || '',
        emp.employee_data.position || '',
        salary.toString(),
        emp.employee_data.additional_data?.investment_score || '',
        emp.employee_data.additional_data?.qualitative_score || '',
        emp.employee_data.additional_data?.raf || '',
        emp.employee_data.additional_data?.is_mrt || 'false',
        currentParameters.targetBonusPct.toString(),
        currentParameters.investmentWeight.toString(),
        currentParameters.qualitativeWeight.toString(),
        (result.investmentComponent || 0).toFixed(4),
        (result.qualitativeComponent || 0).toFixed(4),
        (result.combinedScore || 0).toFixed(4),
        (result.rafAdjustedScore || 0).toFixed(4),
        (result.calculatedBonus || 0).toFixed(2),
        result.capApplied ? 'Yes' : 'No',
        (result.finalBonus || 0).toFixed(2),
        salary > 0 ? ((result.finalBonus || 0) / salary * 100).toFixed(2) : '0',
        (salary + (result.finalBonus || 0)).toFixed(2)
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const timestamp = getTimestamp();
    const filename = `${cleanFileName(scenarioName)}_detailed_export_${timestamp}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    
    return filename;
  };

  // Export to JSON
  const exportToJSON = () => {
    const exportData = {
      scenario: {
        name: scenarioName,
        exportDate: new Date().toISOString(),
        version: '1.0'
      },
      parameters: {
        current: currentParameters,
        original: originalParameters
      },
      summary: {
        current: currentSummary,
        original: originalSummary
      },
      employees: employees.map(emp => ({
        employeeData: emp.employee_data,
        calculationResult: emp.calculation_result,
        batchUploadId: emp.batch_upload_id
      })),
      metadata: {
        totalEmployees: employees.length,
        exportedFields: [
          'employee_id', 'first_name', 'last_name', 'department', 
          'position', 'salary', 'calculated_bonus', 'total_compensation'
        ]
      }
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const timestamp = getTimestamp();
    const filename = `${cleanFileName(scenarioName)}_complete_export_${timestamp}.json`;
    downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
    
    return filename;
  };

  // Export summary report (text-based, simulating PDF)
  const exportSummaryReport = () => {
    const changes = originalSummary ? {
      bonusPoolChange: currentSummary.totalBonusPool - originalSummary.totalBonusPool,
      avgBonusChange: currentSummary.avgBonusAmount - originalSummary.avgBonusAmount,
      cappedEmployeesChange: currentSummary.cappedEmployees - originalSummary.cappedEmployees
    } : null;

    const reportContent = `
SCENARIO SUMMARY REPORT
=======================

Scenario Name: ${scenarioName}
Generated: ${new Date().toLocaleString()}

EXECUTIVE SUMMARY
-----------------
Total Employees: ${currentSummary.totalEmployees.toLocaleString()}
Total Bonus Pool: £${currentSummary.totalBonusPool.toLocaleString()}
Average Bonus: £${currentSummary.avgBonusAmount.toLocaleString()}
Average Bonus %: ${currentSummary.avgBonusPercentage.toFixed(1)}%
Median Bonus: £${currentSummary.medianBonusAmount.toLocaleString()}

RISK METRICS
------------
Capped Employees: ${currentSummary.cappedEmployees} (${(currentSummary.cappedEmployees / currentSummary.totalEmployees * 100).toFixed(1)}%)
MRT Employees: ${currentSummary.mrtEmployees} (${(currentSummary.mrtEmployees / currentSummary.totalEmployees * 100).toFixed(1)}%)
MRT Capped: ${currentSummary.mrtCappedEmployees} (${currentSummary.mrtEmployees > 0 ? (currentSummary.mrtCappedEmployees / currentSummary.mrtEmployees * 100).toFixed(1) : 0}% of MRT)

${changes ? `
CHANGES FROM ORIGINAL
--------------------
Bonus Pool Change: ${changes.bonusPoolChange >= 0 ? '+' : ''}£${Math.abs(changes.bonusPoolChange).toLocaleString()}
Average Bonus Change: ${changes.avgBonusChange >= 0 ? '+' : ''}£${Math.abs(changes.avgBonusChange).toLocaleString()}
Capped Employees Change: ${changes.cappedEmployeesChange >= 0 ? '+' : ''}${changes.cappedEmployeesChange}
` : ''}

CURRENT PARAMETERS
------------------
Target Bonus %: ${currentParameters.targetBonusPct}%
Investment Weight: ${currentParameters.investmentWeight}
Qualitative Weight: ${currentParameters.qualitativeWeight}
Investment Score Multiplier: ${currentParameters.investmentScoreMultiplier || 1}
Qualitative Score Multiplier: ${currentParameters.qualScoreMultiplier || 1}
RAF: ${currentParameters.raf}
MRT Cap %: ${currentParameters.mrtCapPct}%

BONUS DISTRIBUTION
------------------
${currentSummary.bonusDistribution.map(range => 
  `${range.range}: ${range.count} employees (${range.percentage.toFixed(1)}%)`
).join('\n')}

TOP DEPARTMENTS BY BONUS POOL
------------------------------
${Object.entries(currentSummary.departmentBreakdown)
  .sort((a, b) => b[1].totalBonus - a[1].totalBonus)
  .slice(0, 10)
  .map(([dept, data], index) => 
    `${index + 1}. ${dept}: £${data.totalBonus.toLocaleString()} (${data.count} employees, avg: £${data.avgBonus.toLocaleString()})`
  ).join('\n')}

PERFORMANCE INDICATORS
----------------------
Pool Utilization Rate: ${((currentSummary.totalBonusPool / currentSummary.totalEmployees / 50000) * 100).toFixed(1)}% (assuming £50k avg salary)
Meaningful Bonus Rate: ${(currentSummary.bonusDistribution.filter(r => r.range !== '£0 - £10k').reduce((sum, r) => sum + r.count, 0) / currentSummary.totalEmployees * 100).toFixed(1)}% (above £10k)
Departments Covered: ${Object.keys(currentSummary.departmentBreakdown).length}
Uncapped Rate: ${(100 - (currentSummary.cappedEmployees / currentSummary.totalEmployees * 100)).toFixed(1)}%

Report generated by Bonus Calculator System
`;

    const timestamp = getTimestamp();
    const filename = `${cleanFileName(scenarioName)}_summary_report_${timestamp}.txt`;
    downloadFile(reportContent, filename, 'text/plain;charset=utf-8;');
    
    return filename;
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    
    try {
      let filename: string;
      
      switch (format) {
        case 'csv':
          filename = exportToCSV();
          break;
        case 'detailed-csv':
          filename = exportToDetailedCSV();
          break;
        case 'json':
          filename = exportToJSON();
          break;
        case 'summary-pdf':
          filename = exportSummaryReport();
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      setLastExport({ format, filename, time: new Date() });
      onExportComplete?.(format, filename);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Export Scenario Data</h2>
        <p className="text-gray-600">
          Download scenario results in various formats for analysis, reporting, or integration.
        </p>
        {lastExport && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span className="text-sm text-green-700">
                Last exported: <strong>{lastExport.filename}</strong> ({lastExport.format}) at {lastExport.time.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <div
            key={option.format}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${option.color} ${
              isExporting === option.format ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !isExporting && handleExport(option.format)}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{option.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {option.description}
                </p>
                
                {/* Format-specific details */}
                <div className="text-xs text-gray-500 space-y-1">
                  {option.format === 'csv' && (
                    <>
                      <div>• Employee data with calculated bonuses</div>
                      <div>• Suitable for Excel or Google Sheets</div>
                      <div>• Contains {employees.length} employee records</div>
                    </>
                  )}
                  {option.format === 'detailed-csv' && (
                    <>
                      <div>• Complete calculation breakdown</div>
                      <div>• All intermediate calculation steps</div>
                      <div>• Parameter values and applied weights</div>
                    </>
                  )}
                  {option.format === 'json' && (
                    <>
                      <div>• Complete scenario data structure</div>
                      <div>• Suitable for API integration</div>
                      <div>• Includes metadata and parameters</div>
                    </>
                  )}
                  {option.format === 'summary-pdf' && (
                    <>
                      <div>• Executive summary format</div>
                      <div>• Key metrics and insights</div>
                      <div>• Comparison with original scenario</div>
                    </>
                  )}
                </div>

                {/* Loading state */}
                {isExporting === option.format && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-blue-600">Generating export...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Export Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-800">{employees.length}</div>
            <div className="text-sm text-gray-600">Employee Records</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-800">{Object.keys(currentSummary.departmentBreakdown).length}</div>
            <div className="text-sm text-gray-600">Departments</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-800">{currentSummary.bonusDistribution.length}</div>
            <div className="text-sm text-gray-600">Bonus Ranges</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-800">4</div>
            <div className="text-sm text-gray-600">Export Formats</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 