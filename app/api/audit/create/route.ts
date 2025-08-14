import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Received audit creation request:', {
      name: body.name,
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      auditRound: body.auditRound,
      previousAuditId: body.previousAuditId,
      employeeCount: body.employees?.length,
      leaderCount: body.auditLeaders?.length
    })

    const {
      name,
      organizationId,
      organizationName,
      auditRound,
      previousAuditId,
      employees,
      auditLeaders
    } = body

    // Determine the correct organization info
    let finalOrganizationId = organizationId;
    let finalOrganizationName = organizationName;
    
    // If this is a follow-up round, inherit organization info from the previous audit
    if (previousAuditId) {
      console.log('This is a follow-up round, fetching previous audit info...')
      const previousAudit = await prisma.audit.findUnique({
        where: { id: previousAuditId },
        select: { 
          organizationId: true, 
          organizationName: true 
        }
      })
      
      if (previousAudit) {
        // Always use the organization info from the previous round
        finalOrganizationId = previousAudit.organizationId || organizationId || uuidv4()
        finalOrganizationName = previousAudit.organizationName || organizationName || 'Unspecified'
        console.log('Using organization info from previous audit:', {
          organizationId: finalOrganizationId,
          organizationName: finalOrganizationName
        })
      } else {
        // Previous audit not found, use provided values or generate new
        finalOrganizationId = organizationId || uuidv4()
        finalOrganizationName = organizationName || 'Unspecified'
        console.log('Warning: Previous audit not found, using provided values')
      }
    } else {
      // This is a first round, use provided values or generate new
      finalOrganizationId = organizationId || uuidv4()
      finalOrganizationName = organizationName || 'Unspecified'
    }

    // Create the audit with the correct organization info
    console.log('Creating audit in database...')
    const audit = await prisma.audit.create({
      data: {
        name,
        organizationId: finalOrganizationId,
        organizationName: finalOrganizationName,
        auditRound: auditRound || 1,
        previousAuditId: previousAuditId || null
      }
    })
    console.log('Audit created successfully:', audit.id)

    // Create employees SEQUENTIALLY (not in parallel)
    console.log('Creating employees...')
    const createdEmployees = []
    for (const emp of employees) {
      console.log('Creating employee:', emp.name)
      const created = await prisma.employee.create({
        data: {
          auditId: audit.id,
          employeeUniqueId: emp.employeeUniqueId || emp.email,
          name: emp.name,
          email: emp.email || '',
          title: emp.title,
          businessUnit: emp.businessUnit,
          company: emp.company || finalOrganizationName || 'Unspecified'
        }
      })
      createdEmployees.push(created)
    }
    console.log(`Created ${createdEmployees.length} employees`)

    // Create audit leaders SEQUENTIALLY with their ratings
    console.log('Creating audit leaders...')
    const links = []
    for (const leader of auditLeaders) {
      const token = uuidv4()
      console.log('Creating audit leader:', leader.name)
      
      const createdLeader = await prisma.auditLeader.create({
        data: {
          auditId: audit.id,
          name: leader.name,
          email: leader.email,
          token,
        }
      })

      // Create ratings for this leader SEQUENTIALLY
      const employeesToRate = createdEmployees.filter(emp =>
        leader.employees.includes(emp.name)
      )
      console.log(`Assigning ${employeesToRate.length} employees to ${leader.name}`)

      for (const emp of employeesToRate) {
        await prisma.rating.create({
          data: {
            auditLeaderId: createdLeader.id,
            employeeId: emp.id,
            careerStage: 0,
            performanceRank: 999,
          }
        })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      links.push({
        name: leader.name,
        email: leader.email,
        link: `${baseUrl}/audit/${token}`,
        token: token,
        employees: leader.employees
      })
    }
    console.log(`Created ${links.length} audit leaders with links`)

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      auditName: audit.name,
      organizationName: finalOrganizationName,  // Return the final organization name
      auditRound: auditRound,
      links
    })

  } catch (error) {
    console.error('Detailed error creating audit:', error)
    console.error('Error stack:', (error as Error).stack)
    return NextResponse.json(
      {
        error: 'Failed to create audit',
        details: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    )
  }
}