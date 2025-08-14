'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Audit {
  id: string
  name: string
  company: string
  createdAt: string
  employeeCount: number
  leaderCount: number
  completedCount: number
  completionRate: number
}

export default function AdminDashboard() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'company'>('date')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchAudits()
  }, [])

  const fetchAudits = async () => {
  try {
    const response = await fetch('/api/audit/list')
    const data = await response.json()
    // Ensure data is always an array
    setAudits(Array.isArray(data) ? data : [])
    setLoading(false)
  } catch (error) {
    console.error('Error fetching audits:', error)
    setAudits([]) // Set empty array on error
    setLoading(false)
  }
}

  const handleDelete = async (auditId: string) => {
    try {
      const response = await fetch(`/api/audit/delete?id=${auditId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setAudits(audits.filter(a => a.id !== auditId))
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Error deleting audit:', error)
    }
  }

  // Get unique companies for filter
  const companies = Array.from(new Set(audits.map(a => a.company))).filter(c => c !== 'N/A')

  // Filter and sort audits
  let filteredAudits = [...audits]
  
  // Apply search filter
  if (searchTerm) {
    filteredAudits = filteredAudits.filter(audit => 
      audit.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }
  
  // Apply company filter
  if (filterCompany !== 'all') {
    filteredAudits = filteredAudits.filter(audit => audit.company === filterCompany)
  }
  
  // Apply sorting
  filteredAudits.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'company':
        return a.company.localeCompare(b.company)
      case 'date':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCompletionBadge = (rate: number) => {
    if (rate === 100) {
      return 'bg-green-100 text-green-800'
    } else if (rate > 50) {
      return 'bg-yellow-100 text-yellow-800'
    } else if (rate > 0) {
      return 'bg-orange-100 text-orange-800'
    } else {
      return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="text-xl text-gray-600">Loading audits...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pipeline Audit Dashboard</h1>
        <p className="text-gray-600">Manage and monitor all pipeline audits</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => router.push('/create')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            style={{ 
              background: 'linear-gradient(135deg, #071D49 0%, #0086D6 100%)',
              boxShadow: '0 4px 12px rgba(7, 29, 73, 0.2)'
            }}
          >
            + Create New Audit
          </button>
          
          <div className="text-sm text-gray-600">
            Total Audits: <span className="font-semibold text-lg text-blue-600">{audits.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="text-sm">Search by name</label>
            <input
              type="text"
              id="search"
              placeholder="Search audits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="company" className="text-sm">Filter by company</label>
            <select
              id="company"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="sort" className="text-sm">Sort by</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'company')}
              className="w-full"
            >
              <option value="date">Date (Newest First)</option>
              <option value="name">Name (A-Z)</option>
              <option value="company">Company (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audits Table */}
      {filteredAudits.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg">
            {searchTerm || filterCompany !== 'all' 
              ? 'No audits found matching your filters' 
              : 'No audits created yet'}
          </p>
          {audits.length === 0 && (
            <button
              onClick={() => router.push('/create')}
              className="mt-4 mb-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              style={{ background: '#0086D6' }}
            >
              Create New Audit
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Audit Name</th>
                <th>Company</th>
                <th>Date Created</th>
                <th>Employees</th>
                <th>Leaders</th>
                <th>Completion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudits.map((audit) => (
                <tr key={audit.id}>
                  <td>
                    <a 
                      href={`/admin/audit/${audit.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {audit.name}
                    </a>
                  </td>
                  <td>{audit.company}</td>
                  <td>{formatDate(audit.createdAt)}</td>
                  <td className="text-center">{audit.employeeCount}</td>
                  <td className="text-center">{audit.leaderCount}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getCompletionBadge(audit.completionRate)}`}>
                        {audit.completedCount}/{audit.leaderCount}
                      </span>
                      <span className="text-sm text-gray-500">({audit.completionRate}%)</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/audit/${audit.id}`)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                      >
                        View/Edit
                      </button>
                      <button
                        onClick={() => router.push(`/results?auditId=${audit.id}`)}
                        className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 font-medium"
                      >
                        Results
                      </button>
                      {deleteConfirm === audit.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(audit.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(audit.id)}
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}