import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET unique organizations from audits
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated and is super_admin
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unique organizations from audits
    const audits = await prisma.audit.findMany({
      where: {
        organizationId: {
          not: null
        }
      },
      select: {
        organizationId: true,
        organizationName: true
      },
      distinct: ['organizationId']
    })

    // Transform to unique list
    const organizations = audits
      .filter(audit => audit.organizationId)
      .map(audit => ({
        organizationId: audit.organizationId!,
        organizationName: audit.organizationName || audit.organizationId!
      }))
      .filter((org, index, self) => 
        index === self.findIndex(o => o.organizationId === org.organizationId)
      )

    return NextResponse.json(organizations)
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}