import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Only add pgbouncer if not already in the URL
let databaseUrl = process.env.DATABASE_URL!
if (!databaseUrl.includes('pgbouncer=true')) {
  databaseUrl = databaseUrl.includes('?') 
    ? `${databaseUrl}&pgbouncer=true&connection_limit=1`
    : `${databaseUrl}?pgbouncer=true&connection_limit=1`
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}