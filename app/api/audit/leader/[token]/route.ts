import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    // Find audit leader by token
    const auditLeader = await prisma.auditLeader.findUnique({
      where: { token: params.token },
      include: {
        audit: true,
        ratings: {
          include: {
            employee: true
          }
        }
      }
    })

    if (!auditLeader) {
      return NextResponse.json(
        { error: 'Invalid audit link' },
        { status: 404 }
      )
    }

    // Format data for frontend
    const employees = auditLeader.ratings.map(rating => ({
      id: rating.employee.id,
      name: rating.employee.name,
      title: rating.employee.title,
      businessUnit: rating.employee.businessUnit,
      careerStage: rating.careerStage || 0,
      performanceRank: rating.performanceRank || 0
    }))

    return NextResponse.json({
      leaderName: auditLeader.name,
      auditName: auditLeader.audit.name,
      completed: auditLeader.completed,
      employees
    })

  } catch (error) {
    console.error('Error fetching audit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit data' },
      { status: 500 }
    )
  }
}