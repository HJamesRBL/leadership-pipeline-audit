'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  organizationAccess?: Array<{
    organizationId: string
    organizationName: string
  }>
}

interface Organization {
  organizationId: string
  organizationName: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  
  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin'
  })

  useEffect(() => {
    if (status === 'loading') return
    
    // Check if user is super_admin
    const userRole = session?.user ? (session.user as any).role : null
    
    if (!session || userRole !== 'super_admin') {
      router.push('/')
      return
    }
    
    fetchUsers()
    fetchOrganizations()
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      setError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations')
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data)
      }
    } catch (error) {
      console.error('Failed to load organizations')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          organizationIds: newUser.role === 'org_sponsor' ? selectedOrgs : []
        })
      })

      if (response.ok) {
        setSuccessMessage('User created successfully!')
        setShowCreateForm(false)
        setNewUser({ email: '', password: '', name: '', role: 'admin' })
        setSelectedOrgs([])
        fetchUsers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create user')
      }
    } catch (error) {
      setError('An error occurred while creating the user')
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete ${userEmail}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccessMessage('User deleted successfully')
        fetchUsers()
      } else {
        setError('Failed to delete user')
      }
    } catch (error) {
      setError('An error occurred while deleting the user')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        setSuccessMessage('Role updated successfully')
        fetchUsers()
      } else {
        setError('Failed to update role')
      }
    } catch (error) {
      setError('An error occurred while updating the role')
    }
  }

  if (status === 'loading' || isLoading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!session || (session.user as any).role !== 'super_admin') {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Users Management</h1>
        <p className="text-gray-600">Manage administrator accounts and organization access</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Create User Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          style={{ backgroundColor: '#0086D6' }}
        >
          {showCreateForm ? 'Cancel' : '+ Create New User'}
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="org_sponsor">Organization Sponsor</option>
                </select>
              </div>
            </div>

            {/* Organization Selection for org_sponsor */}
            {newUser.role === 'org_sponsor' && organizations.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Organizations</label>
                <div className="border rounded p-3 max-h-40 overflow-y-auto bg-white">
                  {organizations.map((org) => (
                    <label key={org.organizationId} className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedOrgs.includes(org.organizationId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrgs([...selectedOrgs, org.organizationId])
                          } else {
                            setSelectedOrgs(selectedOrgs.filter(id => id !== org.organizationId))
                          }
                        }}
                      />
                      <span className="text-sm">{org.organizationName || org.organizationId}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create User
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setSelectedOrgs([])
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organizations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                  {user.id === (session.user as any).id && (
                    <span className="ml-2 text-xs text-gray-500">(You)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                    disabled={user.id === (session.user as any).id}
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="org_sponsor">Organization Sponsor</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {user.role === 'org_sponsor' && user.organizationAccess && user.organizationAccess.length > 0 ? (
                    <div className="text-xs">
                      {user.organizationAccess.map(org => org.organizationName || org.organizationId).join(', ')}
                    </div>
                  ) : user.role === 'org_sponsor' ? (
                    <span className="text-xs text-gray-500">No organizations assigned</span>
                  ) : (
                    <span className="text-xs text-gray-500">All organizations</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.id !== (session.user as any).id ? (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found
          </div>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Role Permissions:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li><strong>Admin:</strong> Can create and manage audits, view results for all organizations</li>
          <li><strong>Super Admin:</strong> All admin permissions plus user management capabilities</li>
          <li><strong>Organization Sponsor:</strong> Can only view results for their assigned organizations</li>
        </ul>
      </div>
    </div>
  )
}