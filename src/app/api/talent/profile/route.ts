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

    // Helper pour convertir string en number (nullable) - pour tjm, tjmMin, tjmMax
    const toNumberNullable = (val: string | number | null | undefined): number | null | undefined => {
      if (val === null) return null  // Explicitement null = on veut effacer la valeur
      if (val === undefined || val === '') return undefined  // Non défini = ne pas modifier
      const num = typeof val === 'string' ? parseFloat(val) : val
      return isNaN(num) ? null : num
    }

    // Helper pour convertir string en number (non-nullable) - pour anneesExperience
    const toNumberRequired = (val: string | number | null | undefined): number | undefined => {
      if (val === null || val === undefined || val === '') return undefined  // Ne pas modifier
      const num = typeof val === 'string' ? parseInt(val, 10) : val
      return isNaN(num) ? undefined : num
    }

    // Mise à jour du profil (prenom/nom non modifiables par le talent)
    const updatedTalent = await prisma.talent.update({
      where: { userId: user.id },
      data: {
        telephone: data.telephone ?? null,
        photoUrl: data.photoUrl ?? null,
        nationalite: data.nationalite ?? null,
        siret: data.siret ?? null,
        raisonSociale: data.raisonSociale ?? null,
        titrePoste: data.titrePoste ?? null,
        categorieProfessionnelle: data.categorieProfessionnelle ?? null,
        bio: data.bio ?? null,
        competences: data.competences ?? [],
        anneesExperience: toNumberRequired(data.anneesExperience),
        tjm: toNumberNullable(data.tjm),
        tjmMin: toNumberNullable(data.tjmMin),
        tjmMax: toNumberNullable(data.tjmMax),
        mobilite: data.mobilite && data.mobilite !== null ? data.mobilite : undefined,
        zonesGeographiques: data.zonesGeographiques ?? [],
        zonesIntervention: data.zonesIntervention ?? [],
        permisConduire: data.permisConduire ?? undefined,
        vehicule: data.vehicule ?? undefined,
        accepteDeplacementEtranger: data.accepteDeplacementEtranger ?? undefined,
        disponibilite: data.disponibilite && data.disponibilite !== null ? data.disponibilite : undefined,
        disponibleLe: data.disponibleLe ? new Date(data.disponibleLe) : null,
        logiciels: data.logiciels ?? [],
        frameworks: data.frameworks ?? [],
        baseDonnees: data.baseDonnees ?? [],
        methodologies: data.methodologies ?? [],
        outils: data.outils ?? [],
        softSkills: data.softSkills ?? [],
        langues: data.langues ?? [],
        loisirs: data.loisirs ?? [],
        certifications: data.certifications ?? [],
        linkedinUrl: data.linkedinUrl ?? null,
        githubUrl: data.githubUrl ?? null,
        portfolioUrl: data.portfolioUrl ?? null,
        adresse: data.adresse ?? null,
        codePostal: data.codePostal ?? null,
        ville: data.ville ?? null,
        visiblePublic: data.visiblePublic ?? undefined,
        visibleVitrine: data.visibleVitrine ?? undefined,
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
