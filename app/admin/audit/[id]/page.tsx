'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Employee {
  id?: string
  name: string
  title: string
  businessUnit: string
  company: string
}

interface AuditLeader {
  id?: string
  name: string
  email: string
  token?: string
  completed?: boolean
  assignedEmployees: string[]
}

interface AuditDetails {
  id: string
  name: string
  createdAt: string
  employees: Employee[]
  auditLeaders: AuditLeader[]
}

export default function AuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const auditId = params.id as string

  const [audit, setAudit] = useState<AuditDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [auditLeaders, setAuditLeaders] = useState<AuditLeader[]>([])
  const [deletedLeaderIds, setDeletedLeaderIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  
  // Forms for adding new items
  const [newEmployee, setNewEmployee] = useState<Employee>({
    name: '',
    title: '',
    businessUnit: '',
    company: ''
  })
  const [newLeader, setNewLeader] = useState<AuditLeader>({
    name: '',
    email: '',
    assignedEmployees: []
  })

  useEffect(() => {
    fetchAuditDetails()
  }, [auditId])

  const fetchAuditDetails = async () => {
    try {
      const response = await fetch(`/api/audit/${auditId}`)
      if (response.ok) {
        const data = await response.json()
        setAudit(data)
        setEmployees(data.employees)
        setAuditLeaders(data.auditLeaders)
      } else {
        setMessage('Audit not found')
      }
    } catch (error) {
      setMessage('Error loading audit')
    } finally {
      setLoading(false)
    }
  }

  const saveChanges = async () => {
    try {
      const response = await fetch(`/api/audit/${auditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees,
          auditLeaders,
          deletedLeaderIds
        })
      })

      if (response.ok) {
        setMessage('✅ Changes saved successfully!')
        setEditMode(false)
        setDeletedLeaderIds([])
        fetchAuditDetails() // Refresh data
      } else {
        setMessage('❌ Error saving changes')
      }
    } catch (error) {
      setMessage('❌ Error: ' + error)
    }
  }

  const addEmployee = () => {
    if (newEmployee.name && newEmployee.title && newEmployee.businessUnit && newEmployee.company) {
      setEmployees([...employees, newEmployee])
      setNewEmployee({ name: '', title: '', businessUnit: '', company: '' })
    }
  }

  const removeEmployee = (index: number) => {
    const emp = employees[index]
    setEmployees(employees.filter((_, i) => i !== index))
    // Remove from all leader assignments
    setAuditLeaders(auditLeaders.map(leader => ({
      ...leader,
      assignedEmployees: leader.assignedEmployees.filter(e => e !== emp.name)
    })))
  }

  const addLeader = () => {
    if (newLeader.name && newLeader.email && newLeader.assignedEmployees.length > 0) {
      setAuditLeaders([...auditLeaders, newLeader])
      setNewLeader({ name: '', email: '', assignedEmployees: [] })
    }
  }

  const removeLeader = (index: number) => {
    const leader = auditLeaders[index]
    if (leader.id) {
      setDeletedLeaderIds([...deletedLeaderIds, leader.id])
    }
    setAuditLeaders(auditLeaders.filter((_, i) => i !== index))
  }

  const toggleEmployeeForLeader = (employeeName: string, leaderIndex: number) => {
    const updatedLeaders = [...auditLeaders]
    const leader = updatedLeaders[leaderIndex]
    
    if (leader.assignedEmployees.includes(employeeName)) {
      leader.assignedEmployees = leader.assignedEmployees.filter(e => e !== employeeName)
    } else {
      leader.assignedEmployees = [...leader.assignedEmployees, employeeName]
    }
    
    setAuditLeaders(updatedLeaders)
  }

  const toggleEmployeeForNewLeader = (employeeName: string) => {
    if (newLeader.assignedEmployees.includes(employeeName)) {
      setNewLeader({
        ...newLeader,
        assignedEmployees: newLeader.assignedEmployees.filter(e => e !== employeeName)
      })
    } else {
      setNewLeader({
        ...newLeader,
        assignedEmployees: [...newLeader.assignedEmployees, employeeName]
      })
    }
  }

  const sendReminders = async () => {
    setEmailStatus('sending')
    
    const incompleteLeaders = auditLeaders.filter(leader => !leader.completed)
    
    try {
      const response = await fetch('/api/email/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          auditName: audit?.name || 'Pipeline Audit',
          auditLeaders: incompleteLeaders.map(leader => ({
            name: leader.name,
            email: leader.email,
            employees: leader.assignedEmployees,
            token: leader.token
          }))
        })
      })

      const result = await response.json()

      if (response.ok) {
        setEmailStatus('sent')
        setMessage(`✅ Reminders sent to ${incompleteLeaders.length} incomplete audit leaders`)
      } else {
        setEmailStatus('error')
        setMessage(`❌ Error sending reminders: ${result.error}`)
      }
    } catch (error) {
      setEmailStatus('error')
      setMessage(`❌ Error sending reminders: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="text-xl text-gray-600">Loading audit details...</div>
        </div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="text-xl text-red-600">Audit not found</div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{audit.name}</h1>
            <p className="text-gray-600">
              Created on {new Date(audit.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex gap-3">
            {!editMode ? (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                  style={{ background: '#0086D6' }}
                >
                  ✏️ Edit Audit
                </button>
                <button
                  onClick={() => router.push(`/results?auditId=${auditId}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                >
                  📊 View Results
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
                >
                  ← Back to Dashboard
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveChanges}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setEmployees(audit.employees)
                    setAuditLeaders(audit.auditLeaders)
                    setDeletedLeaderIds([])
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('Error') || message.includes('❌')
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-800 border border-green-200'
        }`}>
          <div className="flex items-center">
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Employees</div>
          <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Audit Leaders</div>
          <div className="text-2xl font-bold text-green-600">{auditLeaders.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Completion Rate</div>
          <div className="text-2xl font-bold text-purple-600">
            {auditLeaders.length > 0 
              ? Math.round((auditLeaders.filter(l => l.completed).length / auditLeaders.length) * 100)
              : 0}%
          </div>
        </div>
      </div>

      {/* Employees Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Employees ({employees.length})</h2>
        
        {editMode && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-3">Add New Employee</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
              />
              <input
                type="text"
                placeholder="Title"
                value={newEmployee.title}
                onChange={(e) => setNewEmployee({...newEmployee, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Business Unit"
                value={newEmployee.businessUnit}
                onChange={(e) => setNewEmployee({...newEmployee, businessUnit: e.target.value})}
              />
              <input
                type="text"
                placeholder="Company"
                value={newEmployee.company}
                onChange={(e) => setNewEmployee({...newEmployee, company: e.target.value})}
              />
            </div>
            <button
              onClick={addEmployee}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              style={{ background: '#0086D6' }}
            >
              + Add Employee
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {employees.map((emp, idx) => (
            <div key={idx} className="flex items-center p-3 bg-gray-50 rounded border border-gray-200">
              <span className="font-semibold text-blue-600 mr-3">#{idx + 1}</span>
              <div className="flex-1">
                <span className="font-medium">{emp.name}</span>
                <span className="text-gray-500 ml-2">• {emp.title}</span>
                <span className="text-gray-500 ml-2">• {emp.businessUnit}</span>
                <span className="text-gray-500 ml-2">• {emp.company}</span>
              </div>
              {editMode && (
                <button
                  onClick={() => removeEmployee(idx)}
                  className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit Leaders Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Audit Leaders ({auditLeaders.length})</h2>
          {!editMode && auditLeaders.some(l => !l.completed) && (
            <button
              onClick={sendReminders}
              disabled={emailStatus === 'sending'}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-medium disabled:opacity-50"
            >
              {emailStatus === 'sending' ? '📤 Sending...' : '📧 Send Reminders to Incomplete'}
            </button>
          )}
        </div>

        {editMode && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-3">Add New Audit Leader</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Name"
                value={newLeader.name}
                onChange={(e) => setNewLeader({...newLeader, name: e.target.value})}
              />
              <input
                type="email"
                placeholder="Email"
                value={newLeader.email}
                onChange={(e) => setNewLeader({...newLeader, email: e.target.value})}
              />
            </div>
            {employees.length > 0 && (
              <div className="mb-3">
                <label className="block mb-2 text-sm font-medium">Assign employees to rate:</label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 bg-white">
                  {employees.map((emp, idx) => (
                    <label key={idx} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLeader.assignedEmployees.includes(emp.name)}
                        onChange={() => toggleEmployeeForNewLeader(emp.name)}
                      />
                      <span className="text-sm">{emp.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {newLeader.assignedEmployees.length} employee(s)
                </p>
              </div>
            )}
            <button
              onClick={addLeader}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              style={{ background: '#5EC4B6' }}
            >
              + Add Audit Leader
            </button>
          </div>
        )}

        <div className="space-y-3">
          {auditLeaders.map((leader, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-green-600">#{idx + 1}</span>
                    <span className="font-medium text-lg">{leader.name}</span>
                    <span className="text-gray-500">• {leader.email}</span>
                    {leader.completed ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        ✅ Completed
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        ⏳ Pending
                      </span>
                    )}
                  </div>
                  
                  {!editMode && leader.token && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-600">Link: </span>
                      <a 
                        href={`${baseUrl}/audit/${leader.token}`}
                        className="text-sm text-blue-600 underline hover:text-blue-800"
                        target="_blank"
                      >
                        {`${baseUrl}/audit/${leader.token}`}
                      </a>
                    </div>
                  )}

                  {editMode ? (
                    <div className="mt-2">
                      <label className="text-sm font-medium text-gray-700">Assigned Employees:</label>
                      <div className="mt-1 max-h-32 overflow-y-auto border rounded p-2 bg-white">
                        {employees.map((emp, empIdx) => (
                          <label key={empIdx} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={leader.assignedEmployees.includes(emp.name)}
                              onChange={() => toggleEmployeeForLeader(emp.name, idx)}
                            />
                            <span className="text-sm">{emp.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Rating {leader.assignedEmployees.length} employees: </span>
                      <span className="text-sm">{leader.assignedEmployees.join(', ')}</span>
                    </div>
                  )}
                </div>
                
                {editMode && (
                  <button
                    onClick={() => removeLeader(idx)}
                    className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}