import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createOffreSchema } from '@/lib/validations'
import { generateMissionCode } from '@/lib/utils'
import slugify from 'slugify'

// GET /api/offres - Liste des offres publiques
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    // Support pour 'competence' (singulier) et 'competences' (pluriel)
    const competenceParam = searchParams.get('competence') || searchParams.get('competences') || ''
    const competences = competenceParam.split(',').map(c => c.trim()).filter(Boolean)
    const mobilite = searchParams.get('mobilite')
    const lieu = searchParams.get('lieu')
    const tjmMin = searchParams.get('tjmMin') ? parseInt(searchParams.get('tjmMin')!) : undefined
    const tjmMax = searchParams.get('tjmMax') ? parseInt(searchParams.get('tjmMax')!) : undefined

    const skip = (page - 1) * limit

    // Récupérer le profil du talent connecté pour le matching
    let talentCompetences: string[] = []
    let talentExperience: number | null = null
    try {
      const user = await getCurrentUser()
      if (user && user.role === 'TALENT') {
        const talent = await prisma.talent.findUnique({
          where: { userId: user.id },
          select: { competences: true, anneesExperience: true }
        })
        if (talent) {
          talentCompetences = talent.competences.map(c => c.toLowerCase())
          talentExperience = talent.anneesExperience
        }
      }
    } catch {
      // Pas connecté ou pas un talent, on continue sans matching
    }

    // Construction des filtres
    const where: any = {
      statut: 'PUBLIEE',
      visiblePublic: true,
    }

    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (competences.length > 0) {
      where.competencesRequises = {
        hasSome: competences,
      }
    }

    if (mobilite) {
      where.mobilite = mobilite
    }

    if (lieu) {
      where.OR = [
        ...(where.OR || []),
        { lieu: { contains: lieu, mode: 'insensitive' } },
        { ville: { contains: lieu, mode: 'insensitive' } },
        { secteur: { contains: lieu, mode: 'insensitive' } },
      ]
    }

    if (tjmMin) {
      where.tjmMax = { gte: tjmMin }
    }

    if (tjmMax) {
      where.tjmMin = { lte: tjmMax }
    }

    // Requête avec pagination
    const [offres, total] = await Promise.all([
      prisma.offre.findMany({
        where,
        orderBy: { publieLe: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          uid: true,
          slug: true,
          titre: true,
          description: true,
          competencesRequises: true,
          competencesSouhaitees: true,
          tjmMin: true,
          tjmMax: true,
          dureeNombre: true,
          dureeUnite: true,
          dateDebut: true,
          lieu: true,
          mobilite: true,
          experienceMin: true,
          publieLe: true,
          nbVues: true,
          client: {
            select: {
              raisonSociale: true,
              secteurActivite: true,
              logoUrl: true,
            },
          },
        },
      }),
      prisma.offre.count({ where }),
    ])

    // Calcul du score de matching pour chaque offre si on a les compétences du talent
    const offresWithMatch = offres.map(offre => {
      let matchScore = 0
      let matchDetails: { matched: string[], missing: string[] } | null = null

      if (talentCompetences.length > 0 && offre.competencesRequises.length > 0) {
        const offreComps = offre.competencesRequises.map((c: string) => c.toLowerCase())
        const matched = offreComps.filter((c: string) => talentCompetences.some(tc => tc.includes(c) || c.includes(tc)))
        const missing = offreComps.filter((c: string) => !talentCompetences.some(tc => tc.includes(c) || c.includes(tc)))

        // Score basé sur les compétences requises matchées
        matchScore = Math.round((matched.length / offreComps.length) * 100)

        // Bonus pour l'expérience si elle correspond
        if (talentExperience && offre.experienceMin) {
          if (talentExperience >= offre.experienceMin) {
            matchScore = Math.min(100, matchScore + 10)
          } else {
            matchScore = Math.max(0, matchScore - 15)
          }
        }

        matchDetails = {
          matched: matched.map((c: string) => c),
          missing: missing.map((c: string) => c)
        }
      }

      return {
        ...offre,
        matchScore: matchScore > 0 ? matchScore : null,
        matchDetails
      }
    })

    // Trier par score de matching si disponible
    if (talentCompetences.length > 0) {
      offresWithMatch.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    }

    return NextResponse.json({
      offres: offresWithMatch,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/offres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/offres - Créer une offre (client ou admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validation
    const validation = createOffreSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Génère un slug unique
    const baseSlug = slugify(data.titre, { lower: true, strict: true })
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const slug = `${baseSlug}-${randomSuffix}`

    // Génère le code unique mission
    const codeUnique = await generateMissionCode()

    // Crée l'offre
    const offre = await prisma.offre.create({
      data: {
        codeUnique,
        slug,
        titre: data.titre,
        description: data.description,
        responsabilites: data.responsabilites,
        profilRecherche: data.profilRecherche,
        competencesRequises: data.competencesRequises,
        competencesSouhaitees: data.competencesSouhaitees || [],
        tjmMin: data.tjmMin,
        tjmMax: data.tjmMax,
        dureeNombre: data.dureeNombre,
        dureeUnite: data.dureeUnite || 'MOIS',
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        renouvelable: data.renouvelable || false,
        lieu: data.lieu,
        codePostal: data.codePostal,
        mobilite: data.mobilite as any || 'FLEXIBLE',
        experienceMin: data.experienceMin,
        clientId: user.role === 'CLIENT' ? user.clientId : null,
        createdByAdmin: user.role === 'ADMIN',
        statut: user.role === 'ADMIN' ? 'PUBLIEE' : 'EN_ATTENTE_VALIDATION', // Admin publie directement
        publieLe: user.role === 'ADMIN' ? new Date() : null,
      },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_OFFRE',
        entite: 'Offre',
        entiteId: offre.id,
        details: { titre: data.titre },
      },
    })

    // Si créée par un client, notifier les admins
    if (user.role === 'CLIENT') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      })

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEME',
            titre: 'Nouvelle offre à valider',
            message: `L'offre "${data.titre}" est en attente de validation.`,
            lien: `/admin/offres/${offre.uid}`,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      offre: {
        uid: offre.uid,
        slug: offre.slug,
        titre: offre.titre,
        statut: offre.statut,
      },
    })
  } catch (error) {
    console.error('Erreur POST /api/offres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
