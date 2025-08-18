'use client';
import { useState } from 'react';
import Papa from 'papaparse';

interface EmployeeData {
  name: string;
  email: string;
  title: string;
  businessUnit: string;
}

interface AuditLeaderData {
  name: string;
  email: string;
  employees: string[];
}

interface UploadResult {
  employees: EmployeeData[];
  auditLeaders: AuditLeaderData[];
}

interface EmployeeUploadProps {
  onDataUploaded: (result: UploadResult) => void;
}

export default function EmployeeUpload({ onDataUploaded }: EmployeeUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [uploadSummary, setUploadSummary] = useState<{employees: number, leaders: number} | null>(null);

  const validateAndProcessRow = (row: any): {employee: EmployeeData | null, leaderInfo: {name: string, email: string} | null} => {
    // Check for required employee fields (flexible column names)
    const name = row['Name'] || row['Employee Name'] || row['name'] || '';
    const email = row['Email'] || row['Employee Email'] || row['email'] || '';
    const title = row['Title'] || row['Job Title'] || row['title'] || '';
    const businessUnit = row['Business Unit'] || row['Department'] || row['business_unit'] || '';
    
    // Check for audit leader fields
    const leaderName = row['Audit Leader'] || row['Leader Name'] || row['audit_leader'] || '';
    const leaderEmail = row['Leader Email'] || row['Audit Leader Email'] || row['leader_email'] || '';

    let employee: EmployeeData | null = null;
    let leaderInfo: {name: string, email: string} | null = null;

    // Validate employee data
    if (name.trim() && email.trim() && title.trim() && businessUnit.trim()) {
      employee = {
        name: name.trim(),
        email: email.trim(),
        title: title.trim(),
        businessUnit: businessUnit.trim()
      };
    }

    // Validate leader data
    if (leaderName.trim() && leaderEmail.trim()) {
      leaderInfo = {
        name: leaderName.trim(),
        email: leaderEmail.trim()
      };
    }

    return { employee, leaderInfo };
  };

  const processLeaderAssignments = (data: {employee: EmployeeData, leaderInfo: {name: string, email: string}}[]): AuditLeaderData[] => {
    const leaderMap = new Map<string, AuditLeaderData>();

    data.forEach(({ employee, leaderInfo }) => {
      const leaderKey = `${leaderInfo.name}|${leaderInfo.email}`;
      
      if (leaderMap.has(leaderKey)) {
        // Add employee to existing leader
        leaderMap.get(leaderKey)!.employees.push(employee.name);
      } else {
        // Create new leader
        leaderMap.set(leaderKey, {
          name: leaderInfo.name,
          email: leaderInfo.email,
          employees: [employee.name]
        });
      }
    });

    return Array.from(leaderMap.values());
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setError('');
    setFileName(file.name);
    setUploadSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const validEmployees: EmployeeData[] = [];
          const employeeLeaderPairs: {employee: EmployeeData, leaderInfo: {name: string, email: string}}[] = [];
          const errors: string[] = [];

          results.data.forEach((row: any, index: number) => {
            const { employee, leaderInfo } = validateAndProcessRow(row);
            
            if (employee) {
              validEmployees.push(employee);
              
              if (leaderInfo) {
                employeeLeaderPairs.push({ employee, leaderInfo });
              }
            } else {
              errors.push(`Row ${index + 2}: Missing required employee fields (Name, Email, Title, Business Unit)`);
            }
          });

          if (validEmployees.length === 0) {
            setError('No valid employee records found. Please check your CSV format.');
            setIsProcessing(false);
            return;
          }

          // Process audit leaders
          const auditLeaders = processLeaderAssignments(employeeLeaderPairs);

          if (errors.length > 0 && errors.length < 10) {
            console.warn('Some rows had errors:', errors);
          }

          // Show preview of first 5 rows
          setPreview(results.data.slice(0, 5));
          setUploadSummary({
            employees: validEmployees.length,
            leaders: auditLeaders.length
          });

          // Send data back to parent component
          onDataUploaded({
            employees: validEmployees,
            auditLeaders: auditLeaders
          });

        } catch (err) {
          setError('Error processing file. Please check the format.');
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        setError(`File parsing error: ${error.message}`);
        setIsProcessing(false);
      }
    });
  };

  const clearUpload = () => {
    setPreview([]);
    setFileName('');
    setError('');
    setUploadSummary(null);
  };

  const downloadTemplate = () => {
    // Sample data for the CSV template
    const templateData = [
      ['Name', 'Email', 'Title', 'Business Unit', 'Audit Leader', 'Leader Email'],
      ['John Smith', 'john.smith@company.com', 'Senior Manager', 'Operations', 'Sarah Johnson', 'sarah.johnson@company.com'],
      ['Jane Doe', 'jane.doe@company.com', 'Director', 'Marketing', 'Sarah Johnson', 'sarah.johnson@company.com'],
      ['Mike Wilson', 'mike.wilson@company.com', 'VP Sales', 'Sales', 'Tom Brown', 'tom.brown@company.com'],
      ['Lisa Chen', 'lisa.chen@company.com', 'Manager', 'Finance', 'Tom Brown', 'tom.brown@company.com'],
      ['Alex Rodriguez', 'alex.rodriguez@company.com', 'Analyst', 'Operations', 'Sarah Johnson', 'sarah.johnson@company.com']
    ];

    // Convert to CSV format
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'pipeline_audit_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mb-8">
      <div className="border-2 border-dashed border-blue-500 rounded-lg p-4 sm:p-6 lg:p-8 text-center bg-gray-50">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isProcessing}
          className="mb-4 text-sm sm:text-base"
        />
        <p className="text-xs sm:text-sm font-bold text-gray-700 mb-2">
          Upload CSV with columns: <span className="text-blue-600">Name, Email, Title, Business Unit, Audit Leader, Leader Email</span>
        </p>
        <p className="text-xs text-gray-600 mb-4">
          Tip: Export from Excel as CSV for best results
        </p>
        <div className="mt-4">
          <button
            onClick={downloadTemplate}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm sm:text-base shadow-md"
            style={{ background: '#5EC4B6' }}
          >
            📥 Download CSV Template
          </button>
          <p className="mt-2 text-xs text-gray-600">
            Get a pre-formatted template with sample data
          </p>
        </div>
      </div>

      {isProcessing && (
        <p className="text-blue-600 mt-4 text-sm sm:text-base">Processing file...</p>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mt-4 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {fileName && !error && uploadSummary && (
        <div className="mt-4">
          <div className="bg-green-100 text-green-800 p-3 sm:p-4 rounded-md mb-4">
            <p className="font-bold mb-2 text-sm sm:text-base">
              ✅ Successfully loaded: {fileName}
            </p>
            <p className="text-xs sm:text-sm">
              📊 Found: {uploadSummary.employees} employees, {uploadSummary.leaders} audit leaders
            </p>
          </div>
          <button 
            onClick={clearUpload}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-sm sm:text-base"
          >
            Upload Different File
          </button>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Preview (first 5 rows):</h4>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
              <table className="w-full border-collapse bg-white rounded shadow-sm text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-left hidden sm:table-cell">Business Unit</th>
                    <th className="p-2 text-left hidden md:table-cell">Audit Leader</th>
                    <th className="p-2 text-left hidden lg:table-cell">Leader Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2">{row['Name'] || row['name'] || ''}</td>
                      <td className="p-2 text-xs">{row['Email'] || row['email'] || ''}</td>
                      <td className="p-2">{row['Title'] || row['title'] || ''}</td>
                      <td className="p-2 hidden sm:table-cell">{row['Business Unit'] || row['business_unit'] || ''}</td>
                      <td className="p-2 hidden md:table-cell">{row['Audit Leader'] || row['audit_leader'] || ''}</td>
                      <td className="p-2 hidden lg:table-cell text-xs">{row['Leader Email'] || row['leader_email'] || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {preview.length === 5 && (
            <p className="mt-2 text-xs sm:text-sm text-gray-600 italic">
              ...and more rows
            </p>
          )}
        </div>
      )}
    </div>
  );
}