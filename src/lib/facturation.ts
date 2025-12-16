/**
 * Service de Facturation - Talentero
 *
 * Gère la création, le calcul et la génération des factures
 */

import { prisma } from '@/lib/db'
import { FactureStatut } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface LigneFactureInput {
  description: string
  quantite: number
  unite?: string
  prixUnitaire: number
}

export interface CreateFactureParams {
  clientId: number
  missionId?: number
  offreId?: number
  talentId?: number
  description: string
  periodeDebut?: Date
  periodeFin?: Date
  lignes: LigneFactureInput[]
  tauxTVA?: number
  remise?: number
  remiseMotif?: string
  notes?: string
  notesInternes?: string
  dateEcheance?: Date
  createdBy?: number
}

// ============================================
// GÉNÉRATION NUMÉRO DE FACTURE
// ============================================

/**
 * Génère un numéro de facture unique (FAC-2024-0001)
 */
export async function generateNumeroFacture(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `FAC-${year}-`

  // Trouver le dernier numéro de l'année
  const lastFacture = await prisma.facture.findFirst({
    where: {
      numero: { startsWith: prefix },
    },
    orderBy: { numero: 'desc' },
  })

  let nextNumber = 1
  if (lastFacture) {
    const lastNumber = parseInt(lastFacture.numero.replace(prefix, ''))
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

// ============================================
// CALCULS
// ============================================

/**
 * Calcule les montants d'une facture
 */
export function calculerMontants(
  lignes: LigneFactureInput[],
  tauxTVA: number = 20,
  remise: number = 0
): {
  montantHT: number
  montantTVA: number
  montantTTC: number
  lignesCalculees: Array<LigneFactureInput & { montantHT: number }>
} {
  // Calculer le montant HT de chaque ligne
  const lignesCalculees = lignes.map((ligne) => ({
    ...ligne,
    montantHT: ligne.quantite * ligne.prixUnitaire,
  }))

  // Total HT avant remise
  const totalHT = lignesCalculees.reduce((sum, l) => sum + l.montantHT, 0)

  // Appliquer la remise
  const montantHT = Math.max(0, totalHT - remise)

  // Calculer TVA et TTC
  const montantTVA = Math.round(montantHT * (tauxTVA / 100) * 100) / 100
  const montantTTC = Math.round((montantHT + montantTVA) * 100) / 100

  return {
    montantHT: Math.round(montantHT * 100) / 100,
    montantTVA,
    montantTTC,
    lignesCalculees,
  }
}

// ============================================
// CRÉATION DE FACTURE
// ============================================

/**
 * Crée une nouvelle facture
 */
export async function createFacture(params: CreateFactureParams) {
  const {
    clientId,
    missionId,
    offreId,
    talentId,
    description,
    periodeDebut,
    periodeFin,
    lignes,
    tauxTVA = 20,
    remise = 0,
    remiseMotif,
    notes,
    notesInternes,
    dateEcheance,
    createdBy,
  } = params

  // Récupérer les infos client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      raisonSociale: true,
      adresse: true,
      codePostal: true,
      ville: true,
      siret: true,
    },
  })

  if (!client) {
    throw new Error('Client non trouvé')
  }

  // Générer le numéro
  const numero = await generateNumeroFacture()

  // Calculer les montants
  const { montantHT, montantTVA, montantTTC, lignesCalculees } = calculerMontants(
    lignes,
    tauxTVA,
    remise
  )

  // Calculer le nombre de jours et TJM moyen si applicable
  const nbJours = lignesCalculees.reduce((sum, l) => {
    if (l.unite === 'jour') return sum + l.quantite
    return sum
  }, 0)

  const tjmMoyen = nbJours > 0 ? Math.round(montantHT / nbJours) : undefined

  // Créer l'adresse formatée
  const clientAdresse = [client.adresse, client.codePostal, client.ville]
    .filter(Boolean)
    .join(', ')

  // Créer la facture
  const facture = await prisma.facture.create({
    data: {
      numero,
      clientId,
      missionId,
      offreId,
      talentId,
      clientNom: client.raisonSociale,
      clientAdresse: clientAdresse || undefined,
      clientSiret: client.siret || undefined,
      description,
      periodeDebut,
      periodeFin,
      nbJours: nbJours > 0 ? nbJours : undefined,
      tjm: tjmMoyen,
      montantHT,
      tauxTVA,
      montantTVA,
      montantTTC,
      remise: remise > 0 ? remise : undefined,
      remiseMotif: remise > 0 ? remiseMotif : undefined,
      notes,
      notesInternes,
      dateEcheance,
      createdBy,
      lignes: {
        create: lignesCalculees.map((ligne, index) => ({
          description: ligne.description,
          quantite: ligne.quantite,
          unite: ligne.unite || 'jour',
          prixUnitaire: ligne.prixUnitaire,
          montantHT: ligne.montantHT,
          ordre: index,
        })),
      },
    },
    include: {
      lignes: true,
      client: {
        select: {
          uid: true,
          raisonSociale: true,
        },
      },
    },
  })

  return facture
}

// ============================================
// STATISTIQUES
// ============================================

/**
 * Calcule les statistiques de facturation
 */
export async function getFacturationStats(clientId?: number) {
  const whereClause = clientId ? { clientId } : {}

  const factures = await prisma.facture.findMany({
    where: whereClause,
    select: {
      statut: true,
      montantHT: true,
      montantTTC: true,
      dateEcheance: true,
    },
  })

  const now = new Date()

  const stats = {
    total: factures.length,
    brouillons: 0,
    emises: 0,
    payees: 0,
    enRetard: 0,
    montantTotalHT: 0,
    montantTotalTTC: 0,
    montantPayeHT: 0,
    montantEnAttenteHT: 0,
    montantEnRetardHT: 0,
  }

  for (const facture of factures) {
    stats.montantTotalHT += facture.montantHT
    stats.montantTotalTTC += facture.montantTTC

    switch (facture.statut) {
      case 'BROUILLON':
        stats.brouillons++
        break
      case 'EMISE':
        stats.emises++
        stats.montantEnAttenteHT += facture.montantHT
        // Vérifier si en retard
        if (facture.dateEcheance && facture.dateEcheance < now) {
          stats.enRetard++
          stats.montantEnRetardHT += facture.montantHT
        }
        break
      case 'PAYEE':
        stats.payees++
        stats.montantPayeHT += facture.montantHT
        break
      case 'EN_RETARD':
        stats.enRetard++
        stats.montantEnRetardHT += facture.montantHT
        break
    }
  }

  return {
    ...stats,
    montantTotalHT: Math.round(stats.montantTotalHT * 100) / 100,
    montantTotalTTC: Math.round(stats.montantTotalTTC * 100) / 100,
    montantPayeHT: Math.round(stats.montantPayeHT * 100) / 100,
    montantEnAttenteHT: Math.round(stats.montantEnAttenteHT * 100) / 100,
    montantEnRetardHT: Math.round(stats.montantEnRetardHT * 100) / 100,
  }
}

// ============================================
// MISE À JOUR STATUTS
// ============================================

/**
 * Met à jour les factures en retard
 */
export async function updateFacturesEnRetard() {
  const now = new Date()

  const result = await prisma.facture.updateMany({
    where: {
      statut: 'EMISE',
      dateEcheance: { lt: now },
    },
    data: {
      statut: 'EN_RETARD',
    },
  })

  return result.count
}

/**
 * Marque une facture comme payée
 */
export async function marquerPayee(
  factureId: number,
  modePaiement: string,
  referencePaiement?: string
) {
  return prisma.facture.update({
    where: { id: factureId },
    data: {
      statut: 'PAYEE',
      datePaiement: new Date(),
      modePaiement: modePaiement as never,
      referencePaiement,
    },
  })
}

/**
 * Émet une facture (passe de BROUILLON à EMISE)
 */
export async function emettreFacture(factureId: number, dateEcheance?: Date) {
  const echeance = dateEcheance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours par défaut

  return prisma.facture.update({
    where: { id: factureId },
    data: {
      statut: 'EMISE',
      dateEmission: new Date(),
      dateEcheance: echeance,
    },
  })
}
