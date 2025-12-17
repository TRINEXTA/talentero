/**
 * API Admin - Gestion des conversations directes
 * GET - Liste des conversations
 * POST - Creer une nouvelle conversation avec un talent
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendNewMessageNotification } from '@/lib/microsoft-graph'

// GET - Liste des conversations
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // DIRECT, SUPPORT, OFFRE
    const talentUid = searchParams.get('talentUid')

    const where: any = {}
    if (type) {
      where.type = type
    }
    if (talentUid) {
      where.participants = {
        some: {
          talent: { uid: talentUid }
        }
      }
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            talent: {
              select: {
                uid: true,
                codeUnique: true,
                prenom: true,
                nom: true,
                photoUrl: true,
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            contenu: true,
            createdAt: true,
            expediteurAdmin: true,
            expediteurTalentId: true,
          }
        },
        offre: {
          select: {
            uid: true,
            titre: true,
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Erreur GET conversations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Creer une nouvelle conversation ou envoyer un message
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const body = await request.json()
    const { talentUid, sujet, message, type = 'DIRECT' } = body

    if (!talentUid || !message) {
      return NextResponse.json(
        { error: 'talentUid et message sont requis' },
        { status: 400 }
      )
    }

    // Trouver le talent
    const talent = await prisma.talent.findUnique({
      where: { uid: talentUid },
      include: { user: { select: { id: true, email: true } } }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouve' }, { status: 404 })
    }

    // Verifier si une conversation directe existe deja
    let conversation = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        participants: {
          some: { talentId: talent.id }
        }
      }
    })

    // Creer la conversation si elle n'existe pas
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: type as any,
          sujet: sujet || `Conversation avec ${talent.prenom} ${talent.nom}`,
          participants: {
            create: [
              { talentId: talent.id },
              { isAdmin: true }
            ]
          }
        }
      })
    }

    // Ajouter le message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        contenu: message,
        expediteurAdmin: true,
      }
    })

    // Mettre a jour la conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    })

    // Creer une notification pour le talent
    await prisma.notification.create({
      data: {
        userId: talent.user.id,
        type: 'NOUVEAU_MESSAGE',
        titre: 'Nouveau message de TRINEXTA',
        message: sujet || 'Vous avez recu un nouveau message',
        lien: '/t/messages',
      }
    })

    // Envoyer un email de notification
    try {
      await sendNewMessageNotification(
        talent.user.email,
        talent.prenom,
        sujet || `Message pour ${talent.prenom} ${talent.nom}`,
        message
      )
    } catch (emailError) {
      // Log l'erreur mais ne pas bloquer la reponse
      console.error('Erreur envoi email notification:', emailError)
    }

    return NextResponse.json({
      success: true,
      conversation: {
        uid: conversation.uid,
        id: conversation.id,
      },
      message: newMessage,
    })
  } catch (error) {
    console.error('Erreur POST conversation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
