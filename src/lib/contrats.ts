/**
 * Service de gestion des contrats
 * Génération, signature et suivi des contrats
 */

import { prisma } from '@/lib/db'
import { ContratStatut, TypeContrat, Mobilite, DureeUnite } from '@prisma/client'
import { createNotification } from '@/lib/notifications'

// ==========================================
// TYPES
// ==========================================

interface CreateContratInput {
  talentId: number
  clientId: number
  offreId?: number
  candidatureId?: number
  missionId?: number
  typeContrat?: TypeContrat
  titre: string
  description?: string
  lieu?: string
  mobilite?: Mobilite
  dateDebut: Date
  dateFin?: Date
  dureeNombre?: number
  dureeUnite?: DureeUnite
  renouvelable?: boolean
  conditionsRenouvellement?: string
  preavisJours?: number
  tjm: number
  tauxTVA?: number
  plafondJours?: number
  plafondMontant?: number
  clauses?: Array<{ titre: string; contenu: string }>
  conditionsParticulieres?: string
  notes?: string
  notesInternes?: string
  createdBy?: number
}

interface ContratStats {
  total: number
  brouillons: number
  enAttenteSignature: number
  actifs: number
  termines: number
  resilies: number
}

// ==========================================
// GÉNÉRATION NUMÉRO DE CONTRAT
// ==========================================

export async function generateNumeroContrat(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `CTR-${year}-`

  // Trouver le dernier numéro de l'année
  const lastContrat = await prisma.contrat.findFirst({
    where: {
      numero: { startsWith: prefix },
    },
    orderBy: { numero: 'desc' },
  })

  let nextNumber = 1
  if (lastContrat) {
    const lastNumber = parseInt(lastContrat.numero.replace(prefix, ''))
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

export async function generateNumeroAvenant(contratNumero: string): Promise<string> {
  const prefix = `AVN-${contratNumero}-`

  const lastAvenant = await prisma.avenant.findFirst({
    where: {
      numero: { startsWith: prefix },
    },
    orderBy: { numero: 'desc' },
  })

  let nextNumber = 1
  if (lastAvenant) {
    const lastNumber = parseInt(lastAvenant.numero.replace(prefix, ''))
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(2, '0')}`
}

// ==========================================
// CRÉATION DE CONTRAT
// ==========================================

export async function createContrat(input: CreateContratInput) {
  // Récupérer les infos du talent
  const talent = await prisma.talent.findUnique({
    where: { id: input.talentId },
    select: {
      prenom: true,
      nom: true,
      siret: true,
      adresse: true,
      codePostal: true,
      ville: true,
    },
  })

  if (!talent) {
    throw new Error('Talent non trouvé')
  }

  // Récupérer les infos du client
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: {
      raisonSociale: true,
      siret: true,
      adresse: true,
      codePostal: true,
      ville: true,
    },
  })

  if (!client) {
    throw new Error('Client non trouvé')
  }

  const numero = await generateNumeroContrat()

  const talentAdresse = [talent.adresse, talent.codePostal, talent.ville]
    .filter(Boolean)
    .join(', ')

  const clientAdresse = [client.adresse, client.codePostal, client.ville]
    .filter(Boolean)
    .join(', ')

  const contrat = await prisma.contrat.create({
    data: {
      numero,
      talentId: input.talentId,
      clientId: input.clientId,
      offreId: input.offreId,
      candidatureId: input.candidatureId,
      missionId: input.missionId,
      talentNom: talent.nom,
      talentPrenom: talent.prenom,
      talentSiret: talent.siret,
      talentAdresse: talentAdresse || undefined,
      clientNom: client.raisonSociale,
      clientSiret: client.siret,
      clientAdresse: clientAdresse || undefined,
      typeContrat: input.typeContrat || 'FREELANCE',
      titre: input.titre,
      description: input.description,
      lieu: input.lieu,
      mobilite: input.mobilite,
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
      dureeNombre: input.dureeNombre,
      dureeUnite: input.dureeUnite || 'MOIS',
      renouvelable: input.renouvelable || false,
      conditionsRenouvellement: input.conditionsRenouvellement,
      preavisJours: input.preavisJours || 30,
      tjm: input.tjm,
      tauxTVA: input.tauxTVA || 20,
      plafondJours: input.plafondJours,
      plafondMontant: input.plafondMontant,
      clauses: input.clauses || undefined,
      conditionsParticulieres: input.conditionsParticulieres,
      notes: input.notes,
      notesInternes: input.notesInternes,
      createdBy: input.createdBy,
      statut: 'BROUILLON',
    },
    include: {
      talent: {
        select: {
          uid: true,
          prenom: true,
          nom: true,
          titrePoste: true,
        },
      },
      client: {
        select: {
          uid: true,
          raisonSociale: true,
        },
      },
    },
  })

  return contrat
}

// ==========================================
// ACTIONS SUR LES CONTRATS
// ==========================================

export async function envoyerPourSignature(contratId: number) {
  const contrat = await prisma.contrat.update({
    where: { id: contratId },
    data: {
      statut: 'EN_ATTENTE_SIGNATURE',
      envoyeLe: new Date(),
    },
    include: {
      talent: {
        include: { user: true },
      },
      client: {
        include: { user: true },
      },
    },
  })

  // Notifier le talent
  if (contrat.talent.user) {
    await createNotification({
      userId: contrat.talent.user.id,
      type: 'SYSTEME',
      titre: 'Nouveau contrat à signer',
      message: `Un contrat "${contrat.titre}" est en attente de votre signature.`,
      lien: `/t/contrats/${contrat.uid}`,
    })
  }

  // Notifier le client
  if (contrat.client.user) {
    await createNotification({
      userId: contrat.client.user.id,
      type: 'SYSTEME',
      titre: 'Nouveau contrat à signer',
      message: `Un contrat avec ${contrat.talentPrenom} ${contrat.talentNom} est en attente de signature.`,
      lien: `/c/contrats/${contrat.uid}`,
    })
  }

  return contrat
}

export async function signerParTalent(contratId: number) {
  const contrat = await prisma.contrat.findUnique({
    where: { id: contratId },
  })

  if (!contrat) {
    throw new Error('Contrat non trouvé')
  }

  let nouveauStatut: ContratStatut = 'SIGNE_TALENT'
  let activeDepuis: Date | undefined

  // Si le client a déjà signé, activer le contrat
  if (contrat.signeParClient) {
    nouveauStatut = 'ACTIF'
    activeDepuis = new Date()
  }

  const updated = await prisma.contrat.update({
    where: { id: contratId },
    data: {
      signeParTalent: true,
      signeParTalentLe: new Date(),
      statut: nouveauStatut,
      activeDepuis,
    },
    include: {
      client: { include: { user: true } },
      talent: true,
    },
  })

  // Notifier le client
  if (updated.client.user) {
    await createNotification({
      userId: updated.client.user.id,
      type: 'SYSTEME',
      titre: 'Contrat signé par le talent',
      message: `${updated.talentPrenom} ${updated.talentNom} a signé le contrat "${updated.titre}".`,
      lien: `/c/contrats/${updated.uid}`,
    })
  }

  return updated
}

export async function signerParClient(contratId: number) {
  const contrat = await prisma.contrat.findUnique({
    where: { id: contratId },
  })

  if (!contrat) {
    throw new Error('Contrat non trouvé')
  }

  let nouveauStatut: ContratStatut = 'SIGNE_CLIENT'
  let activeDepuis: Date | undefined

  // Si le talent a déjà signé, activer le contrat
  if (contrat.signeParTalent) {
    nouveauStatut = 'ACTIF'
    activeDepuis = new Date()
  }

  const updated = await prisma.contrat.update({
    where: { id: contratId },
    data: {
      signeParClient: true,
      signeParClientLe: new Date(),
      statut: nouveauStatut,
      activeDepuis,
    },
    include: {
      talent: { include: { user: true } },
      client: true,
    },
  })

  // Notifier le talent
  if (updated.talent.user) {
    await createNotification({
      userId: updated.talent.user.id,
      type: 'SYSTEME',
      titre: 'Contrat signé par le client',
      message: `${updated.clientNom} a signé le contrat "${updated.titre}".`,
      lien: `/t/contrats/${updated.uid}`,
    })
  }

  return updated
}

export async function terminerContrat(contratId: number, motifFin?: string) {
  return prisma.contrat.update({
    where: { id: contratId },
    data: {
      statut: 'TERMINE',
      termineLe: new Date(),
      motifFin,
    },
  })
}

export async function resilierContrat(contratId: number, motifFin: string) {
  const contrat = await prisma.contrat.update({
    where: { id: contratId },
    data: {
      statut: 'RESILIE',
      termineLe: new Date(),
      motifFin,
    },
    include: {
      talent: { include: { user: true } },
      client: { include: { user: true } },
    },
  })

  // Notifier les deux parties
  if (contrat.talent.user) {
    await createNotification({
      userId: contrat.talent.user.id,
      type: 'SYSTEME',
      titre: 'Contrat résilié',
      message: `Le contrat "${contrat.titre}" a été résilié. Motif: ${motifFin}`,
      lien: `/t/contrats/${contrat.uid}`,
    })
  }

  if (contrat.client.user) {
    await createNotification({
      userId: contrat.client.user.id,
      type: 'SYSTEME',
      titre: 'Contrat résilié',
      message: `Le contrat avec ${contrat.talentPrenom} ${contrat.talentNom} a été résilié.`,
      lien: `/c/contrats/${contrat.uid}`,
    })
  }

  return contrat
}

export async function annulerContrat(contratId: number) {
  return prisma.contrat.update({
    where: { id: contratId },
    data: {
      statut: 'ANNULE',
    },
  })
}

// ==========================================
// STATISTIQUES
// ==========================================

export async function getContratStats(filters?: {
  clientId?: number
  talentId?: number
}): Promise<ContratStats> {
  const where = {
    ...(filters?.clientId && { clientId: filters.clientId }),
    ...(filters?.talentId && { talentId: filters.talentId }),
  }

  const [total, brouillons, enAttenteSignature, actifs, termines, resilies] =
    await Promise.all([
      prisma.contrat.count({ where }),
      prisma.contrat.count({ where: { ...where, statut: 'BROUILLON' } }),
      prisma.contrat.count({ where: { ...where, statut: 'EN_ATTENTE_SIGNATURE' } }),
      prisma.contrat.count({ where: { ...where, statut: 'ACTIF' } }),
      prisma.contrat.count({ where: { ...where, statut: 'TERMINE' } }),
      prisma.contrat.count({ where: { ...where, statut: 'RESILIE' } }),
    ])

  return {
    total,
    brouillons,
    enAttenteSignature,
    actifs,
    termines,
    resilies,
  }
}

// ==========================================
// CRÉATION D'AVENANT
// ==========================================

interface CreateAvenantInput {
  contratId: number
  objet: string
  modifications: string
  nouveauTjm?: number
  nouvelleDateFin?: Date
  nouveauPlafond?: number
}

export async function createAvenant(input: CreateAvenantInput) {
  const contrat = await prisma.contrat.findUnique({
    where: { id: input.contratId },
  })

  if (!contrat) {
    throw new Error('Contrat non trouvé')
  }

  const numero = await generateNumeroAvenant(contrat.numero)

  const avenant = await prisma.avenant.create({
    data: {
      numero,
      contratId: input.contratId,
      objet: input.objet,
      modifications: input.modifications,
      nouveauTjm: input.nouveauTjm,
      nouvelleDateFin: input.nouvelleDateFin,
      nouveauPlafond: input.nouveauPlafond,
      statut: 'BROUILLON',
    },
  })

  return avenant
}

export async function signerAvenantParTalent(avenantId: number) {
  const avenant = await prisma.avenant.findUnique({
    where: { id: avenantId },
    include: { contrat: true },
  })

  if (!avenant) {
    throw new Error('Avenant non trouvé')
  }

  let nouveauStatut: ContratStatut = 'SIGNE_TALENT'

  if (avenant.signeParClient) {
    nouveauStatut = 'ACTIF'
    // Appliquer les modifications au contrat
    await appliquerAvenant(avenant)
  }

  return prisma.avenant.update({
    where: { id: avenantId },
    data: {
      signeParTalent: true,
      signeParTalentLe: new Date(),
      statut: nouveauStatut,
    },
  })
}

export async function signerAvenantParClient(avenantId: number) {
  const avenant = await prisma.avenant.findUnique({
    where: { id: avenantId },
    include: { contrat: true },
  })

  if (!avenant) {
    throw new Error('Avenant non trouvé')
  }

  let nouveauStatut: ContratStatut = 'SIGNE_CLIENT'

  if (avenant.signeParTalent) {
    nouveauStatut = 'ACTIF'
    // Appliquer les modifications au contrat
    await appliquerAvenant(avenant)
  }

  return prisma.avenant.update({
    where: { id: avenantId },
    data: {
      signeParClient: true,
      signeParClientLe: new Date(),
      statut: nouveauStatut,
    },
  })
}

async function appliquerAvenant(avenant: {
  contratId: number
  nouveauTjm: number | null
  nouvelleDateFin: Date | null
  nouveauPlafond: number | null
}) {
  const updates: Record<string, unknown> = {}

  if (avenant.nouveauTjm !== null) {
    updates.tjm = avenant.nouveauTjm
  }
  if (avenant.nouvelleDateFin !== null) {
    updates.dateFin = avenant.nouvelleDateFin
  }
  if (avenant.nouveauPlafond !== null) {
    updates.plafondMontant = avenant.nouveauPlafond
  }

  if (Object.keys(updates).length > 0) {
    await prisma.contrat.update({
      where: { id: avenant.contratId },
      data: updates,
    })
  }
}
