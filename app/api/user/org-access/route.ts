import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET user's organization access
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    // If super_admin or admin, they have access to all organizations
    if (userRole === 'super_admin' || userRole === 'admin') {
      return NextResponse.json([]) // Empty array means all access
    }

    // For org_sponsor, get their specific organization access
    const orgAccess = await prisma.userOrganizationAccess.findMany({
      where: {
        userId: userId
      },
      select: {
        organizationId: true,
        organizationName: true
      }
    })

    return NextResponse.json(orgAccess)
  } catch (error) {
    console.error('Error fetching organization access:', error)
    return NextResponse.json({ error: 'Failed to fetch organization access' }, { status: 500 })
  }
}