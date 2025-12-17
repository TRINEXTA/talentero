import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Obtenir une candidature par UID
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const candidature = await prisma.candidature.findUnique({
      where: { uid: params.uid },
      include: {
        offre: {
          select: {
            id: true,
            uid: true,
            codeUnique: true,
            titre: true,
            description: true,
            statut: true,
            typeOffre: true,
            competencesRequises: true,
            competencesSouhaitees: true,
            tjmMin: true,
            tjmMax: true,
            lieu: true,
            ville: true,
            mobilite: true,
            dateDebut: true,
            dureeNombre: true,
            dureeUnite: true,
            client: {
              select: {
                uid: true,
                raisonSociale: true,
              }
            }
          }
        },
        talent: {
          select: {
            id: true,
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
            telephone: true,
            linkedinUrl: true,
            cvUrl: true,
            experience: true,
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
          select: {
            uid: true,
            dateProposee: true,
            statut: true,
            type: true,
            notes: true,
          }
        }
      }
    })

    if (!candidature) {
      return NextResponse.json({ error: 'Candidature non trouvee' }, { status: 404 })
    }

    return NextResponse.json({ candidature })
  } catch (error) {
    console.error('Erreur GET candidature:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Mettre a jour une candidature
export async function PATCH(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notes, motifRefus } = body

    const candidature = await prisma.candidature.findUnique({
      where: { uid: params.uid },
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
      return NextResponse.json({ error: 'Candidature non trouvee' }, { status: 404 })
    }

    // Mapping des actions vers les statuts
    const actionToStatut: Record<string, string> = {
      'marquer_vue': 'VUE',
      'mettre_en_revue': 'EN_REVUE',
      'pre_selectionner': 'PRE_SELECTIONNE',
      'ajouter_shortlist': 'SHORTLIST',
      'proposer_client': 'PROPOSEE_CLIENT',
      'demander_info': 'EN_REVUE',
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

    // Mise a jour de la candidature
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
      where: { uid: params.uid },
      data: updateData,
    })

    // Creer une notification pour le talent
    const notificationMessages: Record<string, { titre: string; message: string }> = {
      'pre_selectionner': {
        titre: 'Candidature preselectionnee',
        message: `Votre candidature pour "${candidature.offre.titre}" a ete preselectionnee !`
      },
      'demander_entretien': {
        titre: 'Demande d\'entretien',
        message: `Un entretien est demande pour votre candidature "${candidature.offre.titre}"`
      },
      'accepter': {
        titre: 'Candidature acceptee !',
        message: `Felicitations ! Votre candidature pour "${candidature.offre.titre}" a ete retenue !`
      },
      'refuser': {
        titre: 'Candidature non retenue',
        message: `Votre candidature pour "${candidature.offre.titre}" n'a pas ete retenue.${motifRefus ? ' Motif: ' + motifRefus : ''}`
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

      if (action === 'refuser') {
        await prisma.candidature.update({
          where: { uid: params.uid },
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
      message: `Candidature mise a jour: ${newStatut}`
    })
  } catch (error) {
    console.error('Erreur PATCH candidature:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
