/**
 * API Client - Statistiques Dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    if (!user.clientId) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    // Récupère les stats
    const [
      offresActives,
      totalCandidatures,
      candidaturesNouvelles,
      shortlistsEnCours,
      offresRecentes,
      candidaturesRecentes,
    ] = await Promise.all([
      // Offres publiées
      prisma.offre.count({
        where: {
          clientId: user.clientId,
          statut: 'PUBLIEE'
        },
      }),

      // Total candidatures sur les offres du client
      prisma.candidature.count({
        where: {
          offre: { clientId: user.clientId },
        },
      }),

      // Candidatures nouvelles (non traitées)
      prisma.candidature.count({
        where: {
          offre: { clientId: user.clientId },
          statut: 'NOUVELLE',
        },
      }),

      // Shortlists en cours
      prisma.shortlist.count({
        where: {
          offre: { clientId: user.clientId },
          statut: { in: ['EN_COURS', 'PRETE', 'ENVOYEE', 'EN_ATTENTE_RETOUR'] },
        },
      }),

      // 5 dernières offres
      prisma.offre.findMany({
        where: { clientId: user.clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          uid: true,
          slug: true,
          titre: true,
          statut: true,
          nbCandidatures: true,
          nbVues: true,
          createdAt: true,
        },
      }),

      // 5 dernières candidatures
      prisma.candidature.findMany({
        where: {
          offre: { clientId: user.clientId },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          offre: {
            select: {
              uid: true,
              slug: true,
              titre: true,
            },
          },
          talent: {
            select: {
              uid: true,
              codeUnique: true,
              titrePoste: true,
              competences: true,
              // PAS de nom, prenom, photo - anonymisation pour le client
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        offresActives,
        totalCandidatures,
        candidaturesNouvelles,
        shortlistsEnCours,
      },
      offresRecentes,
      // Anonymiser les candidatures pour le client
      candidaturesRecentes: candidaturesRecentes.map((c, index) => ({
        uid: c.uid,
        statut: c.statut,
        scoreMatch: c.scoreMatch,
        createdAt: c.createdAt,
        offre: c.offre,
        talent: {
          uid: c.talent.uid,
          // Afficher le code unique au lieu du nom
          codeUnique: c.talent.codeUnique || `CANDIDAT-${index + 1}`,
          displayName: `Candidat ${c.talent.codeUnique || (index + 1)}`,
          titrePoste: c.talent.titrePoste,
          // PAS de photo, nom, prénom
          competences: c.talent.competences.slice(0, 5),
        },
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/client/stats:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
