import React, { useState, useEffect } from 'react';
import { DataTransferService } from '../../services/individualCalculatorService';
import { EmployeeData } from '../../types/employeeTypes';

interface EmployeeSelectorProps {
  batchResultId: string;
  onEmployeeSelect: (employeeData: EmployeeData) => void;
  batchName?: string; // Optional batch name for display purposes
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({ 
  batchResultId, 
  onEmployeeSelect,
  batchName
}) => {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await DataTransferService.getEmployeesFromBatchResult(batchResultId);
        
        if (result.success) {
          setEmployees(result.data || []);
        } else {
          setError(result.message || 'Failed to fetch employees');
        }
      } catch (err: any) {
        console.error('Error fetching employees:', err);
        setError(err.message || 'An error occurred while fetching employees');
      } finally {
        setLoading(false);
      }
    };
    
    if (batchResultId) {
      fetchEmployees();
    }
  }, [batchResultId]);
  
  const filteredEmployees = employees.filter(emp => 
    (emp.employee_data?.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.employee_data?.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.employee_data?.employee_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.employee_data?.department?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Select Employee</h2>
        {batchName && (
          <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            Batch: {batchName}
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, ID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {filteredEmployees.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No employees found matching your search criteria.</p>
          ) : (
            <table className="min-w-full border border-gray-200 shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-gray-700 font-semibold">ID</th>
                  <th className="p-3 text-left text-gray-700 font-semibold">Name</th>
                  <th className="p-3 text-left text-gray-700 font-semibold">Department</th>
                  <th className="p-3 text-left text-gray-700 font-semibold">Base Salary</th>
                  <th className="p-3 text-left text-gray-700 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, index) => (
                  <tr key={emp.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                    <td className="p-3 text-gray-800">{emp.employee_data?.employee_id || 'N/A'}</td>
                    <td className="p-3 text-gray-800">
                      {emp.employee_data?.first_name || ''} {emp.employee_data?.last_name || ''}
                    </td>
                    <td className="p-3 text-gray-800">{emp.employee_data?.department || 'N/A'}</td>
                    <td className="p-3 text-gray-800">
                      {emp.employee_data?.salary 
                        ? `£${emp.employee_data.salary.toLocaleString()}`
                        : 'N/A'
                      }
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => onEmployeeSelect(emp)}
                        className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition-colors"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeSelector;
