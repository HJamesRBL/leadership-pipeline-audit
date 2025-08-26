import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Also fetch the user from database to compare
  let dbUser = null
  if (session?.user?.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, role: true, name: true }
    })
  }
  
  return NextResponse.json({
    session: session,
    sessionUser: session?.user,
    dbUser: dbUser,
    hasRole: !!(session?.user as any)?.role,
    roleValue: (session?.user as any)?.role
  })
}