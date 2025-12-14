/**
 * API Client - Gestion d'une Offre spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Détails d'une offre
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const offre = await prisma.offre.findUnique({
      where: { uid: params.uid },
      include: {
        client: {
          select: {
            uid: true,
            raisonSociale: true,
          },
        },
        candidatures: {
          orderBy: { scoreMatch: 'desc' },
          include: {
            talent: {
              select: {
                uid: true,
                prenom: true,
                nom: true,
                titrePoste: true,
                photoUrl: true,
                competences: true,
                tjm: true,
                disponibilite: true,
                ville: true,
              },
            },
          },
        },
        shortlist: {
          select: {
            uid: true,
            statut: true,
            envoyeeLe: true,
            notes: true,
            createdAt: true,
            _count: {
              select: { candidats: true },
            },
          },
        },
        _count: {
          select: {
            candidatures: true,
            matchs: true,
          },
        },
      },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    // Vérifie que l'offre appartient au client
    if (user.role === 'CLIENT' && offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ offre })
  } catch (error) {
    console.error('Erreur GET /api/client/offres/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Mettre à jour une offre
export async function PATCH(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const offre = await prisma.offre.findUnique({
      where: { uid: params.uid },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    // Vérifie que l'offre appartient au client
    if (user.role === 'CLIENT' && offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()

    // Si c'est une action spéciale
    if (body.action) {
      switch (body.action) {
        case 'publier':
          // Vérifie que l'offre peut être publiée
          if (!offre.titre || !offre.description) {
            return NextResponse.json(
              { error: 'Titre et description requis pour publier' },
              { status: 400 }
            )
          }

          const offrePubliee = await prisma.offre.update({
            where: { id: offre.id },
            data: {
              statut: 'PUBLIEE',
              publieLe: new Date(),
            },
          })

          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'PUBLISH_OFFRE',
              entite: 'Offre',
              entiteId: offre.id,
              details: JSON.parse(JSON.stringify({ titre: offre.titre })),
            },
          })

          return NextResponse.json({
            success: true,
            message: 'Offre publiée',
            offre: { uid: offrePubliee.uid, statut: offrePubliee.statut },
          })

        case 'cloturer':
          const offreCloturee = await prisma.offre.update({
            where: { id: offre.id },
            data: { statut: 'FERMEE' },
          })

          return NextResponse.json({
            success: true,
            message: 'Offre clôturée',
            offre: { uid: offreCloturee.uid, statut: offreCloturee.statut },
          })

        case 'archiver':
          const offreArchivee = await prisma.offre.update({
            where: { id: offre.id },
            data: { statut: 'EXPIREE' },
          })

          return NextResponse.json({
            success: true,
            message: 'Offre archivée',
            offre: { uid: offreArchivee.uid, statut: offreArchivee.statut },
          })

        case 'dupliquer':
          const newOffre = await prisma.offre.create({
            data: {
              clientId: offre.clientId,
              titre: `${offre.titre} (copie)`,
              slug: `${offre.slug}-copie-${Date.now()}`,
              description: offre.description,
              responsabilites: offre.responsabilites,
              profilRecherche: offre.profilRecherche,
              competencesRequises: offre.competencesRequises,
              competencesSouhaitees: offre.competencesSouhaitees,
              experienceMin: offre.experienceMin,
              tjmMin: offre.tjmMin,
              tjmMax: offre.tjmMax,
              tjmClient: offre.tjmClient,
              tjmAffiche: offre.tjmAffiche,
              lieu: offre.lieu,
              mobilite: offre.mobilite,
              dureeJours: offre.dureeJours,
              dateDebut: offre.dateDebut,
              dateFin: offre.dateFin,
              renouvelable: offre.renouvelable,
              statut: 'BROUILLON',
            },
          })

          return NextResponse.json({
            success: true,
            message: 'Offre dupliquée',
            offre: { uid: newOffre.uid, slug: newOffre.slug },
          })
      }
    }

    // Mise à jour normale
    const updateData: Record<string, unknown> = {}

    if (body.titre !== undefined) updateData.titre = body.titre
    if (body.description !== undefined) updateData.description = body.description
    if (body.responsabilites !== undefined) updateData.responsabilites = body.responsabilites
    if (body.profilRecherche !== undefined) updateData.profilRecherche = body.profilRecherche
    if (body.competencesRequises !== undefined) updateData.competencesRequises = body.competencesRequises
    if (body.competencesSouhaitees !== undefined) updateData.competencesSouhaitees = body.competencesSouhaitees
    if (body.experienceMin !== undefined) updateData.experienceMin = body.experienceMin
    if (body.tjmMin !== undefined) updateData.tjmMin = body.tjmMin
    if (body.tjmMax !== undefined) updateData.tjmMax = body.tjmMax
    if (body.tjmClient !== undefined) updateData.tjmClient = body.tjmClient
    if (body.tjmAffiche !== undefined) updateData.tjmAffiche = body.tjmAffiche
    if (body.lieu !== undefined) updateData.lieu = body.lieu
    if (body.mobilite !== undefined) updateData.mobilite = body.mobilite
    if (body.dureeJours !== undefined) updateData.dureeJours = body.dureeJours
    if (body.dateDebut !== undefined) updateData.dateDebut = body.dateDebut ? new Date(body.dateDebut) : null
    if (body.dateFin !== undefined) updateData.dateFin = body.dateFin ? new Date(body.dateFin) : null
    if (body.renouvelable !== undefined) updateData.renouvelable = body.renouvelable

    const offreUpdated = await prisma.offre.update({
      where: { id: offre.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      offre: {
        uid: offreUpdated.uid,
        titre: offreUpdated.titre,
        statut: offreUpdated.statut,
      },
    })
  } catch (error) {
    console.error('Erreur PATCH /api/client/offres/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une offre (brouillon uniquement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const offre = await prisma.offre.findUnique({
      where: { uid: params.uid },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    // Vérifie que l'offre appartient au client
    if (user.role === 'CLIENT' && offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Ne peut supprimer que les brouillons
    if (offre.statut !== 'BROUILLON') {
      return NextResponse.json(
        { error: 'Seuls les brouillons peuvent être supprimés. Archivez plutôt cette offre.' },
        { status: 400 }
      )
    }

    await prisma.offre.delete({
      where: { id: offre.id },
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_OFFRE',
        entite: 'Offre',
        entiteId: offre.id,
        details: JSON.parse(JSON.stringify({ titre: offre.titre })),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Offre supprimée',
    })
  } catch (error) {
    console.error('Erreur DELETE /api/client/offres/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
