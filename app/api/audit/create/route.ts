import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

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

    // Create the audit with new fields
    console.log('Creating audit in database...')
    const audit = await prisma.audit.create({
      data: {
        name,
        organizationId: organizationId || uuidv4(),
        organizationName: organizationName || 'Unspecified',
        auditRound: auditRound || 1,
        previousAuditId: previousAuditId || null
      }
    })
    console.log('Audit created successfully:', audit.id)

    // Create employees with unique tracking ID (email)
    console.log('Creating employees...')
    const createdEmployees = await Promise.all(
      employees.map((emp: any) => {
        console.log('Creating employee:', emp.name)
        return prisma.employee.create({
          data: {
            auditId: audit.id,
            employeeUniqueId: emp.employeeUniqueId || emp.email, // Use email as unique ID
            name: emp.name,
            email: emp.email || '', // Make sure email is saved
            title: emp.title,
            businessUnit: emp.businessUnit,
            company: emp.company || organizationName || 'Unspecified'
          }
        })
      })
    )
    console.log(`Created ${createdEmployees.length} employees`)

    // Create audit leaders with unique tokens and return enhanced links
    console.log('Creating audit leaders...')
    const links = await Promise.all(
      auditLeaders.map(async (leader: any) => {
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

        // Create empty ratings for each employee this leader should rate
        const employeesToRate = createdEmployees.filter(emp =>
          leader.employees.includes(emp.name)
        )
        console.log(`Assigning ${employeesToRate.length} employees to ${leader.name}`)

        // DON'T set performanceRank yet - it will be set when they submit
        for (const emp of employeesToRate) {
          await prisma.rating.create({
            data: {
              auditLeaderId: createdLeader.id,
              employeeId: emp.id,
              careerStage: 0, // Will be set by audit leader
              performanceRank: 999, // Temporary value - will be updated when submitted
            }
          })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return {
          name: leader.name,
          email: leader.email,
          link: `${baseUrl}/audit/${token}`,
          token: token,
          employees: leader.employees
        }
      })
    )
    console.log(`Created ${links.length} audit leaders with links`)

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      auditName: audit.name,
      organizationName: organizationName,
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