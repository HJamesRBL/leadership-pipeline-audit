'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import EmployeeUpload from '../../components/EmployeeUpload'

interface Employee {
  name: string
  email: string
  title: string
  businessUnit: string
}

interface AuditLeader {
  name: string
  email: string
  employees: string[] // employee names they'll rate
}

interface AuditLink {
  name: string
  email: string
  link: string
  token: string
  employees: string[]
}

interface PreviousAudit {
  id: string
  name: string
  auditRound: number
  createdAt: string
  organizationName?: string
  organizationId?: string
  company?: string
}

export default function CreateAuditPage() {
  const [auditName, setAuditName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isNewOrganization, setIsNewOrganization] = useState(true)
  const [selectedPreviousAudit, setSelectedPreviousAudit] = useState<string>('')
  const [previousAudits, setPreviousAudits] = useState<PreviousAudit[]>([])
  const [auditRound, setAuditRound] = useState(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [auditLeaders, setAuditLeaders] = useState<AuditLeader[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<Employee>({
    name: '',
    email: '',
    title: '',
    businessUnit: ''
  })
  const [currentLeader, setCurrentLeader] = useState<AuditLeader>({
    name: '',
    email: '',
    employees: []
  })
  const [message, setMessage] = useState('')
  const [auditLinks, setAuditLinks] = useState<AuditLink[]>([])
  const [uploadMode, setUploadMode] = useState<'manual' | 'upload'>('manual')
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailResults, setEmailResults] = useState<any>(null)

  // Fetch previous audits when component mounts
  useEffect(() => {
    fetchPreviousAudits()
  }, [])

  // When a previous audit is selected, fetch its details
  useEffect(() => {
    if (selectedPreviousAudit && previousAudits.length > 0) {
      const audit = previousAudits.find(a => a.id === selectedPreviousAudit)
      if (audit) {
        setAuditRound(audit.auditRound + 1)
        // Auto-fill suggested audit name
        const suggestedName = `${organizationName} - Round ${audit.auditRound + 1} (${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`
        if (!auditName) {
          setAuditName(suggestedName)
        }
      }
    }
  }, [selectedPreviousAudit, previousAudits, organizationName])

  const fetchPreviousAudits = async () => {
    try {
      const response = await fetch('/api/audit/list')
      if (response.ok) {
        const data = await response.json()
        // Group by organization for easy filtering
        setPreviousAudits(data.map((audit: any) => ({
          id: audit.id,
          name: audit.name,
          auditRound: audit.auditRound || 1,
          createdAt: audit.createdAt,
          organizationName: audit.organizationName || audit.company
        })))
      }
    } catch (error) {
      console.error('Error fetching previous audits:', error)
    }
  }

  const handleOrganizationChange = (orgName: string) => {
    setOrganizationName(orgName)
    // Filter previous audits for this organization
    const orgAudits = previousAudits.filter(a => {
      const audOrgName = a.organizationName || a.company || ''
      return audOrgName.toLowerCase() === orgName.toLowerCase()
    })
    if (orgAudits.length > 0) {
      setIsNewOrganization(false)
      // Auto-select the most recent audit
      const mostRecent = orgAudits.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
      setSelectedPreviousAudit(mostRecent.id)
    } else {
      setIsNewOrganization(true)
      setSelectedPreviousAudit('')
      setAuditRound(1)
    }
  }

  const addEmployee = () => {
    if (currentEmployee.name && currentEmployee.email && currentEmployee.title && currentEmployee.businessUnit) {
      setEmployees([...employees, currentEmployee])
      setCurrentEmployee({ name: '', email: '', title: '', businessUnit: '' })
    }
  }

  const handleDataUploaded = (result: {employees: Employee[], auditLeaders: AuditLeader[]}) => {
    // Add employees with the organization's company name
    const employeesWithCompany = result.employees.map(emp => ({
      ...emp,
      company: organizationName || 'Unspecified'
    }))
    setEmployees([...employees, ...employeesWithCompany])
    
    // Add audit leaders (merge with existing ones, avoiding duplicates)
    const existingLeaderEmails = new Set(auditLeaders.map(leader => leader.email))
    const newLeaders = result.auditLeaders.filter(leader => !existingLeaderEmails.has(leader.email))
    
    // For existing leaders, merge their employee assignments
    const updatedLeaders = auditLeaders.map(existingLeader => {
      const matchingNewLeader = result.auditLeaders.find(newLeader => newLeader.email === existingLeader.email)
      if (matchingNewLeader) {
        return {
          ...existingLeader,
          employees: Array.from(new Set([...existingLeader.employees, ...matchingNewLeader.employees]))
        }
      }
      return existingLeader
    })
    
    setAuditLeaders([...updatedLeaders, ...newLeaders])
    
    setMessage(`Successfully added ${result.employees.length} employees and ${result.auditLeaders.length} audit leaders from CSV`)
  }

  const addLeader = () => {
    if (currentLeader.name && currentLeader.email && currentLeader.employees.length > 0) {
      setAuditLeaders([...auditLeaders, currentLeader])
      setCurrentLeader({ name: '', email: '', employees: [] })
    }
  }

  const toggleEmployeeForLeader = (employeeName: string) => {
    if (currentLeader.employees.includes(employeeName)) {
      setCurrentLeader({
        ...currentLeader,
        employees: currentLeader.employees.filter(e => e !== employeeName)
      })
    } else {
      setCurrentLeader({
        ...currentLeader,
        employees: [...currentLeader.employees, employeeName]
      })
    }
  }

  const createAudit = async () => {
    if (!auditName || !organizationName || employees.length === 0 || auditLeaders.length === 0) {
      setMessage('Please fill in all required fields')
      return
    }

    try {
      // Generate a unique organization ID if this is a new organization
      const orgId = isNewOrganization ? uuidv4() : 
        previousAudits.find(a => a.id === selectedPreviousAudit)?.organizationId || uuidv4()

      const response = await fetch('/api/audit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: auditName,
          organizationId: orgId,
          organizationName: organizationName,
          auditRound: auditRound,
          previousAuditId: isNewOrganization ? null : selectedPreviousAudit,
          employees: employees.map(emp => ({
            ...emp,
            company: organizationName, // Add the organization name as company
            employeeUniqueId: emp.email // Use email as the unique identifier
          })),
          auditLeaders
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage('Audit created successfully!')
        setAuditLinks(data.links)
        setCurrentAuditId(data.auditId)
        // Reset form
        setAuditName('')
        setOrganizationName('')
        setEmployees([])
        setAuditLeaders([])
        setIsNewOrganization(true)
        setSelectedPreviousAudit('')
        setAuditRound(1)
      } else {
        setMessage('Error creating audit')
      }
    } catch (error) {
      setMessage('Error: ' + error)
    }
  }

  const sendInvitations = async () => {
    if (!currentAuditId || auditLinks.length === 0) {
      setMessage('No audit links available to send')
      return
    }

    setEmailStatus('sending')
    setEmailResults(null)

    try {
      const response = await fetch('/api/email/send-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: currentAuditId,
          auditName: auditLinks[0]?.name || 'Pipeline Audit',
          auditLeaders: auditLinks.map(link => ({
            name: link.name,
            email: link.email,
            employees: link.employees,
            token: link.token
          }))
        })
      })

      const result = await response.json()

      if (response.ok) {
        setEmailStatus('sent')
        setEmailResults(result)
        setMessage(`✅ Invitations sent! ${result.summary.sent} successful, ${result.summary.failed} failed`)
      } else {
        setEmailStatus('error')
        setMessage(`❌ Error sending invitations: ${result.error}`)
      }
    } catch (error) {
      setEmailStatus('error')
      setMessage(`❌ Error sending invitations: ${error}`)
    }
  }

  const resetAuditCreation = () => {
    setAuditLinks([])
    setCurrentAuditId(null)
    setEmailStatus('idle')
    setEmailResults(null)
    setMessage('')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* RBL Brand Message */}
      <div className="brand-message p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-white">
          Welcome to The RBL Group Pipeline Audit System
        </h2>
        <p className="text-sm sm:text-base lg:text-lg text-white">
          Identify leadership misalignments and accelerate development
        </p>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Create New Pipeline Audit</h1>
      
      {/* Step 1: Organization & Audit Information */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">1. Organization & Audit Information</h2>
        </div>
        
        {/* Organization Name */}
        <div className="mb-4">
          <label htmlFor="organizationName" className="text-sm sm:text-base">Organization/Company Name *</label>
          <input
            type="text"
            id="organizationName"
            value={organizationName}
            onChange={(e) => handleOrganizationChange(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
            placeholder="Enter organization name (e.g., RBL Group)"
          />
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            This helps track audits across multiple rounds for the same organization
          </p>
        </div>

        {/* Previous Audit Selection (if organization has previous audits) */}
        {!isNewOrganization && previousAudits.filter(a => {
          const audOrgName = a.organizationName || a.company || ''
          return audOrgName.toLowerCase() === organizationName.toLowerCase()
        }).length > 0 && (
          <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label htmlFor="previousAudit" className="text-blue-900 font-medium text-sm sm:text-base">
              Previous Audit (Round {auditRound - 1})
            </label>
            <select
              id="previousAudit"
              value={selectedPreviousAudit}
              onChange={(e) => setSelectedPreviousAudit(e.target.value)}
              className="w-full mt-2 p-2 border rounded text-sm sm:text-base"
            >
              <option value="">Select previous audit for comparison</option>
              {previousAudits
                .filter(a => {
                  const audOrgName = a.organizationName || a.company || ''
                  return audOrgName.toLowerCase() === organizationName.toLowerCase()
                })
                .map(audit => (
                  <option key={audit.id} value={audit.id}>
                    {audit.name} (Round {audit.auditRound}) - {new Date(audit.createdAt).toLocaleDateString()}
                  </option>
                ))}
            </select>
            <p className="text-xs sm:text-sm text-blue-700 mt-2">
              ✨ This is Round {auditRound} for {organizationName}. Results can be compared with previous rounds.
            </p>
          </div>
        )}

        {/* New Organization Message */}
        {isNewOrganization && organizationName && (
          <div className="mb-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium text-sm sm:text-base">
              ✅ This is the first audit for {organizationName} (Round 1)
            </p>
          </div>
        )}

        {/* Audit Name */}
        <div className="mb-4">
          <label htmlFor="auditName" className="text-sm sm:text-base">Audit Name *</label>
          <input
            type="text"
            id="auditName"
            value={auditName}
            onChange={(e) => setAuditName(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
            placeholder={`${organizationName ? organizationName + ' - ' : ''}Q1 2024 Leadership Audit`}
          />
        </div>

        {/* Audit Round Display */}
        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm font-medium text-gray-700">Audit Round:</span>
          <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-xs sm:text-sm">
            Round {auditRound}
          </span>
        </div>
      </div>

      {/* Step 2: Add Employees & Leaders */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-lg sm:text-xl font-semibold">2. Add Employees & Audit Leaders</h2>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
            {employees.length} employees, {auditLeaders.length} leaders
          </span>
        </div>

        {/* Toggle between manual and upload */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setUploadMode('manual')}
              className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base ${
                uploadMode === 'manual' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={uploadMode === 'manual' ? { background: '#0086D6' } : {}}
            >
              ✋ Add Manually
            </button>
            <button
              onClick={() => setUploadMode('upload')}
              className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base ${
                uploadMode === 'upload' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={uploadMode === 'upload' ? { background: '#0086D6' } : {}}
            >
              📄 Upload CSV
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            {uploadMode === 'manual' 
              ? 'Add employees and leaders one by one using the forms below' 
              : 'Upload a CSV file with employees AND their assigned audit leaders (includes company information)'
            }
          </p>
        </div>

        {uploadMode === 'upload' ? (
          <EmployeeUpload onDataUploaded={handleDataUploaded} />
        ) : (
          <div className="space-y-6">
            {/* Manual Employee Entry */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-700">Add Employee</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label htmlFor="empName" className="text-sm">Name</label>
                  <input
                    type="text"
                    id="empName"
                    value={currentEmployee.name}
                    onChange={(e) => setCurrentEmployee({...currentEmployee, name: e.target.value})}
                    placeholder="John Smith"
                    className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="empEmail" className="text-sm">Email</label>
                  <input
                    type="email"
                    id="empEmail"
                    value={currentEmployee.email}
                    onChange={(e) => setCurrentEmployee({...currentEmployee, email: e.target.value})}
                    placeholder="john.smith@company.com"
                    className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label htmlFor="empTitle" className="text-sm">Title</label>
                  <input
                    type="text"
                    id="empTitle"
                    value={currentEmployee.title}
                    onChange={(e) => setCurrentEmployee({...currentEmployee, title: e.target.value})}
                    placeholder="Senior Manager"
                    className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="empUnit" className="text-sm">Business Unit</label>
                  <input
                    type="text"
                    id="empUnit"
                    value={currentEmployee.businessUnit}
                    onChange={(e) => setCurrentEmployee({...currentEmployee, businessUnit: e.target.value})}
                    placeholder="Operations"
                    className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <button
                onClick={addEmployee}
                className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm sm:text-base"
                style={{ background: '#0086D6' }}
              >
                + Add Employee
              </button>
            </div>

            {/* Manual Leader Entry */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-700">Add Audit Leader</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label htmlFor="leaderName" className="text-sm">Leader Name</label>
                  <input
                    type="text"
                    id="leaderName"
                    value={currentLeader.name}
                    onChange={(e) => setCurrentLeader({...currentLeader, name: e.target.value})}
                    placeholder="Jane Doe"
                    className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="leaderEmail" className="text-sm">Leader Email</label>
                  <input
                    type="email"
                    id="leaderEmail"
                    value={currentLeader.email}
                    onChange={(e) => setCurrentLeader({...currentLeader, email: e.target.value})}
                    placeholder="jane.doe@company.com"
                    className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
                  />
                </div>
              </div>
              
              {employees.length > 0 && (
                <div className="mb-4">
                  <label className="block mb-2 text-sm">Select employees for this leader to rate:</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
                    {employees.map((emp, idx) => (
                      <label key={idx} className="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentLeader.employees.includes(emp.name)}
                          onChange={() => toggleEmployeeForLeader(emp.name)}
                          className="min-w-[16px]"
                        />
                        <span className="text-xs sm:text-sm">{emp.name} - {emp.title}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-2">
                    ✓ Selected: {currentLeader.employees.length} employee{currentLeader.employees.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              <button
                onClick={addLeader}
                className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm sm:text-base"
                style={{ background: '#5EC4B6' }}
              >
                + Add Audit Leader
              </button>
            </div>
          </div>
        )}
        
        {/* List of added employees */}
        {employees.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3 text-gray-700 text-sm sm:text-base">Employees to be Rated:</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {employees.map((emp, idx) => (
                <div key={idx} className="flex items-center p-2 sm:p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="font-semibold text-blue-600 mr-2 sm:mr-3 text-sm">#{idx + 1}</span>
                  <div className="flex-1 text-xs sm:text-sm">
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-gray-500 ml-2">• {emp.title}</span>
                    <span className="text-gray-500 ml-2 hidden sm:inline">• {emp.businessUnit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List of added leaders */}
        {auditLeaders.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3 text-gray-700 text-sm sm:text-base">Assigned Audit Leaders:</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {auditLeaders.map((leader, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center p-2 sm:p-3 bg-gray-50 rounded border border-gray-200 gap-2">
                  <span className="font-semibold text-green-600 mr-2 sm:mr-3 text-sm">#{idx + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium text-xs sm:text-sm">{leader.name}</span>
                    <span className="text-gray-500 ml-2 text-xs sm:text-sm">• {leader.email}</span>
                    <span className="ml-0 sm:ml-2 mt-1 sm:mt-0 inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      Rating {leader.employees.length} employee{leader.employees.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Audit Button */}
      <button
        onClick={createAudit}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-base sm:text-lg"
        style={{ 
          background: 'linear-gradient(135deg, #071D49 0%, #0086D6 100%)',
          boxShadow: '0 4px 12px rgba(7, 29, 73, 0.2)'
        }}
      >
        Create Audit and Generate Links
      </button>

      {/* Messages */}
      {message && (
        <div className={`mt-6 p-3 sm:p-4 rounded-lg ${
          message.includes('Error') || message.includes('❌')
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-800 border border-green-200'
        }`}>
          <div className="flex items-center">
            <span className="text-lg sm:text-xl mr-2">{message.includes('Error') || message.includes('❌') ? '⚠️' : '✅'}</span>
            <span className="font-medium text-sm sm:text-base">{message}</span>
          </div>
        </div>
      )}

      {/* Generated Links with Email Functionality */}
      {auditLinks.length > 0 && (
        <div className="mt-6 p-4 sm:p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h3 className="font-bold text-base sm:text-lg mb-4 text-blue-900">
            🎉 Success! Audit Leader Links Generated
          </h3>
          
          {/* Email Actions */}
          <div className="mb-6 p-3 sm:p-4 bg-white rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-3 text-gray-800 text-sm sm:text-base">📧 Email Actions</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={sendInvitations}
                disabled={emailStatus === 'sending'}
                className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                style={{ 
                  background: emailStatus === 'sending' ? '#6b7280' : '#059669',
                }}
              >
                {emailStatus === 'sending' ? '📤 Sending...' : '📧 Send Email Invitations'}
              </button>
              
              <button
                onClick={resetAuditCreation}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm sm:text-base"
              >
                🔄 Create Another Audit
              </button>
            </div>
            
            {emailStatus === 'sent' && emailResults && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-medium text-sm">
                  ✅ Email Summary: {emailResults.summary.sent} sent successfully, {emailResults.summary.failed} failed
                </p>
                {emailResults.summary.failed > 0 && (
                  <p className="text-orange-700 text-xs sm:text-sm mt-1">
                    Check the console for failed email details
                  </p>
                )}
              </div>
            )}
            
            {emailStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-medium text-sm">❌ Failed to send some or all emails</p>
              </div>
            )}
          </div>
          
          <p className="text-xs sm:text-sm text-gray-700 mb-4">
            {emailStatus === 'sent' 
              ? 'Invitations sent! You can also copy these secure links manually if needed:'
              : 'You can send email invitations or copy these secure links to send manually:'
            }
          </p>
          <div className="space-y-3">
            {auditLinks.map((link, idx) => (
              <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                <div className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">
                  {link.name} ({link.email})
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={link.link} 
                    className="text-blue-600 underline text-xs sm:text-sm break-all hover:text-blue-800" 
                    target="_blank"
                  >
                    {link.link}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}