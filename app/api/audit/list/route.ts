import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Fetch all audits with related data counts and completion status
    const audits = await prisma.audit.findMany({
      include: {
        employees: true,
        auditLeaders: {
          include: {
            ratings: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to include computed fields and new organization fields
    const auditsWithStats = audits.map(audit => {
      // Get company from organizationName or fall back to first employee's company
      const company = audit.organizationName || audit.employees[0]?.company || 'N/A'
      
      // Calculate completion stats
      const totalLeaders = audit.auditLeaders.length
      const completedLeaders = audit.auditLeaders.filter(leader => leader.completed).length

      return {
        id: audit.id,
        name: audit.name,
        company: company,
        organizationId: audit.organizationId,
        organizationName: audit.organizationName,
        auditRound: audit.auditRound || 1,
        previousAuditId: audit.previousAuditId,
        createdAt: audit.createdAt,
        employeeCount: audit.employees.length,
        leaderCount: totalLeaders,
        completedCount: completedLeaders,
        completionRate: totalLeaders > 0 ? Math.round((completedLeaders / totalLeaders) * 100) : 0
      }
    })

    return NextResponse.json(auditsWithStats)
    
  } catch (error) {
    console.error('Error fetching audits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audits' },
      { status: 500 }
    )
  }
}