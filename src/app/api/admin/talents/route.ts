/**
 * API Admin - Gestion des Talents
 * Import CV, création de comptes pré-remplis, gestion
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { parseCV } from '@/lib/cv-parser'
import { sendAccountActivationEmail } from '@/lib/microsoft-graph'
import { generateTalentCode } from '@/lib/utils'
import crypto from 'crypto'

// GET - Liste des talents avec filtres
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const statut = searchParams.get('statut') || ''
    const compteLimite = searchParams.get('compteLimite')
    const importeParAdmin = searchParams.get('importeParAdmin')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { prenom: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { competences: { hasSome: [search] } },
      ]
    }

    if (statut) {
      where.statut = statut
    }

    if (compteLimite === 'true') {
      where.compteLimite = true
    }

    if (importeParAdmin === 'true') {
      where.importeParAdmin = true
    }

    const [talents, total] = await Promise.all([
      prisma.talent.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              emailVerified: true,
              isActive: true,
              lastLoginAt: true,
              activationToken: true,
            },
          },
          _count: {
            select: {
              candidatures: true,
              matchs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.talent.count({ where }),
    ])

    return NextResponse.json({
      talents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET talents admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: error instanceof Error && error.message.includes('Non authentifié') ? 401 : 500 }
    )
  }
}

// POST - Import d'un CV et création d'un compte pré-rempli
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const formData = await request.formData()
    const cvFile = formData.get('cv') as File
    const email = formData.get('email') as string
    const sendActivation = formData.get('sendActivation') !== 'false'

    if (!cvFile) {
      return NextResponse.json({ error: 'CV requis' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    // Vérifie si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Lit le contenu du CV
    const cvBuffer = Buffer.from(await cvFile.arrayBuffer())
    const cvText = cvBuffer.toString('utf-8')

    // Parse le CV avec Claude
    const parsedData = await parseCV(cvText)

    // Génère un token d'activation
    const activationToken = crypto.randomBytes(32).toString('hex')
    const activationTokenExpiry = new Date()
    activationTokenExpiry.setDate(activationTokenExpiry.getDate() + 7) // 7 jours

    // Crée l'utilisateur et le talent en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Crée l'utilisateur sans mot de passe
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: null, // Sera défini lors de l'activation
          role: 'TALENT',
          emailVerified: false,
          activationToken,
          activationTokenExpiry,
          createdByAdmin: true,
        },
      })

      // Génère le code unique talent
      const codeUnique = await generateTalentCode()

      // Crée le profil talent avec les données parsées
      const talent = await tx.talent.create({
        data: {
          userId: user.id,
          codeUnique,
          prenom: parsedData.prenom || 'Prénom',
          nom: parsedData.nom || 'Nom',
          telephone: parsedData.telephone,
          titrePoste: parsedData.titrePoste,
          bio: parsedData.bio,
          competences: parsedData.competences,
          anneesExperience: parsedData.anneesExperience,
          certifications: parsedData.certifications,
          langues: parsedData.langues,
          softSkills: parsedData.softSkills,
          linkedinUrl: parsedData.linkedinUrl,
          githubUrl: parsedData.githubUrl,
          cvUrl: `/uploads/cv/${user.uid}_${cvFile.name}`,
          cvOriginalName: cvFile.name,
          cvParsedData: parsedData as object,
          importeParAdmin: true,
          compteLimite: true, // Pas de SIRET tant que non activé
          compteComplet: false,
        },
      })

      // Crée les expériences
      for (const exp of parsedData.experiences) {
        await tx.experience.create({
          data: {
            talentId: talent.id,
            poste: exp.poste,
            entreprise: exp.entreprise,
            lieu: exp.lieu,
            dateDebut: new Date(exp.dateDebut),
            dateFin: exp.dateFin ? new Date(exp.dateFin) : null,
            enCours: !exp.dateFin,
            description: exp.description,
            competences: exp.competences,
          },
        })
      }

      // Crée les formations
      for (const form of parsedData.formations) {
        await tx.formation.create({
          data: {
            talentId: talent.id,
            diplome: form.diplome,
            etablissement: form.etablissement,
            annee: form.annee,
          },
        })
      }

      // Log l'action
      await tx.auditLog.create({
        data: {
          action: 'IMPORT_CV_ADMIN',
          entite: 'Talent',
          entiteId: talent.id,
          details: {
            email,
            cvFile: cvFile.name,
            competencesParsees: parsedData.competences.length,
          },
        },
      })

      return { user, talent }
    })

    // Envoie l'email d'activation si demandé
    if (sendActivation) {
      await sendAccountActivationEmail(
        email,
        parsedData.prenom || 'Futur talent',
        activationToken
      )
    }

    return NextResponse.json({
      success: true,
      talent: {
        uid: result.talent.uid,
        prenom: result.talent.prenom,
        nom: result.talent.nom,
        email,
        competences: result.talent.competences,
        anneesExperience: result.talent.anneesExperience,
        activationSent: sendActivation,
      },
    })
  } catch (error) {
    console.error('Erreur import CV admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
