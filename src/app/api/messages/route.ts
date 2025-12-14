import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/messages - Liste des conversations de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    // Récupérer les conversations selon le rôle
    let participantWhere: any = {}

    if (user.role === 'TALENT' && user.talentId) {
      participantWhere = { talentId: user.talentId }
    } else if (user.role === 'CLIENT' && user.clientId) {
      participantWhere = { clientId: user.clientId }
    } else if (user.role === 'ADMIN') {
      participantWhere = { isAdmin: true }
    } else {
      return NextResponse.json({ error: 'Profil non trouve' }, { status: 400 })
    }

    // Récupérer les conversations avec le dernier message
    const participants = await prisma.conversationParticipant.findMany({
      where: participantWhere,
      include: {
        conversation: {
          include: {
            offre: {
              select: {
                uid: true,
                codeUnique: true,
                titre: true,
                client: {
                  select: {
                    raisonSociale: true,
                  },
                },
              },
            },
            participants: {
              include: {
                talent: {
                  select: {
                    uid: true,
                    codeUnique: true,
                    prenom: true,
                    nom: true,
                    photoUrl: true,
                  },
                },
                client: {
                  select: {
                    uid: true,
                    codeUnique: true,
                    raisonSociale: true,
                    logoUrl: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                uid: true,
                contenu: true,
                createdAt: true,
                expediteurTalentId: true,
                expediteurClientId: true,
                expediteurAdmin: true,
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: 'desc',
        },
      },
    })

    // Formater les conversations
    const conversations = participants.map((p) => {
      const conv = p.conversation
      const lastMessage = conv.messages[0]

      // Compter les messages non lus
      const lastReadId = p.dernierMessageLu
      const unreadCount = lastReadId
        ? conv.messages.filter((m: any) => m.id > lastReadId).length
        : conv.messages.length

      // Identifier l'autre participant
      const otherParticipants = conv.participants.filter((part) => {
        if (user.role === 'TALENT') return !part.talentId
        if (user.role === 'CLIENT') return !part.clientId
        return !part.isAdmin
      })

      return {
        uid: conv.uid,
        sujet: conv.sujet,
        offre: conv.offre,
        participants: otherParticipants.map((part) => ({
          type: part.talentId ? 'talent' : part.clientId ? 'client' : 'admin',
          talent: part.talent,
          client: part.client,
          isAdmin: part.isAdmin,
        })),
        lastMessage: lastMessage ? {
          uid: lastMessage.uid,
          contenu: lastMessage.contenu.substring(0, 100) + (lastMessage.contenu.length > 100 ? '...' : ''),
          createdAt: lastMessage.createdAt,
          isFromMe: user.role === 'TALENT'
            ? lastMessage.expediteurTalentId === user.talentId
            : user.role === 'CLIENT'
            ? lastMessage.expediteurClientId === user.clientId
            : lastMessage.expediteurAdmin,
        } : null,
        unreadCount,
        archivee: conv.archivee,
        updatedAt: conv.updatedAt,
      }
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Erreur liste conversations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/messages - Créer une nouvelle conversation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const body = await request.json()
    const { offreId, sujet, message, destinataireType, destinataireId } = body

    // Validation
    if (!offreId || !message) {
      return NextResponse.json(
        { error: 'offreId et message sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que l'offre existe
    const offre = await prisma.offre.findUnique({
      where: { uid: offreId },
      include: {
        client: true,
      },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvee' }, { status: 404 })
    }

    // Créer la conversation avec les participants
    const conversation = await prisma.$transaction(async (tx) => {
      // Créer la conversation
      const conv = await tx.conversation.create({
        data: {
          offreId: offre.id,
          sujet: sujet || `Discussion - ${offre.titre}`,
        },
      })

      // Ajouter le créateur comme participant
      if (user.role === 'TALENT' && user.talentId) {
        await tx.conversationParticipant.create({
          data: {
            conversationId: conv.id,
            talentId: user.talentId,
          },
        })
      } else if (user.role === 'CLIENT' && user.clientId) {
        await tx.conversationParticipant.create({
          data: {
            conversationId: conv.id,
            clientId: user.clientId,
          },
        })
      }

      // Ajouter TRINEXTA comme participant (toujours)
      await tx.conversationParticipant.create({
        data: {
          conversationId: conv.id,
          isAdmin: true,
        },
      })

      // Ajouter le destinataire si spécifié
      if (destinataireType === 'talent' && destinataireId) {
        const talent = await tx.talent.findUnique({ where: { uid: destinataireId } })
        if (talent) {
          await tx.conversationParticipant.create({
            data: {
              conversationId: conv.id,
              talentId: talent.id,
            },
          }).catch(() => {}) // Ignore si déjà participant
        }
      } else if (destinataireType === 'client' && destinataireId) {
        const client = await tx.client.findUnique({ where: { uid: destinataireId } })
        if (client) {
          await tx.conversationParticipant.create({
            data: {
              conversationId: conv.id,
              clientId: client.id,
            },
          }).catch(() => {}) // Ignore si déjà participant
        }
      }

      // Créer le premier message
      await tx.message.create({
        data: {
          conversationId: conv.id,
          contenu: message,
          expediteurTalentId: user.role === 'TALENT' ? user.talentId : null,
          expediteurClientId: user.role === 'CLIENT' ? user.clientId : null,
          expediteurAdmin: user.role === 'ADMIN',
        },
      })

      // Créer une notification pour les destinataires
      const participants = await tx.conversationParticipant.findMany({
        where: { conversationId: conv.id },
        include: {
          talent: { include: { user: true } },
          client: { include: { user: true } },
        },
      })

      for (const part of participants) {
        // Ne pas notifier l'expéditeur
        if (user.role === 'TALENT' && part.talentId === user.talentId) continue
        if (user.role === 'CLIENT' && part.clientId === user.clientId) continue
        if (user.role === 'ADMIN' && part.isAdmin) continue

        const targetUserId = part.talent?.user?.id || part.client?.user?.id
        if (targetUserId) {
          await tx.notification.create({
            data: {
              userId: targetUserId,
              type: 'NOUVEAU_MESSAGE',
              titre: 'Nouveau message',
              message: `Nouveau message concernant "${offre.titre}"`,
              lien: `/messages/${conv.uid}`,
            },
          })
        }
      }

      return conv
    })

    return NextResponse.json({
      success: true,
      conversation: {
        uid: conversation.uid,
      },
    })
  } catch (error) {
    console.error('Erreur creation conversation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
