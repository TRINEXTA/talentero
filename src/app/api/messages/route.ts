import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotificationWithEmail } from '@/lib/email-notification-service'

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
 *
 * Supporte maintenant 3 types de conversations :
 * - OFFRE : Discussion liée à une offre (nécessite offreId)
 * - DIRECT : Message direct à TRINEXTA (sans offre)
 * - SUPPORT : Demande de support (sans offre)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const body = await request.json()
    const { offreId, sujet, message, destinataireType, destinataireId, type } = body

    // Validation - message est toujours requis
    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Le message est requis' },
        { status: 400 }
      )
    }

    // Déterminer le type de conversation
    const conversationType = type || (offreId ? 'OFFRE' : 'DIRECT')

    // Si c'est une conversation liée à une offre, vérifier que l'offre existe
    let offre = null
    if (offreId) {
      offre = await prisma.offre.findUnique({
        where: { uid: offreId },
        include: {
          client: true,
        },
      })

      if (!offre) {
        return NextResponse.json({ error: 'Offre non trouvee' }, { status: 404 })
      }
    }

    // Récupérer les infos de l'expéditeur pour le sujet par défaut
    let expediteurNom = 'Utilisateur'
    if (user.role === 'TALENT' && user.talentId) {
      const talent = await prisma.talent.findUnique({
        where: { id: user.talentId },
        select: { prenom: true, nom: true },
      })
      expediteurNom = talent ? `${talent.prenom} ${talent.nom}` : 'Freelance'
    } else if (user.role === 'CLIENT' && user.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: user.clientId },
        select: { raisonSociale: true },
      })
      expediteurNom = client?.raisonSociale || 'Client'
    } else if (user.role === 'ADMIN') {
      expediteurNom = 'TRINEXTA'
    }

    // Déterminer le sujet par défaut selon le type
    let defaultSujet = sujet
    if (!defaultSujet) {
      if (conversationType === 'OFFRE' && offre) {
        defaultSujet = `Discussion - ${offre.titre}`
      } else if (conversationType === 'SUPPORT') {
        defaultSujet = `Demande de support - ${expediteurNom}`
      } else {
        defaultSujet = `Message de ${expediteurNom}`
      }
    }

    // Créer la conversation avec les participants
    const conversation = await prisma.$transaction(async (tx) => {
      // Créer la conversation
      const conv = await tx.conversation.create({
        data: {
          offreId: offre?.id || null,
          type: conversationType as 'OFFRE' | 'DIRECT' | 'SUPPORT',
          sujet: defaultSujet,
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
          contenu: message.trim(),
          expediteurTalentId: user.role === 'TALENT' ? user.talentId : null,
          expediteurClientId: user.role === 'CLIENT' ? user.clientId : null,
          expediteurAdmin: user.role === 'ADMIN',
        },
      })

      return conv
    })

    // Envoyer les notifications AVEC email (hors transaction pour ne pas bloquer)
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: conversation.id },
      include: {
        talent: { include: { user: true } },
        client: { include: { user: true } },
      },
    })

    // Récupérer les admins pour les conversations DIRECT/SUPPORT
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, email: true },
    })

    const sujetNotif = offre?.titre || defaultSujet

    for (const part of participants) {
      // Ne pas notifier l'expéditeur
      if (user.role === 'TALENT' && part.talentId === user.talentId) continue
      if (user.role === 'CLIENT' && part.clientId === user.clientId) continue
      if (user.role === 'ADMIN' && part.isAdmin) continue

      const targetUserId = part.talent?.user?.id || part.client?.user?.id

      // Notifier les participants non-admin
      if (targetUserId) {
        await createNotificationWithEmail({
          userId: targetUserId,
          type: 'NOUVEAU_MESSAGE',
          titre: `Message de ${expediteurNom}`,
          message: `Nouveau message concernant "${sujetNotif}"`,
          lien: `/t/messages/${conversation.uid}`,
          data: { conversationUid: conversation.uid, expediteur: expediteurNom },
        }).catch((err) => console.error('Erreur notif message:', err))
      }
    }

    // Notifier les admins si c'est un message vers TRINEXTA
    if (user.role !== 'ADMIN') {
      for (const admin of admins) {
        await createNotificationWithEmail({
          userId: admin.id,
          type: 'NOUVEAU_MESSAGE',
          titre: `Message de ${expediteurNom}`,
          message: conversationType === 'SUPPORT'
            ? `Nouvelle demande de support : "${message.substring(0, 50)}..."`
            : `Nouveau message : "${message.substring(0, 50)}..."`,
          lien: `/admin/messages/${conversation.uid}`,
          data: { conversationUid: conversation.uid, expediteur: expediteurNom, type: conversationType },
        }).catch((err) => console.error('Erreur notif admin:', err))
      }
    }

    return NextResponse.json({
      success: true,
      conversation: {
        uid: conversation.uid,
        type: conversationType,
      },
    })
  } catch (error) {
    console.error('Erreur creation conversation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
