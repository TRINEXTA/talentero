import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupère les statistiques de base
    const [
      totalTalents,
      totalClients,
      totalOffres,
      totalCandidatures,
      clientsEnAttente,
      offresEnAttente,
      candidaturesNouvelles,
      // Talent status breakdown
      talentsActifs,
      talentsEnMission,
      talentsInactifs,
      talentsSuspendus,
      // Offres breakdown
      offresPubliees,
      offresPourvues,
      // NOUVEAU: Comptes non activés (en attente d'activation)
      talentsNonActives,
      talentsActifsReels, // Actifs ET compte activé
    ] = await Promise.all([
      prisma.talent.count(),
      prisma.client.count(),
      prisma.offre.count(),
      prisma.candidature.count(),
      prisma.client.count({ where: { statut: 'EN_ATTENTE' } }),
      prisma.offre.count({ where: { statut: 'EN_ATTENTE_VALIDATION' } }),
      prisma.candidature.count({ where: { statut: 'NOUVELLE' } }),
      // Talent status counts
      prisma.talent.count({ where: { statut: 'ACTIF' } }),
      prisma.talent.count({ where: { statut: 'EN_MISSION' } }),
      prisma.talent.count({ where: { statut: 'INACTIF' } }),
      prisma.talent.count({ where: { statut: 'SUSPENDU' } }),
      // Offres counts
      prisma.offre.count({ where: { statut: 'PUBLIEE' } }),
      prisma.offre.count({ where: { statut: 'POURVUE' } }),
      // Comptes non activés (emailVerified = false)
      prisma.talent.count({
        where: {
          user: { emailVerified: false, activationToken: { not: null } }
        }
      }),
      // Talents vraiment actifs (statut ACTIF + compte activé)
      prisma.talent.count({
        where: {
          statut: 'ACTIF',
          user: { isActive: true, emailVerified: true }
        }
      }),
    ])

    // Get recent activities
    const recentCandidatures = await prisma.candidature.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        talent: {
          select: { prenom: true, nom: true, uid: true }
        },
        offre: {
          select: { titre: true, uid: true }
        }
      }
    })

    const recentTalents = await prisma.talent.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        uid: true,
        prenom: true,
        nom: true,
        titrePoste: true,
        statut: true,
        createdAt: true,
        importeParAdmin: true,
      }
    })

    return NextResponse.json({
      totalTalents,
      totalClients,
      totalOffres,
      totalCandidatures,
      clientsEnAttente,
      offresEnAttente,
      candidaturesNouvelles,
      // Status breakdown
      talentsByStatus: {
        actifs: talentsActifs,
        actifsReels: talentsActifsReels, // NOUVEAU: vraiment disponibles pour matching
        enMission: talentsEnMission,
        inactifs: talentsInactifs,
        suspendus: talentsSuspendus,
        nonActives: talentsNonActives, // NOUVEAU: en attente d'activation
      },
      offresByStatus: {
        publiees: offresPubliees,
        pourvues: offresPourvues,
        enAttente: offresEnAttente,
      },
      // Recent activities
      recentCandidatures: recentCandidatures.map(c => ({
        uid: c.uid,
        talentNom: `${c.talent.prenom} ${c.talent.nom}`,
        talentUid: c.talent.uid,
        offreTitre: c.offre.titre,
        offreUid: c.offre.uid,
        statut: c.statut,
        createdAt: c.createdAt,
      })),
      recentTalents: recentTalents.map(t => ({
        uid: t.uid,
        nom: `${t.prenom} ${t.nom}`,
        titrePoste: t.titrePoste,
        statut: t.statut,
        importeParAdmin: t.importeParAdmin,
        createdAt: t.createdAt,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/stats:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
