/**
 * API Talent - Messages reçus (broadcast)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'

// GET - Liste des messages broadcast reçus
export async function GET(request: NextRequest) {
  try {
    await requireRole(['TALENT'])
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Profil talent non trouvé' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [messages, total, nonLus] = await Promise.all([
      prisma.broadcastDestinataire.findMany({
        where: { talentId: talent.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          message: {
            select: {
              uid: true,
              sujet: true,
              contenu: true,
              createdAt: true,
            }
          }
        }
      }),
      prisma.broadcastDestinataire.count({
        where: { talentId: talent.id }
      }),
      prisma.broadcastDestinataire.count({
        where: { talentId: talent.id, lu: false }
      }),
    ])

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        uid: m.message.uid,
        sujet: m.message.sujet,
        contenu: m.message.contenu,
        lu: m.lu,
        luLe: m.luLe,
        recuLe: m.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      nonLus,
    })
  } catch (error) {
    console.error('Erreur GET messages talent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Marquer un message comme lu
export async function PATCH(request: NextRequest) {
  try {
    await requireRole(['TALENT'])
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Profil talent non trouvé' }, { status: 404 })
    }

    const body = await request.json()
    const { messageUid, markAllRead } = body

    if (markAllRead) {
      // Marquer tous les messages comme lus
      await prisma.broadcastDestinataire.updateMany({
        where: { talentId: talent.id, lu: false },
        data: { lu: true, luLe: new Date() }
      })

      return NextResponse.json({ success: true, message: 'Tous les messages marqués comme lus' })
    }

    if (!messageUid) {
      return NextResponse.json({ error: 'messageUid requis' }, { status: 400 })
    }

    // Trouver le message
    const message = await prisma.broadcastMessage.findUnique({
      where: { uid: messageUid },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 })
    }

    // Marquer comme lu
    await prisma.broadcastDestinataire.updateMany({
      where: {
        messageId: message.id,
        talentId: talent.id,
      },
      data: {
        lu: true,
        luLe: new Date(),
      }
    })

    // Mettre à jour le compteur totalLu
    const totalLu = await prisma.broadcastDestinataire.count({
      where: { messageId: message.id, lu: true }
    })

    await prisma.broadcastMessage.update({
      where: { id: message.id },
      data: { totalLu }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur PATCH message talent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
