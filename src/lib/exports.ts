/**
 * Service d'export de données
 * Génération de fichiers CSV pour les exports
 */

import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ==========================================
// TYPES
// ==========================================

export type ExportType =
  | 'talents'
  | 'clients'
  | 'offres'
  | 'candidatures'
  | 'contrats'
  | 'factures'
  | 'reviews'

interface ExportFilters {
  dateDebut?: Date
  dateFin?: Date
  statut?: string
  clientId?: number
  talentId?: number
}

interface ExportResult {
  filename: string
  content: string
  mimeType: string
  count: number
}

// ==========================================
// UTILITAIRES CSV
// ==========================================

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function arrayToCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCSV).join(',')
  const dataLines = rows.map(row => row.map(escapeCSV).join(','))
  return [headerLine, ...dataLines].join('\n')
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr })
}

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return ''
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr })
}

// ==========================================
// EXPORT TALENTS
// ==========================================

export async function exportTalents(filters: ExportFilters = {}): Promise<ExportResult> {
  const where: Record<string, unknown> = {}

  if (filters.statut) {
    where.statut = filters.statut
  }
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {}
    if (filters.dateDebut) {
      (where.createdAt as Record<string, Date>).gte = filters.dateDebut
    }
    if (filters.dateFin) {
      (where.createdAt as Record<string, Date>).lte = filters.dateFin
    }
  }

  const talents = await prisma.talent.findMany({
    where,
    include: {
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Code',
    'Prénom',
    'Nom',
    'Email',
    'Téléphone',
    'Titre de poste',
    'TJM Min',
    'TJM Max',
    'Ville',
    'Disponibilité',
    'Mobilité',
    'Statut',
    'Compétences',
    'Années expérience',
    'SIRET',
    'Date inscription',
  ]

  const rows = talents.map(t => [
    t.codeUnique,
    t.prenom,
    t.nom,
    t.user?.email || '',
    t.telephone || '',
    t.titrePoste || '',
    t.tjmMin || '',
    t.tjmMax || '',
    t.ville || '',
    t.disponibilite,
    t.mobilite,
    t.statut,
    t.competences.join('; '),
    t.anneesExperience,
    t.siret || '',
    formatDate(t.createdAt),
  ])

  const content = arrayToCSV(headers, rows)
  const filename = `talents_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`

  return {
    filename,
    content,
    mimeType: 'text/csv;charset=utf-8',
    count: talents.length,
  }
}

// ==========================================
// EXPORT CLIENTS
// ==========================================

export async function exportClients(filters: ExportFilters = {}): Promise<ExportResult> {
  const where: Record<string, unknown> = {}

  if (filters.statut) {
    where.statut = filters.statut
  }
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {}
    if (filters.dateDebut) {
      (where.createdAt as Record<string, Date>).gte = filters.dateDebut
    }
    if (filters.dateFin) {
      (where.createdAt as Record<string, Date>).lte = filters.dateFin
    }
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      user: { select: { email: true } },
      contacts: { where: { estContactPrincipal: true }, take: 1 },
      _count: { select: { offres: true, factures: true, contrats: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Code',
    'Raison sociale',
    'Email',
    'Type client',
    'SIRET',
    'Ville',
    'Secteur activité',
    'Taille',
    'Statut',
    'Contact principal',
    'Email contact',
    'Nb offres',
    'Nb factures',
    'Nb contrats',
    'Date inscription',
  ]

  const rows = clients.map(c => {
    const contact = c.contacts[0]
    return [
      c.codeUnique,
      c.raisonSociale,
      c.user?.email || '',
      c.typeClient,
      c.siret || '',
      c.ville || '',
      c.secteurActivite || '',
      c.tailleEntreprise || '',
      c.statut,
      contact ? `${contact.prenom} ${contact.nom}` : '',
      contact?.email || '',
      c._count.offres,
      c._count.factures,
      c._count.contrats,
      formatDate(c.createdAt),
    ]
  })

  const content = arrayToCSV(headers, rows)
  const filename = `clients_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`

  return {
    filename,
    content,
    mimeType: 'text/csv;charset=utf-8',
    count: clients.length,
  }
}

// ==========================================
// EXPORT OFFRES
// ==========================================

export async function exportOffres(filters: ExportFilters = {}): Promise<ExportResult> {
  const where: Record<string, unknown> = {}

  if (filters.statut) {
    where.statut = filters.statut
  }
  if (filters.clientId) {
    where.clientId = filters.clientId
  }
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {}
    if (filters.dateDebut) {
      (where.createdAt as Record<string, Date>).gte = filters.dateDebut
    }
    if (filters.dateFin) {
      (where.createdAt as Record<string, Date>).lte = filters.dateFin
    }
  }

  const offres = await prisma.offre.findMany({
    where,
    include: {
      client: { select: { raisonSociale: true, codeUnique: true } },
      _count: { select: { candidatures: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Code',
    'Titre',
    'Client',
    'Code client',
    'Type offre',
    'Statut',
    'TJM affiché',
    'TJM Min',
    'TJM Max',
    'Ville',
    'Mobilité',
    'Durée',
    'Nb candidatures',
    'Nb vues',
    'Date création',
    'Date publication',
    'Compétences requises',
  ]

  const rows = offres.map(o => [
    o.codeUnique,
    o.titre,
    o.client?.raisonSociale || 'TRINEXTA',
    o.client?.codeUnique || '',
    o.typeOffre,
    o.statut,
    o.tjmAffiche || '',
    o.tjmMin || '',
    o.tjmMax || '',
    o.ville || '',
    o.mobilite,
    o.dureeNombre ? `${o.dureeNombre} ${o.dureeUnite}` : '',
    o._count.candidatures,
    o.nbVues,
    formatDate(o.createdAt),
    formatDate(o.publieLe),
    o.competencesRequises.join('; '),
  ])

  const content = arrayToCSV(headers, rows)
  const filename = `offres_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`

  return {
    filename,
    content,
    mimeType: 'text/csv;charset=utf-8',
    count: offres.length,
  }
}

// ==========================================
// EXPORT CANDIDATURES
// ==========================================

export async function exportCandidatures(filters: ExportFilters = {}): Promise<ExportResult> {
  const where: Record<string, unknown> = {}

  if (filters.statut) {
    where.statut = filters.statut
  }
  if (filters.clientId) {
    where.offre = { clientId: filters.clientId }
  }
  if (filters.talentId) {
    where.talentId = filters.talentId
  }
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {}
    if (filters.dateDebut) {
      (where.createdAt as Record<string, Date>).gte = filters.dateDebut
    }
    if (filters.dateFin) {
      (where.createdAt as Record<string, Date>).lte = filters.dateFin
    }
  }

  const candidatures = await prisma.candidature.findMany({
    where,
    include: {
      talent: { select: { prenom: true, nom: true, codeUnique: true } },
      offre: {
        select: {
          titre: true,
          codeUnique: true,
          client: { select: { raisonSociale: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'ID',
    'Talent',
    'Code talent',
    'Offre',
    'Code offre',
    'Client',
    'Statut',
    'Score match',
    'TJM proposé',
    'Disponibilité',
    'Date candidature',
    'Date vue',
    'Date réponse',
  ]

  const rows = candidatures.map(c => [
    c.uid,
    `${c.talent.prenom} ${c.talent.nom}`,
    c.talent.codeUnique,
    c.offre.titre,
    c.offre.codeUnique,
    c.offre.client?.raisonSociale || 'TRINEXTA',
    c.statut,
    c.scoreMatch || '',
    c.tjmPropose || '',
    c.disponibilite || '',
    formatDateTime(c.createdAt),
    formatDateTime(c.vueLe),
    formatDateTime(c.reponduLe),
  ])

  const content = arrayToCSV(headers, rows)
  const filename = `candidatures_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`

  return {
    filename,
    content,
    mimeType: 'text/csv;charset=utf-8',
    count: candidatures.length,
  }
}

// ==========================================
// EXPORT CONTRATS
// ==========================================

export async function exportContrats(filters: ExportFilters = {}): Promise<ExportResult> {
  const where: Record<string, unknown> = {}

  if (filters.statut) {
    where.statut = filters.statut
  }
  if (filters.clientId) {
    where.clientId = filters.clientId
  }
  if (filters.talentId) {
    where.talentId = filters.talentId
  }
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {}
    if (filters.dateDebut) {
      (where.createdAt as Record<string, Date>).gte = filters.dateDebut
    }
    if (filters.dateFin) {
      (where.createdAt as Record<string, Date>).lte = filters.dateFin
    }
  }

  const contrats = await prisma.contrat.findMany({
    where,
    include: {
      talent: { select: { prenom: true, nom: true, codeUnique: true } },
      client: { select: { raisonSociale: true, codeUnique: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Numéro',
    'Titre',
    'Talent',
    'Code talent',
    'Client',
    'Code client',
    'Type contrat',
    'Statut',
    'TJM',
    'Date début',
    'Date fin',
    'Signé talent',
    'Signé client',
    'Date création',
  ]

  const rows = contrats.map(c => [
    c.numero,
    c.titre,
    `${c.talent.prenom} ${c.talent.nom}`,
    c.talent.codeUnique,
    c.client.raisonSociale,
    c.client.codeUnique,
    c.typeContrat,
    c.statut,
    c.tjm,
    formatDate(c.dateDebut),
    formatDate(c.dateFin),
    c.signeParTalent ? 'Oui' : 'Non',
    c.signeParClient ? 'Oui' : 'Non',
    formatDate(c.createdAt),
  ])

  const content = arrayToCSV(headers, rows)
  const filename = `contrats_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`

  return {
    filename,
    content,
    mimeType: 'text/csv;charset=utf-8',
    count: contrats.length,
  }
}

// ==========================================
// EXPORT FACTURES
// ==========================================

export async function exportFactures(filters: ExportFilters = {}): Promise<ExportResult> {
  const where: Record<string, unknown> = {}

  if (filters.statut) {
    where.statut = filters.statut
  }
  if (filters.clientId) {
    where.clientId = filters.clientId
  }
  if (filters.dateDebut || filters.dateFin) {
    where.dateEmission = {}
    if (filters.dateDebut) {
      (where.dateEmission as Record<string, Date>).gte = filters.dateDebut
    }
    if (filters.dateFin) {
      (where.dateEmission as Record<string, Date>).lte = filters.dateFin
    }
  }

  const factures = await prisma.facture.findMany({
    where,
    include: {
      client: { select: { raisonSociale: true, codeUnique: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Numéro',
    'Client',
    'Code client',
    'Description',
    'Montant HT',
    'TVA',
    'Montant TTC',
    'Statut',
    'Date émission',
    'Date échéance',
    'Date paiement',
    'Mode paiement',
  ]

  const rows = factures.map(f => [
    f.numero,
    f.client.raisonSociale,
    f.client.codeUnique,
    f.description,
    f.montantHT.toFixed(2),
    f.montantTVA.toFixed(2),
    f.montantTTC.toFixed(2),
    f.statut,
    formatDate(f.dateEmission),
    formatDate(f.dateEcheance),
    formatDate(f.datePaiement),
    f.modePaiement || '',
  ])

  const content = arrayToCSV(headers, rows)
  const filename = `factures_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`

  return {
    filename,
    content,
    mimeType: 'text/csv;charset=utf-8',
    count: factures.length,
  }
}

// ==========================================
// EXPORT REVIEWS
// ==========================================

export async function exportReviews(filters: ExportFilters = {}): Promise<ExportResult> {
  const where: Record<string, unknown> = {}

  if (filters.statut) {
    where.statut = filters.statut
  }
  if (filters.clientId) {
    where.clientId = filters.clientId
  }
  if (filters.talentId) {
    where.talentId = filters.talentId
  }
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {}
    if (filters.dateDebut) {
      (where.createdAt as Record<string, Date>).gte = filters.dateDebut
    }
    if (filters.dateFin) {
      (where.createdAt as Record<string, Date>).lte = filters.dateFin
    }
  }

  const reviews = await prisma.review.findMany({
    where,
    include: {
      talent: { select: { prenom: true, nom: true, codeUnique: true } },
      client: { select: { raisonSociale: true, codeUnique: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'ID',
    'Talent',
    'Code talent',
    'Client',
    'Code client',
    'Note globale',
    'Note compétences',
    'Note communication',
    'Note ponctualité',
    'Note qualité',
    'Recommande',
    'Statut',
    'Titre',
    'Commentaire',
    'Date',
  ]

  const rows = reviews.map(r => [
    r.uid,
    `${r.talent.prenom} ${r.talent.nom}`,
    r.talent.codeUnique,
    r.client.raisonSociale,
    r.client.codeUnique,
    r.noteGlobale,
    r.noteCompetences || '',
    r.noteCommunication || '',
    r.notePonctualite || '',
    r.noteQualite || '',
    r.recommande ? 'Oui' : 'Non',
    r.statut,
    r.titre || '',
    r.commentaire.substring(0, 200),
    formatDate(r.createdAt),
  ])

  const content = arrayToCSV(headers, rows)
  const filename = `reviews_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`

  return {
    filename,
    content,
    mimeType: 'text/csv;charset=utf-8',
    count: reviews.length,
  }
}

// ==========================================
// FONCTION PRINCIPALE D'EXPORT
// ==========================================

export async function generateExport(
  type: ExportType,
  filters: ExportFilters = {}
): Promise<ExportResult> {
  switch (type) {
    case 'talents':
      return exportTalents(filters)
    case 'clients':
      return exportClients(filters)
    case 'offres':
      return exportOffres(filters)
    case 'candidatures':
      return exportCandidatures(filters)
    case 'contrats':
      return exportContrats(filters)
    case 'factures':
      return exportFactures(filters)
    case 'reviews':
      return exportReviews(filters)
    default:
      throw new Error(`Type d'export non supporté: ${type}`)
  }
}

// ==========================================
// STATISTIQUES POUR RAPPORTS
// ==========================================

export async function getReportStats(filters: ExportFilters = {}) {
  const dateWhere = {
    ...(filters.dateDebut && { gte: filters.dateDebut }),
    ...(filters.dateFin && { lte: filters.dateFin }),
  }

  const [
    talentsCount,
    clientsCount,
    offresCount,
    candidaturesCount,
    contratsActifs,
    facturesStats,
    candidaturesParStatut,
    offresParStatut,
  ] = await Promise.all([
    prisma.talent.count({
      where: filters.dateDebut || filters.dateFin ? { createdAt: dateWhere } : undefined,
    }),
    prisma.client.count({
      where: filters.dateDebut || filters.dateFin ? { createdAt: dateWhere } : undefined,
    }),
    prisma.offre.count({
      where: filters.dateDebut || filters.dateFin ? { createdAt: dateWhere } : undefined,
    }),
    prisma.candidature.count({
      where: filters.dateDebut || filters.dateFin ? { createdAt: dateWhere } : undefined,
    }),
    prisma.contrat.count({
      where: { statut: 'ACTIF' },
    }),
    prisma.facture.aggregate({
      where: {
        statut: { in: ['EMISE', 'PAYEE'] },
        ...(filters.dateDebut || filters.dateFin ? { dateEmission: dateWhere } : {}),
      },
      _sum: { montantHT: true, montantTTC: true },
      _count: true,
    }),
    prisma.candidature.groupBy({
      by: ['statut'],
      _count: true,
      where: filters.dateDebut || filters.dateFin ? { createdAt: dateWhere } : undefined,
    }),
    prisma.offre.groupBy({
      by: ['statut'],
      _count: true,
      where: filters.dateDebut || filters.dateFin ? { createdAt: dateWhere } : undefined,
    }),
  ])

  return {
    periode: {
      debut: filters.dateDebut ? formatDate(filters.dateDebut) : 'Début',
      fin: filters.dateFin ? formatDate(filters.dateFin) : 'Aujourd\'hui',
    },
    global: {
      talents: talentsCount,
      clients: clientsCount,
      offres: offresCount,
      candidatures: candidaturesCount,
      contratsActifs,
    },
    facturation: {
      totalFactures: facturesStats._count,
      totalHT: facturesStats._sum.montantHT || 0,
      totalTTC: facturesStats._sum.montantTTC || 0,
    },
    candidaturesParStatut: candidaturesParStatut.reduce((acc, item) => {
      acc[item.statut] = item._count
      return acc
    }, {} as Record<string, number>),
    offresParStatut: offresParStatut.reduce((acc, item) => {
      acc[item.statut] = item._count
      return acc
    }, {} as Record<string, number>),
  }
}
