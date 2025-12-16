import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUnreadCount } from '@/lib/notifications'

/**
 * GET /api/notifications/count
 * Endpoint léger pour récupérer le nombre de notifications non lues
 * Utilisé pour le polling temps réel
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ count: 0 }, { status: 401 })
    }

    const count = await getUnreadCount(user.id)

    return NextResponse.json({
      count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erreur GET /api/notifications/count:', error)
    return NextResponse.json({ count: 0 }, { status: 500 })
  }
}
