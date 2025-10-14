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
          // Use a Map to deduplicate employees by email (same as employeeUniqueId)
          const employeeMap = new Map<string, EmployeeData>();
          const employeeLeaderPairs: {employee: EmployeeData, leaderInfo: {name: string, email: string}}[] = [];
          const errors: string[] = [];

          results.data.forEach((row: any, index: number) => {
            const { employee, leaderInfo } = validateAndProcessRow(row);

            if (employee) {
              // Only add employee if not already in map (prevents duplicates when employee is assigned to multiple leaders)
              if (!employeeMap.has(employee.email)) {
                employeeMap.set(employee.email, employee);
              }

              if (leaderInfo) {
                employeeLeaderPairs.push({ employee, leaderInfo });
              }
            } else {
              errors.push(`Row ${index + 2}: Missing required employee fields (Name, Email, Title, Business Unit)`);
            }
          });

          // Convert map to array of unique employees
          const validEmployees = Array.from(employeeMap.values());

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
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ 
        border: '2px dashed #0086D6', 
        borderRadius: '8px', 
        padding: '2rem', 
        textAlign: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isProcessing}
          style={{ marginBottom: '1rem' }}
        />
        <p style={{ margin: '0.5rem 0', color: '#666', fontWeight: 'bold' }}>
          Upload CSV with columns: <strong>Name, Email, Title, Business Unit, Audit Leader, Leader Email</strong>
        </p>
        <p style={{ margin: '0', fontSize: '0.9rem', color: '#888' }}>
          Tip: Export from Excel as CSV for best results
        </p>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            onClick={downloadTemplate}
            style={{
              background: '#5EC4B6',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            📥 Download CSV Template
          </button>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
            Get a pre-formatted template with sample data
          </p>
        </div>
      </div>

      {isProcessing && (
        <p style={{ color: '#0086D6', marginTop: '1rem' }}>Processing file...</p>
      )}

      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '0.75rem', 
          borderRadius: '4px',
          marginTop: '1rem'
        }}>
          {error}
        </div>
      )}

      {fileName && !error && uploadSummary && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            padding: '1rem', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
              ✅ Successfully loaded: {fileName}
            </p>
            <p style={{ margin: '0', fontSize: '0.9rem' }}>
              📊 Found: {uploadSummary.employees} employees, {uploadSummary.leaders} audit leaders
            </p>
          </div>
          <button 
            onClick={clearUpload}
            style={{
              background: 'none',
              border: '1px solid #0086D6',
              color: '#0086D6',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Upload Different File
          </button>
        </div>
      )}

      {preview.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ color: '#071D49' }}>Preview (first 5 rows):</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: '0.85rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#071D49', color: 'white' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Business Unit</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Audit Leader</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Leader Email</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>{row['Name'] || row['name'] || ''}</td>
                    <td style={{ padding: '0.5rem' }}>{row['Email'] || row['email'] || ''}</td>
                    <td style={{ padding: '0.5rem' }}>{row['Title'] || row['title'] || ''}</td>
                    <td style={{ padding: '0.5rem' }}>{row['Business Unit'] || row['business_unit'] || ''}</td>
                    <td style={{ padding: '0.5rem' }}>{row['Audit Leader'] || row['audit_leader'] || ''}</td>
                    <td style={{ padding: '0.5rem' }}>{row['Leader Email'] || row['leader_email'] || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length === 5 && (
            <p style={{ marginTop: '0.5rem', color: '#666', fontStyle: 'italic' }}>
              ...and more rows
            </p>
          )}
        </div>
      )}
    </div>
  );
}