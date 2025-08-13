import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// GET single audit details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const audit = await prisma.audit.findUnique({
      where: {
        id: params.id
      },
      include: {
        employees: true,
        auditLeaders: {
          include: {
            ratings: {
              include: {
                employee: true
              }
            }
          }
        }
      }
    })

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      )
    }

    // Transform the data to include leader assignments
    const transformedAudit = {
      ...audit,
      auditLeaders: audit.auditLeaders.map(leader => ({
        ...leader,
        assignedEmployees: leader.ratings.map(r => r.employee.name)
      }))
    }

    return NextResponse.json(transformedAudit)
  } catch (error) {
    console.error('Error fetching audit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit' },
      { status: 500 }
    )
  }
}

// PUT to update audit details
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { employees, auditLeaders } = body

    // Update employees if provided
    if (employees) {
      // Delete removed employees
      const existingEmployees = await prisma.employee.findMany({
        where: { auditId: params.id }
      })
      
      const newEmployeeNames = new Set(employees.map((e: any) => e.name))
      const toDelete = existingEmployees.filter(e => !newEmployeeNames.has(e.name))
      
      for (const emp of toDelete) {
        await prisma.employee.delete({ where: { id: emp.id } })
      }

      // Add or update employees
      for (const emp of employees) {
        const existing = existingEmployees.find(e => e.name === emp.name)
        if (existing) {
          await prisma.employee.update({
            where: { id: existing.id },
            data: {
              title: emp.title,
              businessUnit: emp.businessUnit,
              company: emp.company,
              email: emp.email || existing.email || '',
              employeeUniqueId: emp.email || existing.employeeUniqueId || existing.email || emp.name
            }
          })
        } else {
          await prisma.employee.create({
            data: {
              auditId: params.id,
              name: emp.name,
              email: emp.email || '',
              title: emp.title,
              businessUnit: emp.businessUnit,
              company: emp.company,
              employeeUniqueId: emp.email || emp.name
            }
          })
        }
      }
    }

    // Update audit leaders if provided
    if (auditLeaders) {
      for (const leader of auditLeaders) {
        if (leader.id) {
          // Update existing leader
          await prisma.auditLeader.update({
            where: { id: leader.id },
            data: {
              name: leader.name,
              email: leader.email
            }
          })

          // Update employee assignments
          const employees = await prisma.employee.findMany({
            where: { 
              auditId: params.id,
              name: { in: leader.assignedEmployees }
            }
          })

          // Delete old ratings
          await prisma.rating.deleteMany({
            where: { auditLeaderId: leader.id }
          })

          // Create new ratings
          for (const emp of employees) {
            await prisma.rating.create({
              data: {
                auditLeaderId: leader.id,
                employeeId: emp.id,
                careerStage: 0,
                performanceRank: 999
              }
            })
          }
        } else {
          // Create new leader
          const token = uuidv4()
          const newLeader = await prisma.auditLeader.create({
            data: {
              auditId: params.id,
              name: leader.name,
              email: leader.email,
              token: token
            }
          })

          // Create ratings for assigned employees
          const employees = await prisma.employee.findMany({
            where: { 
              auditId: params.id,
              name: { in: leader.assignedEmployees }
            }
          })

          for (const emp of employees) {
            await prisma.rating.create({
              data: {
                auditLeaderId: newLeader.id,
                employeeId: emp.id,
                careerStage: 0,
                performanceRank: 999
              }
            })
          }
        }
      }

      // Delete removed leaders
      if (body.deletedLeaderIds && body.deletedLeaderIds.length > 0) {
        await prisma.auditLeader.deleteMany({
          where: {
            id: { in: body.deletedLeaderIds }
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating audit:', error)
    return NextResponse.json(
      { error: 'Failed to update audit' },
      { status: 500 }
    )
  }
}

// DELETE audit
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auditId = params.id

    // Delete the audit (cascading delete will handle related records)
    await prisma.audit.delete({
      where: { id: auditId }
    })

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting audit:', error)
    return NextResponse.json(
      { error: 'Failed to delete audit' },
      { status: 500 }
    )
  }
}