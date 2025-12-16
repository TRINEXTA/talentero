import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { updateTalentProfileSchema } from '@/lib/validations'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
      include: {
        experiences: {
          orderBy: { dateDebut: 'desc' }
        },
        formations: {
          orderBy: { annee: 'desc' }
        },
      },
    })

    if (!talent) {
      return NextResponse.json(
        { error: 'Profil talent non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile: {
        uid: talent.uid,
        email: user.email,
        prenom: talent.prenom,
        nom: talent.nom,
        telephone: talent.telephone,
        photoUrl: talent.photoUrl,
        titrePoste: talent.titrePoste,
        bio: talent.bio,
        competences: talent.competences,
        anneesExperience: talent.anneesExperience,
        tjm: talent.tjm,
        tjmMin: talent.tjmMin,
        tjmMax: talent.tjmMax,
        mobilite: talent.mobilite,
        zonesGeographiques: talent.zonesGeographiques,
        disponibilite: talent.disponibilite,
        disponibleLe: talent.disponibleLe,
        softSkills: talent.softSkills,
        langues: talent.langues,
        certifications: talent.certifications,
        linkedinUrl: talent.linkedinUrl,
        githubUrl: talent.githubUrl,
        portfolioUrl: talent.portfolioUrl,
        adresse: talent.adresse,
        codePostal: talent.codePostal,
        ville: talent.ville,
        statut: talent.statut,
        siret: talent.siret,
        raisonSociale: talent.raisonSociale,
        siretVerifie: talent.siretVerifie,
        cvUrl: talent.cvUrl,
        cvOriginalName: talent.cvOriginalName,
      },
      experiences: talent.experiences,
      formations: talent.formations,
    })
  } catch (error) {
    console.error('Erreur GET /api/talent/profile:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validation
    const validation = updateTalentProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Mise à jour du profil (prenom/nom non modifiables par le talent)
    const updatedTalent = await prisma.talent.update({
      where: { userId: user.id },
      data: {
        telephone: data.telephone,
        photoUrl: data.photoUrl,
        nationalite: data.nationalite,
        siret: data.siret || null,
        raisonSociale: data.raisonSociale || null,
        titrePoste: data.titrePoste,
        categorieProfessionnelle: data.categorieProfessionnelle as any,
        bio: data.bio,
        competences: data.competences,
        anneesExperience: data.anneesExperience,
        tjm: data.tjm,
        tjmMin: data.tjmMin,
        tjmMax: data.tjmMax,
        mobilite: data.mobilite as any,
        zonesGeographiques: data.zonesGeographiques,
        zonesIntervention: data.zonesIntervention,
        permisConduire: data.permisConduire,
        vehicule: data.vehicule,
        accepteDeplacementEtranger: data.accepteDeplacementEtranger,
        disponibilite: data.disponibilite as any,
        disponibleLe: data.disponibleLe ? new Date(data.disponibleLe) : null,
        logiciels: data.logiciels,
        frameworks: data.frameworks,
        baseDonnees: data.baseDonnees,
        methodologies: data.methodologies,
        outils: data.outils,
        softSkills: data.softSkills,
        langues: data.langues,
        loisirs: data.loisirs,
        certifications: data.certifications,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
        portfolioUrl: data.portfolioUrl,
        adresse: data.adresse,
        codePostal: data.codePostal,
        ville: data.ville,
        visiblePublic: data.visiblePublic,
        visibleVitrine: data.visibleVitrine,
      },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_PROFILE',
        entite: 'Talent',
        entiteId: updatedTalent.id,
      },
    })

    return NextResponse.json({
      success: true,
      profile: updatedTalent,
    })
  } catch (error) {
    console.error('Erreur PUT /api/talent/profile:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
