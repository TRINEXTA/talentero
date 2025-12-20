/**
 * API Client - Gestion d'une Shortlist spécifique
 * Permet au client de donner son feedback sur les candidats
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createBulkNotificationsWithEmail } from '@/lib/email-notification-service'

// GET - Détails d'une shortlist
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const shortlist = await prisma.shortlist.findUnique({
      where: { uid: params.uid },
      include: {
        offre: {
          select: {
            uid: true,
            slug: true,
            titre: true,
            competencesRequises: true,
            competencesSouhaitees: true,
            tjmMin: true,
            tjmMax: true,
            lieu: true,
            clientId: true,
          },
        },
        candidats: {
          orderBy: { ordre: 'asc' },
          include: {
            candidature: {
              include: {
                talent: {
                  select: {
                    uid: true,
                    codeUnique: true,
                    prenom: true,
                    nom: true,
                    titrePoste: true,
                    photoUrl: true,
                    competences: true,
                    tjm: true,
                    anneesExperience: true,
                    disponibilite: true,
                    mobilite: true,
                    ville: true,
                    bio: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!shortlist) {
      return NextResponse.json({ error: 'Shortlist non trouvée' }, { status: 404 })
    }

    // Vérifie que la shortlist appartient au client
    if (user.role === 'CLIENT' && shortlist.offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Ne pas montrer les shortlists EN_COURS aux clients
    if (user.role === 'CLIENT' && shortlist.statut === 'EN_COURS') {
      return NextResponse.json({ error: 'Shortlist non disponible' }, { status: 404 })
    }

    // Anonymiser les données pour les clients
    const isClient = user.role === 'CLIENT'

    return NextResponse.json({
      shortlist: {
        uid: shortlist.uid,
        statut: shortlist.statut,
        notes: shortlist.notes,
        envoyeeLe: shortlist.envoyeeLe,
        offre: shortlist.offre,
        candidats: shortlist.candidats.map((c, index) => {
          const talent = c.candidature.talent

          // Pour les clients : anonymiser les informations personnelles
          if (isClient) {
            return {
              id: c.id,
              ordre: c.ordre,
              statutClient: c.statutClient || 'EN_ATTENTE',
              retenuParClient: c.retenuParClient,
              commentaireClient: c.commentaireClient,
              demandeInfos: c.demandeInfos || false,
              questionClient: c.questionClient,
              reponseCandidat: c.reponseCandidat,
              candidature: {
                id: c.candidature.id,
                uid: c.candidature.uid,
                scoreMatch: c.candidature.scoreMatch,
                motivation: c.candidature.motivation,
                talent: {
                  // Identifiant anonyme (code unique ou numéro)
                  uid: talent.uid,
                  codeUnique: talent.codeUnique || `CANDIDAT-${index + 1}`,
                  // Afficher "Candidat X" au lieu du nom
                  displayName: `Candidat ${talent.codeUnique || (index + 1)}`,
                  // Informations professionnelles (non personnelles)
                  titrePoste: talent.titrePoste,
                  competences: talent.competences,
                  anneesExperience: talent.anneesExperience,
                  disponibilite: talent.disponibilite,
                  mobilite: talent.mobilite,
                  // Ville approximative seulement
                  ville: talent.ville,
                  // Bio/présentation
                  bio: talent.bio,
                  // PAS de nom, prenom, photo, TJM
                },
              },
              // PAS de tjmPropose - le client ne doit pas voir le TJM du freelance
            }
          }

          // Pour les admins : données complètes
          return {
            id: c.id,
            ordre: c.ordre,
            retenuParClient: c.retenuParClient,
            commentaireClient: c.commentaireClient,
            talent: talent,
            scoreMatch: c.candidature.scoreMatch,
            motivation: c.candidature.motivation,
            tjmPropose: c.candidature.tjmPropose,
          }
        }),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/client/shortlists/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Donner un feedback sur un candidat ou la shortlist
export async function PATCH(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const shortlist = await prisma.shortlist.findUnique({
      where: { uid: params.uid },
      include: {
        offre: { select: { clientId: true } },
      },
    })

    if (!shortlist) {
      return NextResponse.json({ error: 'Shortlist non trouvée' }, { status: 404 })
    }

    // Vérifie que la shortlist appartient au client
    if (user.role === 'CLIENT' && shortlist.offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()

    // Action sur un candidat spécifique (par ID)
    if (body.candidatId) {
      const candidat = await prisma.shortlistCandidat.findUnique({
        where: { id: body.candidatId },
        include: {
          candidature: {
            include: {
              talent: { select: { prenom: true, nom: true } },
            },
          },
        },
      })

      if (!candidat || candidat.shortlistId !== shortlist.id) {
        return NextResponse.json({ error: 'Candidat non trouvé' }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}

      if (body.retenuParClient !== undefined) updateData.retenuParClient = body.retenuParClient
      if (body.commentaireClient !== undefined) updateData.commentaireClient = body.commentaireClient

      await prisma.shortlistCandidat.update({
        where: { id: candidat.id },
        data: updateData,
      })

      // Log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CLIENT_FEEDBACK_CANDIDAT',
          entite: 'ShortlistCandidat',
          entiteId: candidat.id,
          details: JSON.parse(JSON.stringify({
            shortlistUid: shortlist.uid,
            talent: `${candidat.candidature.talent.prenom} ${candidat.candidature.talent.nom}`,
            retenuParClient: body.retenuParClient,
          })),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Feedback enregistré',
      })
    }

    // Action sur la shortlist entière
    if (body.action) {
      switch (body.action) {
        case 'valider':
          // Le client valide la shortlist (choisit un ou plusieurs candidats)
          await prisma.shortlist.update({
            where: { id: shortlist.id },
            data: {
              statut: 'FINALISEE',
            },
          })

          // Créer une notification pour les admins TRINEXTA avec email
          const adminsValider = await prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          })

          await createBulkNotificationsWithEmail(
            adminsValider.map(a => a.id),
            {
              type: 'SHORTLIST_RETOUR',
              titre: 'Shortlist validée par le client',
              message: `Le client a validé la shortlist pour l'offre`,
              lien: `/admin/shortlists/${shortlist.uid}`,
            }
          )

          return NextResponse.json({
            success: true,
            message: 'Shortlist validée',
          })

        case 'refuser':
          // Le client refuse tous les candidats - on met à jour chaque candidat
          await prisma.shortlistCandidat.updateMany({
            where: { shortlistId: shortlist.id },
            data: { retenuParClient: false },
          })

          await prisma.shortlist.update({
            where: { id: shortlist.id },
            data: { statut: 'FINALISEE' },
          })

          // Créer une notification pour les admins TRINEXTA avec email
          const adminsRefuser = await prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          })

          await createBulkNotificationsWithEmail(
            adminsRefuser.map(a => a.id),
            {
              type: 'SHORTLIST_RETOUR',
              titre: 'Shortlist refusée par le client',
              message: `Le client a refusé tous les candidats: ${body.commentaire || 'Pas de commentaire'}`,
              lien: `/admin/shortlists/${shortlist.uid}`,
            }
          )

          return NextResponse.json({
            success: true,
            message: 'Shortlist refusée',
          })

        case 'demander_plus':
          // Le client demande plus de candidats
          await prisma.shortlist.update({
            where: { id: shortlist.id },
            data: {
              notes: body.commentaire || 'Le client souhaite voir plus de candidats',
              statut: 'EN_COURS',
            },
          })

          // Créer une notification pour les admins TRINEXTA avec email
          const adminsDemander = await prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          })

          await createBulkNotificationsWithEmail(
            adminsDemander.map(a => a.id),
            {
              type: 'SHORTLIST_RETOUR',
              titre: 'Demande de candidats supplémentaires',
              message: `Le client demande plus de candidats: ${body.commentaire || ''}`,
              lien: `/admin/shortlists/${shortlist.uid}`,
            }
          )

          return NextResponse.json({
            success: true,
            message: 'Demande envoyée',
          })
      }
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Erreur PATCH /api/client/shortlists/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
