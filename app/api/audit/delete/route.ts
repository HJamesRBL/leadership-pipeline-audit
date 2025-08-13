import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const auditId = searchParams.get('id')

    if (!auditId) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    // Delete the audit (cascading delete will remove related records)
    await prisma.audit.delete({
      where: {
        id: auditId
      }
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