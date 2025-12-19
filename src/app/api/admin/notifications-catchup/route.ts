/**
 * API Admin - Rattrapage des Notifications
 *
 * POST /api/admin/notifications-catchup
 * Déclenche le rattrapage des notifications manquées
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { runFullNotificationCatchup } from '@/lib/notification-catchup'

export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    console.log('[API] Déclenchement du rattrapage des notifications...')

    const report = await runFullNotificationCatchup()

    return NextResponse.json({
      success: true,
      report: {
        startedAt: report.startedAt.toISOString(),
        completedAt: report.completedAt.toISOString(),
        duration: `${(report.completedAt.getTime() - report.startedAt.getTime()) / 1000}s`,
        summary: {
          totalProcessed: report.totalProcessed,
          totalSuccess: report.totalSuccess,
          totalFailed: report.totalFailed,
        },
        details: report.results.map(r => ({
          type: r.type,
          processed: r.processed,
          success: r.success,
          failed: r.failed,
        })),
      },
    })
  } catch (error) {
    console.error('[API] Erreur rattrapage notifications:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: error instanceof Error && error.message.includes('Non authentifié') ? 401 : 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    return NextResponse.json({
      available: true,
      description: 'API de rattrapage des notifications manquées',
      actions: [
        'Envoi des rappels d\'activation aux comptes non activés',
        'Rattrapage des notifications email pour les messages',
        'Rattrapage des notifications email pour les changements de candidature',
      ],
      usage: 'POST /api/admin/notifications-catchup',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 401 }
    )
  }
}
