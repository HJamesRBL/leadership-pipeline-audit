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
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="text-lg sm:text-xl text-gray-600">Loading audits...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pipeline Audit Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage and monitor all pipeline audits</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/create')}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label htmlFor="search" className="text-xs sm:text-sm text-gray-600">Search by name</label>
            <input
              type="text"
              id="search"
              placeholder="Search audits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
            />
          </div>
          
          <div>
            <label htmlFor="company" className="text-xs sm:text-sm text-gray-600">Filter by company</label>
            <select
              id="company"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="sort" className="text-xs sm:text-sm text-gray-600">Sort by</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'company')}
              className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
            >
              <option value="date">Date (Newest First)</option>
              <option value="name">Name (A-Z)</option>
              <option value="company">Company (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAudits.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-base sm:text-lg">
            {searchTerm || filterCompany !== 'all' 
              ? 'No audits found matching your filters' 
              : 'No audits created yet'}
          </p>
          {audits.length === 0 && (
            <button
              onClick={() => router.push('/create')}
              className="mt-4 mb-4 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
              style={{ background: '#0086D6' }}
            >
              Create New Audit
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Audit Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date Created</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Employees</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Leaders</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Completion</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a 
                        href={`/admin/audit/${audit.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {audit.name}
                      </a>
                    </td>
                    <td className="px-4 py-3">{audit.company}</td>
                    <td className="px-4 py-3">{formatDate(audit.createdAt)}</td>
                    <td className="px-4 py-3 text-center">{audit.employeeCount}</td>
                    <td className="px-4 py-3 text-center">{audit.leaderCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getCompletionBadge(audit.completionRate)}`}>
                          {audit.completedCount}/{audit.leaderCount}
                        </span>
                        <span className="text-sm text-gray-500">({audit.completionRate}%)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
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

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredAudits.map((audit) => (
              <div key={audit.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base sm:text-lg text-blue-600 mb-1">
                      <a href={`/admin/audit/${audit.id}`} className="hover:text-blue-800">
                        {audit.name}
                      </a>
                    </h3>
                    <p className="text-sm text-gray-600">{audit.company}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(audit.createdAt)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCompletionBadge(audit.completionRate)}`}>
                    {audit.completionRate}%
                  </span>
                </div>
                
                <div className="flex justify-between text-sm mb-3 text-gray-600">
                  <span>Employees: <strong>{audit.employeeCount}</strong></span>
                  <span>Leaders: <strong>{audit.completedCount}/{audit.leaderCount}</strong></span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/admin/audit/${audit.id}`)}
                    className="flex-1 min-w-[80px] px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium text-center"
                  >
                    View/Edit
                  </button>
                  <button
                    onClick={() => router.push(`/results?auditId=${audit.id}`)}
                    className="flex-1 min-w-[80px] px-3 py-2 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 font-medium text-center"
                  >
                    Results
                  </button>
                  {deleteConfirm === audit.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(audit.id)}
                        className="flex-1 min-w-[80px] px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 min-w-[80px] px-3 py-2 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(audit.id)}
                      className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}