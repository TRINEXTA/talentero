/**
 * API Admin - Envoi d'emails d'activation aux talents
 * Étape 2 du processus d'import: après revue des profils, envoi des emails
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendProfessionalActivationEmail } from '@/lib/microsoft-graph'

interface SendActivationRequest {
  talentIds: number[]
  offreId?: number // Optionnel: si on veut lier à une offre
}

// POST - Envoyer les emails d'activation à plusieurs talents
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const body: SendActivationRequest = await request.json()
    const { talentIds, offreId } = body

    if (!talentIds || talentIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucun talent sélectionné' },
        { status: 400 }
      )
    }

    // Vérifie l'offre si spécifiée
    let offre = null
    if (offreId) {
      offre = await prisma.offre.findUnique({
        where: { id: offreId }
      })
      if (!offre) {
        return NextResponse.json(
          { error: 'Offre non trouvée' },
          { status: 404 }
        )
      }
    }

    // Récupère les talents avec leurs utilisateurs
    const talents = await prisma.talent.findMany({
      where: {
        id: { in: talentIds }
      },
      include: {
        user: true,
        experiences: {
          orderBy: { dateDebut: 'desc' },
          take: 3
        },
        formations: {
          orderBy: { annee: 'desc' },
          take: 2
        },
        _count: {
          select: {
            experiences: true,
            formations: true
          }
        }
      }
    })

    if (talents.length === 0) {
      return NextResponse.json(
        { error: 'Aucun talent trouvé' },
        { status: 404 }
      )
    }

    const results: {
      talentId: number
      email: string
      prenom: string
      nom: string
      success: boolean
      error?: string
      alreadySent?: boolean
    }[] = []

    for (const talent of talents) {
      try {
        // Vérifie si l'email a déjà été envoyé
        if (talent.activationEmailEnvoye) {
          results.push({
            talentId: talent.id,
            email: talent.user.email,
            prenom: talent.prenom,
            nom: talent.nom,
            success: false,
            error: 'Email d\'activation déjà envoyé',
            alreadySent: true
          })
          continue
        }

        // Vérifie que le compte n'est pas déjà activé
        if (talent.user.emailVerified) {
          results.push({
            talentId: talent.id,
            email: talent.user.email,
            prenom: talent.prenom,
            nom: talent.nom,
            success: false,
            error: 'Compte déjà activé'
          })
          continue
        }

        // Vérifie qu'il y a bien un token d'activation
        if (!talent.user.activationToken) {
          results.push({
            talentId: talent.id,
            email: talent.user.email,
            prenom: talent.prenom,
            nom: talent.nom,
            success: false,
            error: 'Token d\'activation manquant'
          })
          continue
        }

        // Si une offre est spécifiée, créer la candidature si elle n'existe pas
        if (offre) {
          const existingCandidature = await prisma.candidature.findUnique({
            where: {
              offreId_talentId: {
                offreId: offre.id,
                talentId: talent.id
              }
            }
          })

          if (!existingCandidature) {
            await prisma.candidature.create({
              data: {
                offreId: offre.id,
                talentId: talent.id,
                statut: 'NOUVELLE',
                notesTrinexta: 'Assigné via import en masse'
              }
            })

            await prisma.offre.update({
              where: { id: offre.id },
              data: { nbCandidatures: { increment: 1 } }
            })
          }
        }

        // Envoie l'email professionnel d'activation
        const emailSent = await sendProfessionalActivationEmail(
          talent.user.email,
          talent.prenom,
          talent.nom,
          talent.user.activationToken,
          {
            titrePoste: talent.titrePoste,
            competences: talent.competences.slice(0, 8),
            anneesExperience: talent.anneesExperience,
            langues: talent.langues,
            certifications: talent.certifications.slice(0, 5),
            experiences: talent.experiences.map(exp => ({
              poste: exp.poste,
              entreprise: exp.entreprise || '',
              periode: formatPeriode(exp.dateDebut, exp.dateFin)
            })),
            formations: talent.formations.map(form => ({
              diplome: form.diplome,
              etablissement: form.etablissement,
              annee: form.annee
            })),
            experiencesCount: talent._count.experiences,
            formationsCount: talent._count.formations
          },
          offre ? {
            titre: offre.titre,
            slug: offre.slug
          } : undefined
        )

        if (emailSent) {
          // Met à jour le statut d'envoi
          await prisma.talent.update({
            where: { id: talent.id },
            data: {
              activationEmailEnvoye: true,
              activationEmailEnvoyeLe: new Date()
            }
          })

          // Log l'action
          await prisma.auditLog.create({
            data: {
              action: 'SEND_ACTIVATION_EMAIL',
              entite: 'Talent',
              entiteId: talent.id,
              details: {
                email: talent.user.email,
                offreId: offre?.id || null,
                offreTitre: offre?.titre || null
              }
            }
          })

          results.push({
            talentId: talent.id,
            email: talent.user.email,
            prenom: talent.prenom,
            nom: talent.nom,
            success: true
          })
        } else {
          results.push({
            talentId: talent.id,
            email: talent.user.email,
            prenom: talent.prenom,
            nom: talent.nom,
            success: false,
            error: 'Erreur lors de l\'envoi de l\'email'
          })
        }
      } catch (error) {
        console.error(`Erreur envoi activation ${talent.user.email}:`, error)
        results.push({
          talentId: talent.id,
          email: talent.user.email,
          prenom: talent.prenom,
          nom: talent.nom,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    }

    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success && !r.alreadySent).length
    const alreadySent = results.filter(r => r.alreadySent).length

    return NextResponse.json({
      success: true,
      summary: {
        total: talentIds.length,
        sent,
        failed,
        alreadySent
      },
      results
    })

  } catch (error) {
    console.error('Erreur send-activation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

function formatPeriode(dateDebut: Date, dateFin: Date | null): string {
  const formatDate = (d: Date) => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    return `${mois[d.getMonth()]} ${d.getFullYear()}`
  }

  if (!dateFin) {
    return `${formatDate(dateDebut)} - Présent`
  }
  return `${formatDate(dateDebut)} - ${formatDate(dateFin)}`
}
