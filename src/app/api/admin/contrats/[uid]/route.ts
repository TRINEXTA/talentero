/**
 * API Admin - Gestion d'un contrat spécifique
 * CRUD et actions sur un contrat
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  envoyerPourSignature,
  terminerContrat,
  resilierContrat,
  annulerContrat,
  createAvenant,
} from '@/lib/contrats'

// GET - Détail d'un contrat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params

    const contrat = await prisma.contrat.findUnique({
      where: { uid },
      include: {
        talent: {
          select: {
            uid: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            photoUrl: true,
            telephone: true,
            siret: true,
            adresse: true,
            codePostal: true,
            ville: true,
            user: { select: { email: true } },
          },
        },
        client: {
          select: {
            uid: true,
            raisonSociale: true,
            logoUrl: true,
            siret: true,
            adresse: true,
            codePostal: true,
            ville: true,
            user: { select: { email: true } },
            contacts: {
              where: { estContactPrincipal: true },
              take: 1,
            },
          },
        },
        avenants: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!contrat) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ contrat })
  } catch (error) {
    console.error('Erreur GET /api/admin/contrats/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Modifier ou action sur un contrat
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params
    const body = await request.json()

    const contrat = await prisma.contrat.findUnique({
      where: { uid },
    })

    if (!contrat) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    // Actions spéciales
    if (body.action) {
      let result

      switch (body.action) {
        case 'envoyer':
          result = await envoyerPourSignature(contrat.id)
          return NextResponse.json({
            success: true,
            message: 'Contrat envoyé pour signature',
            contrat: result,
          })

        case 'terminer':
          result = await terminerContrat(contrat.id, body.motifFin)
          return NextResponse.json({
            success: true,
            message: 'Contrat terminé',
            contrat: result,
          })

        case 'resilier':
          if (!body.motifFin) {
            return NextResponse.json(
              { error: 'Motif de résiliation requis' },
              { status: 400 }
            )
          }
          result = await resilierContrat(contrat.id, body.motifFin)
          return NextResponse.json({
            success: true,
            message: 'Contrat résilié',
            contrat: result,
          })

        case 'annuler':
          result = await annulerContrat(contrat.id)
          return NextResponse.json({
            success: true,
            message: 'Contrat annulé',
            contrat: result,
          })

        case 'avenant':
          if (!body.objet || !body.modifications) {
            return NextResponse.json(
              { error: 'Objet et modifications requis pour l\'avenant' },
              { status: 400 }
            )
          }
          const avenant = await createAvenant({
            contratId: contrat.id,
            objet: body.objet,
            modifications: body.modifications,
            nouveauTjm: body.nouveauTjm,
            nouvelleDateFin: body.nouvelleDateFin
              ? new Date(body.nouvelleDateFin)
              : undefined,
            nouveauPlafond: body.nouveauPlafond,
          })
          return NextResponse.json({
            success: true,
            message: 'Avenant créé',
            avenant,
          })

        default:
          return NextResponse.json(
            { error: 'Action non reconnue' },
            { status: 400 }
          )
      }
    }

    // Mise à jour simple
    const updatedContrat = await prisma.contrat.update({
      where: { uid },
      data: {
        ...(body.titre && { titre: body.titre }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.lieu !== undefined && { lieu: body.lieu }),
        ...(body.mobilite && { mobilite: body.mobilite }),
        ...(body.dateDebut && { dateDebut: new Date(body.dateDebut) }),
        ...(body.dateFin !== undefined && {
          dateFin: body.dateFin ? new Date(body.dateFin) : null,
        }),
        ...(body.dureeNombre !== undefined && { dureeNombre: body.dureeNombre }),
        ...(body.dureeUnite && { dureeUnite: body.dureeUnite }),
        ...(body.renouvelable !== undefined && { renouvelable: body.renouvelable }),
        ...(body.conditionsRenouvellement !== undefined && {
          conditionsRenouvellement: body.conditionsRenouvellement,
        }),
        ...(body.preavisJours !== undefined && { preavisJours: body.preavisJours }),
        ...(body.tjm && { tjm: parseInt(body.tjm) }),
        ...(body.tauxTVA !== undefined && { tauxTVA: body.tauxTVA }),
        ...(body.plafondJours !== undefined && { plafondJours: body.plafondJours }),
        ...(body.plafondMontant !== undefined && { plafondMontant: body.plafondMontant }),
        ...(body.clauses !== undefined && { clauses: body.clauses }),
        ...(body.conditionsParticulieres !== undefined && {
          conditionsParticulieres: body.conditionsParticulieres,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.notesInternes !== undefined && { notesInternes: body.notesInternes }),
      },
      include: {
        talent: {
          select: { uid: true, prenom: true, nom: true },
        },
        client: {
          select: { uid: true, raisonSociale: true },
        },
      },
    })

    return NextResponse.json({ contrat: updatedContrat })
  } catch (error) {
    console.error('Erreur PATCH /api/admin/contrats/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer un contrat (seulement si brouillon)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params

    const contrat = await prisma.contrat.findUnique({
      where: { uid },
    })

    if (!contrat) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    if (contrat.statut !== 'BROUILLON') {
      return NextResponse.json(
        { error: 'Seuls les brouillons peuvent être supprimés' },
        { status: 400 }
      )
    }

    await prisma.contrat.delete({ where: { uid } })

    return NextResponse.json({ success: true, message: 'Contrat supprimé' })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/contrats/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
