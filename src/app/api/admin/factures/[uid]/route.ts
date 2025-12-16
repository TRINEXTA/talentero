/**
 * API Admin - Gestion d'une facture spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { emettreFacture, marquerPayee, calculerMontants } from '@/lib/facturation'

// GET - Détails d'une facture
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

    const facture = await prisma.facture.findUnique({
      where: { uid },
      include: {
        client: {
          select: {
            uid: true,
            raisonSociale: true,
            logoUrl: true,
            adresse: true,
            codePostal: true,
            ville: true,
            siret: true,
          },
        },
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
    })

    if (!facture) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ facture })
  } catch (error) {
    console.error('Erreur GET /api/admin/factures/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Modifier/Actions sur une facture
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
    const { action } = body

    const facture = await prisma.facture.findUnique({
      where: { uid },
      include: { lignes: true },
    })

    if (!facture) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    switch (action) {
      case 'emettre': {
        // Émettre la facture
        if (facture.statut !== 'BROUILLON') {
          return NextResponse.json(
            { error: 'Seules les factures brouillon peuvent être émises' },
            { status: 400 }
          )
        }

        const updated = await emettreFacture(facture.id, body.dateEcheance ? new Date(body.dateEcheance) : undefined)
        return NextResponse.json({ facture: updated, message: 'Facture émise' })
      }

      case 'payer': {
        // Marquer comme payée
        if (facture.statut !== 'EMISE' && facture.statut !== 'EN_RETARD') {
          return NextResponse.json(
            { error: 'Cette facture ne peut pas être marquée comme payée' },
            { status: 400 }
          )
        }

        const { modePaiement, referencePaiement } = body
        if (!modePaiement) {
          return NextResponse.json({ error: 'Mode de paiement requis' }, { status: 400 })
        }

        const updated = await marquerPayee(facture.id, modePaiement, referencePaiement)
        return NextResponse.json({ facture: updated, message: 'Facture marquée comme payée' })
      }

      case 'annuler': {
        // Annuler la facture
        if (facture.statut === 'PAYEE') {
          return NextResponse.json(
            { error: 'Impossible d\'annuler une facture payée' },
            { status: 400 }
          )
        }

        const updated = await prisma.facture.update({
          where: { id: facture.id },
          data: { statut: 'ANNULEE' },
        })
        return NextResponse.json({ facture: updated, message: 'Facture annulée' })
      }

      case 'relancer': {
        // Relancer le client
        if (facture.statut !== 'EMISE' && facture.statut !== 'EN_RETARD') {
          return NextResponse.json(
            { error: 'Cette facture ne peut pas être relancée' },
            { status: 400 }
          )
        }

        const updated = await prisma.facture.update({
          where: { id: facture.id },
          data: {
            nbRelances: { increment: 1 },
            derniereRelance: new Date(),
          },
        })
        return NextResponse.json({ facture: updated, message: 'Relance enregistrée' })
      }

      default: {
        // Modification simple
        if (facture.statut !== 'BROUILLON') {
          return NextResponse.json(
            { error: 'Seules les factures brouillon peuvent être modifiées' },
            { status: 400 }
          )
        }

        const {
          description,
          periodeDebut,
          periodeFin,
          lignes,
          tauxTVA,
          remise,
          remiseMotif,
          notes,
          notesInternes,
        } = body

        // Recalculer les montants si les lignes ont changé
        let updateData: Record<string, unknown> = {
          ...(description && { description }),
          ...(periodeDebut && { periodeDebut: new Date(periodeDebut) }),
          ...(periodeFin && { periodeFin: new Date(periodeFin) }),
          ...(notes !== undefined && { notes }),
          ...(notesInternes !== undefined && { notesInternes }),
          ...(remiseMotif !== undefined && { remiseMotif }),
        }

        if (lignes) {
          const tva = tauxTVA ?? facture.tauxTVA
          const rem = remise ?? facture.remise ?? 0
          const { montantHT, montantTVA, montantTTC, lignesCalculees } = calculerMontants(
            lignes,
            tva,
            rem
          )

          // Supprimer les anciennes lignes et créer les nouvelles
          await prisma.ligneFacture.deleteMany({
            where: { factureId: facture.id },
          })

          await prisma.ligneFacture.createMany({
            data: lignesCalculees.map((ligne, index) => ({
              factureId: facture.id,
              description: ligne.description,
              quantite: ligne.quantite,
              unite: ligne.unite || 'jour',
              prixUnitaire: ligne.prixUnitaire,
              montantHT: ligne.montantHT,
              ordre: index,
            })),
          })

          updateData = {
            ...updateData,
            montantHT,
            montantTVA,
            montantTTC,
            tauxTVA: tva,
            remise: rem > 0 ? rem : null,
          }
        }

        const updated = await prisma.facture.update({
          where: { id: facture.id },
          data: updateData,
          include: { lignes: true },
        })

        return NextResponse.json({ facture: updated, message: 'Facture mise à jour' })
      }
    }
  } catch (error) {
    console.error('Erreur PATCH /api/admin/factures/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une facture (brouillon uniquement)
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

    const facture = await prisma.facture.findUnique({
      where: { uid },
    })

    if (!facture) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    if (facture.statut !== 'BROUILLON') {
      return NextResponse.json(
        { error: 'Seules les factures brouillon peuvent être supprimées' },
        { status: 400 }
      )
    }

    await prisma.facture.delete({ where: { uid } })

    return NextResponse.json({ success: true, message: 'Facture supprimée' })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/factures/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
