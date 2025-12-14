import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { calculateMatchScore } from '@/lib/cv-parser'

// GET /api/offres/[slug] - Détail d'une offre
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const offre = await prisma.offre.findUnique({
      where: { slug },
      include: {
        client: {
          select: {
            uid: true,
            raisonSociale: true,
            secteurActivite: true,
            tailleEntreprise: true,
            ville: true,
            logoUrl: true,
            description: true,
          },
        },
      },
    })

    if (!offre) {
      return NextResponse.json(
        { error: 'Offre non trouvée' },
        { status: 404 }
      )
    }

    // Vérifie que l'offre est publiée (sauf pour admin/client propriétaire)
    const user = await getCurrentUser()
    const isOwner = user?.role === 'CLIENT' && user.clientId === offre.clientId
    const isAdmin = user?.role === 'ADMIN'

    if (offre.statut !== 'PUBLIEE' && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Offre non disponible' },
        { status: 403 }
      )
    }

    // Incrémente le compteur de vues
    await prisma.offre.update({
      where: { id: offre.id },
      data: { nbVues: { increment: 1 } },
    })

    // Log la vue si l'utilisateur est un talent
    if (user?.role === 'TALENT' && user.talentId) {
      await prisma.offreVue.create({
        data: {
          offreId: offre.id,
          talentId: user.talentId,
        },
      })
    }

    // Calcule le score de matching si c'est un talent connecté
    let matchScore = null
    let matchDetails = null

    if (user?.role === 'TALENT' && user.talentId) {
      const talent = await prisma.talent.findUnique({
        where: { id: user.talentId },
        select: { competences: true },
      })

      if (talent) {
        const result = calculateMatchScore(
          talent.competences,
          offre.competencesRequises,
          offre.competencesSouhaitees
        )
        matchScore = result.score
        matchDetails = {
          matchedRequired: result.matchedRequired,
          matchedOptional: result.matchedOptional,
          missingRequired: result.missingRequired,
        }
      }
    }

    // Vérifie si le talent a déjà postulé
    let alreadyApplied = false
    if (user?.role === 'TALENT' && user.talentId) {
      const existingCandidature = await prisma.candidature.findUnique({
        where: {
          offreId_talentId: {
            offreId: offre.id,
            talentId: user.talentId,
          },
        },
      })
      alreadyApplied = !!existingCandidature
    }

    return NextResponse.json({
      offre: {
        uid: offre.uid,
        slug: offre.slug,
        titre: offre.titre,
        description: offre.description,
        responsabilites: offre.responsabilites,
        profilRecherche: offre.profilRecherche,
        competencesRequises: offre.competencesRequises,
        competencesSouhaitees: offre.competencesSouhaitees,
        tjmMin: offre.tjmMin,
        tjmMax: offre.tjmMax,
        dureeNombre: offre.dureeNombre,
        dureeUnite: offre.dureeUnite,
        dateDebut: offre.dateDebut,
        dateFin: offre.dateFin,
        renouvelable: offre.renouvelable,
        lieu: offre.lieu,
        mobilite: offre.mobilite,
        experienceMin: offre.experienceMin,
        statut: offre.statut,
        publieLe: offre.publieLe,
        nbVues: offre.nbVues,
        nbCandidatures: offre.nbCandidatures,
        client: offre.client,
      },
      matchScore,
      matchDetails,
      alreadyApplied,
    })
  } catch (error) {
    console.error('Erreur GET /api/offres/[slug]:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
