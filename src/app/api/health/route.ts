import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      memory: 'unknown'
    }
  }

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = 'ok'
  } catch {
    health.checks.database = 'error'
    health.status = 'degraded'
  }

  // Check memory usage
  const memUsage = process.memoryUsage()
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)

  if (memUsedMB < 500) {
    health.checks.memory = 'ok'
  } else if (memUsedMB < 800) {
    health.checks.memory = 'warning'
  } else {
    health.checks.memory = 'critical'
    health.status = 'degraded'
  }

  const statusCode = health.status === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      ...health,
      memory: {
        used: `${memUsedMB}MB`,
        total: `${memTotalMB}MB`
      }
    },
    { status: statusCode }
  )
}
