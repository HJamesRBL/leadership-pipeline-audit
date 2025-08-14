import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Create Prisma client with proper settings for serverless
function createPrismaClient() {
  // For Supabase + Vercel, we need to disable prepared statements
  const databaseUrl = process.env.DATABASE_URL!
  
  // Add necessary parameters for serverless environment
  let finalUrl = databaseUrl
  if (!databaseUrl.includes('pgbouncer=true')) {
    const separator = databaseUrl.includes('?') ? '&' : '?'
    finalUrl = `${databaseUrl}${separator}pgbouncer=true&statement_cache_size=0&prepare=false`
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: finalUrl
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Use singleton pattern
export const prisma = global.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}