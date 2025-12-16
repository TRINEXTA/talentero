import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '@/lib/notifications'

/**
 * GET /api/notifications
 * Récupère les notifications de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const result = await getUserNotifications(user.id, {
      limit,
      offset,
      unreadOnly,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 * Marque les notifications comme lues
 * Body: { notificationId?: number, markAll?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationId, markAll } = body

    if (markAll) {
      // Marquer toutes comme lues
      await markAllAsRead(user.id)
      return NextResponse.json({ success: true, message: 'Toutes les notifications marquées comme lues' })
    }

    if (notificationId) {
      // Marquer une notification spécifique
      await markAsRead(notificationId, user.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'notificationId ou markAll requis' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erreur PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/count
 * Récupère uniquement le nombre de notifications non lues
 * (endpoint léger pour polling)
 */
export async function HEAD(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return new NextResponse(null, {
        status: 401,
        headers: { 'X-Unread-Count': '0' },
      })
    }

    const count = await getUnreadCount(user.id)

    return new NextResponse(null, {
      status: 200,
      headers: { 'X-Unread-Count': count.toString() },
    })
  } catch {
    return new NextResponse(null, {
      status: 500,
      headers: { 'X-Unread-Count': '0' },
    })
  }
}
