import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { employees } = await request.json()

    // Find audit leader
    const auditLeader = await prisma.auditLeader.findUnique({
      where: { token: params.token }
    })

    if (!auditLeader) {
      return NextResponse.json(
        { error: 'Invalid audit link' },
        { status: 404 }
      )
    }

    if (auditLeader.completed) {
      return NextResponse.json(
        { error: 'Audit already completed' },
        { status: 400 }
      )
    }

    // Update all ratings
    await Promise.all(
      employees.map((emp: any) =>
        prisma.rating.updateMany({
          where: {
            auditLeaderId: auditLeader.id,
            employeeId: emp.id
          },
          data: {
            careerStage: emp.careerStage,
            performanceRank: emp.performanceRank
          }
        })
      )
    )

    // Mark audit leader as completed
    await prisma.auditLeader.update({
      where: { id: auditLeader.id },
      data: { completed: true }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error submitting ratings:', error)
    return NextResponse.json(
      { error: 'Failed to submit ratings' },
      { status: 500 }
    )
  }
}