import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des candidatures pour une offre
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const offre = await prisma.offre.findUnique({
      where: { uid: params.uid },
      select: { id: true }
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const origine = searchParams.get('origine')

    const where: any = { offreId: offre.id }
    if (statut) {
      where.statut = statut
    }
    if (origine) {
      where.origine = origine
    }

    const candidatures = await prisma.candidature.findMany({
      where,
      orderBy: [
        { scoreMatch: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        uid: true,
        tjmPropose: true,
        motivation: true,
        scoreMatch: true,
        statut: true,
        origine: true,
        vueLe: true,
        reponduLe: true,
        notesTrinexta: true,
        createdAt: true,
        talent: {
          select: {
            uid: true,
            codeUnique: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            competences: true,
            tjm: true,
            tjmMin: true,
            tjmMax: true,
            disponibilite: true,
            ville: true,
            photoUrl: true,
            statut: true,
            user: {
              select: {
                email: true,
                isActive: true,
                lastLoginAt: true,
              }
            }
          }
        },
        entretiens: {
          orderBy: { dateProposee: 'desc' },
          take: 1,
          select: {
            uid: true,
            dateProposee: true,
            statut: true,
          }
        }
      }
    })

    // Stats par origine
    const allCandidatures = await prisma.candidature.findMany({
      where: { offreId: offre.id },
      select: { statut: true, origine: true }
    })

    // Récupérer aussi les matchs (talents matchés qui n'ont pas encore postulé)
    const matchs = await prisma.match.findMany({
      where: {
        offreId: offre.id,
        talent: {
          candidatures: {
            none: { offreId: offre.id }
          }
        }
      },
      orderBy: { score: 'desc' },
      include: {
        talent: {
          select: {
            uid: true,
            codeUnique: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            competences: true,
            tjm: true,
            disponibilite: true,
            ville: true,
            photoUrl: true,
            statut: true,
            user: {
              select: {
                email: true,
                isActive: true,
              }
            }
          }
        }
      }
    })

    // Stats par statut (utiliser allCandidatures pour avoir les stats complètes même avec filtres)
    const stats = {
      total: allCandidatures.length,
      nouvelle: allCandidatures.filter(c => c.statut === 'NOUVELLE').length,
      enRevue: allCandidatures.filter(c => c.statut === 'EN_REVUE').length,
      preSelectionne: allCandidatures.filter(c => ['PRE_SELECTIONNE', 'SHORTLIST'].includes(c.statut)).length,
      entretien: allCandidatures.filter(c => ['ENTRETIEN_DEMANDE', 'ENTRETIEN_PLANIFIE', 'ENTRETIEN_REALISE'].includes(c.statut)).length,
      acceptee: allCandidatures.filter(c => c.statut === 'ACCEPTEE').length,
      refusee: allCandidatures.filter(c => c.statut === 'REFUSEE').length,
      matchsSansCandidature: matchs.length,
      // Stats par origine
      postule: allCandidatures.filter(c => c.origine === 'POSTULE').length,
      importe: allCandidatures.filter(c => c.origine === 'IMPORTE').length,
      matchPropose: allCandidatures.filter(c => c.origine === 'MATCH_PROPOSE').length,
    }

    return NextResponse.json({
      candidatures,
      matchsSansCandidature: matchs,
      stats
    })
  } catch (error) {
    console.error('Erreur GET candidatures offre:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Mettre à jour le statut d'une candidature
export async function PATCH(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { candidatureUid, action, notes, motifRefus } = body

    const candidature = await prisma.candidature.findUnique({
      where: { uid: candidatureUid },
      include: {
        offre: { select: { id: true, uid: true, titre: true } },
        talent: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            user: { select: { id: true, email: true } }
          }
        }
      }
    })

    if (!candidature) {
      return NextResponse.json({ error: 'Candidature non trouvée' }, { status: 404 })
    }

    // Mapping des actions vers les statuts
    const actionToStatut: Record<string, string> = {
      'marquer_vue': 'VUE',
      'mettre_en_revue': 'EN_REVUE',
      'pre_selectionner': 'PRE_SELECTIONNE',
      'ajouter_shortlist': 'SHORTLIST',
      'proposer_client': 'PROPOSEE_CLIENT',
      'demander_info': 'EN_REVUE', // reste en revue mais avec une note
      'demander_entretien': 'ENTRETIEN_DEMANDE',
      'planifier_entretien': 'ENTRETIEN_PLANIFIE',
      'entretien_realise': 'ENTRETIEN_REALISE',
      'accepter': 'ACCEPTEE',
      'refuser': 'REFUSEE',
      'attente_client': 'PROPOSEE_CLIENT',
      'retirer': 'RETIREE',
    }

    const newStatut = actionToStatut[action]
    if (!newStatut) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    // Mise à jour de la candidature
    const updateData: any = {
      statut: newStatut,
      updatedAt: new Date(),
    }

    if (action === 'marquer_vue' && !candidature.vueLe) {
      updateData.vueLe = new Date()
    }

    if (notes) {
      updateData.notesTrinexta = notes
    }

    if (action === 'refuser' || action === 'accepter') {
      updateData.reponduLe = new Date()
    }

    const updated = await prisma.candidature.update({
      where: { uid: candidatureUid },
      data: updateData,
    })

    // Créer une notification pour le talent
    const notificationMessages: Record<string, { titre: string; message: string }> = {
      'pre_selectionner': {
        titre: 'Candidature présélectionnée',
        message: `Votre candidature pour "${candidature.offre.titre}" a été présélectionnée !`
      },
      'demander_entretien': {
        titre: 'Demande d\'entretien',
        message: `Un entretien est demandé pour votre candidature "${candidature.offre.titre}"`
      },
      'accepter': {
        titre: 'Candidature acceptée !',
        message: `Félicitations ! Votre candidature pour "${candidature.offre.titre}" a été retenue !`
      },
      'refuser': {
        titre: 'Candidature non retenue',
        message: `Votre candidature pour "${candidature.offre.titre}" n'a pas été retenue.${motifRefus ? ' Motif: ' + motifRefus : ''}`
      },
    }

    const notif = notificationMessages[action]
    if (notif && candidature.talent.user) {
      await prisma.notification.create({
        data: {
          userId: candidature.talent.user.id,
          type: 'STATUT_CANDIDATURE',
          titre: notif.titre,
          message: notif.message,
          lien: `/t/candidatures`,
        }
      })

      // Marquer la notification envoyée si refus
      if (action === 'refuser') {
        await prisma.candidature.update({
          where: { uid: candidatureUid },
          data: { notificationRefusEnvoyee: true }
        })
      }
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `CANDIDATURE_${action.toUpperCase()}`,
        entite: 'Candidature',
        entiteId: candidature.id,
        details: {
          offreId: candidature.offre.id,
          offreTitre: candidature.offre.titre,
          talentNom: `${candidature.talent.prenom} ${candidature.talent.nom}`,
          ancienStatut: candidature.statut,
          nouveauStatut: newStatut,
          notes,
        },
      },
    })

    return NextResponse.json({
      success: true,
      candidature: updated,
      message: `Candidature mise à jour: ${newStatut}`
    })
  } catch (error) {
    console.error('Erreur PATCH candidature:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
