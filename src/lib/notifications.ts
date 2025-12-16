/**
 * Service de Notifications Temps Réel - Talentero
 *
 * Ce service gère la création, l'envoi et la récupération des notifications
 * pour tous les types d'utilisateurs (Talent, Client, Admin)
 */

import { prisma } from '@/lib/db'
import { NotificationType, Prisma } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface CreateNotificationParams {
  userId: number
  type: NotificationType
  titre: string
  message: string
  lien?: string
  data?: Prisma.InputJsonValue
}

export interface NotificationWithMeta {
  id: number
  type: NotificationType
  titre: string
  message: string
  lien: string | null
  data: unknown
  lu: boolean
  luLe: Date | null
  createdAt: Date
  timeAgo: string
}

// ============================================
// CRÉATION DE NOTIFICATIONS
// ============================================

/**
 * Crée une notification pour un utilisateur
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, titre, message, lien, data } = params

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      titre,
      message,
      lien,
      data: data || undefined,
    },
  })

  return notification
}

/**
 * Crée des notifications pour plusieurs utilisateurs
 */
export async function createBulkNotifications(
  userIds: number[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  const { type, titre, message, lien, data } = params

  const notifications = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      titre,
      message,
      lien,
      data: data || undefined,
    })),
  })

  return notifications
}

// ============================================
// RÉCUPÉRATION DES NOTIFICATIONS
// ============================================

/**
 * Récupère les notifications d'un utilisateur
 */
export async function getUserNotifications(
  userId: number,
  options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options

  const where = {
    userId,
    ...(unreadOnly ? { lu: false } : {}),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, lu: false } }),
  ])

  // Ajouter le temps relatif
  const notificationsWithMeta: NotificationWithMeta[] = notifications.map((n) => ({
    ...n,
    timeAgo: getTimeAgo(n.createdAt),
  }))

  return {
    notifications: notificationsWithMeta,
    total,
    unreadCount,
    hasMore: offset + notifications.length < total,
  }
}

/**
 * Compte les notifications non lues
 */
export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { userId, lu: false },
  })
}

// ============================================
// MISE À JOUR DES NOTIFICATIONS
// ============================================

/**
 * Marque une notification comme lue
 */
export async function markAsRead(notificationId: number, userId: number) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Sécurité: s'assurer que l'utilisateur possède la notification
    },
    data: {
      lu: true,
      luLe: new Date(),
    },
  })
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllAsRead(userId: number) {
  return prisma.notification.updateMany({
    where: {
      userId,
      lu: false,
    },
    data: {
      lu: true,
      luLe: new Date(),
    },
  })
}

/**
 * Supprime une notification
 */
export async function deleteNotification(notificationId: number, userId: number) {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  })
}

/**
 * Supprime les anciennes notifications (plus de 30 jours)
 */
export async function cleanupOldNotifications(daysOld: number = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  return prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      lu: true, // Ne supprimer que les lues
    },
  })
}

// ============================================
// NOTIFICATIONS SPÉCIFIQUES PAR ÉVÉNEMENT
// ============================================

/**
 * Notification: Nouveau match pour un talent
 */
export async function notifyNewMatch(
  talentUserId: number,
  offreData: { titre: string; uid: string; score: number }
) {
  return createNotification({
    userId: talentUserId,
    type: 'NOUVELLE_OFFRE_MATCH',
    titre: 'Nouvelle offre compatible !',
    message: `Une offre "${offreData.titre}" correspond à votre profil (${offreData.score}% de compatibilité)`,
    lien: `/t/offres/${offreData.uid}`,
    data: { offreUid: offreData.uid, score: offreData.score },
  })
}

/**
 * Notification: Nouvelle candidature (pour admin)
 */
export async function notifyNewCandidature(
  adminUserIds: number[],
  candidatureData: { talentNom: string; offreTitre: string; offreUid: string }
) {
  return createBulkNotifications(adminUserIds, {
    type: 'NOUVELLE_CANDIDATURE',
    titre: 'Nouvelle candidature',
    message: `${candidatureData.talentNom} a postulé à "${candidatureData.offreTitre}"`,
    lien: `/admin/offres/${candidatureData.offreUid}`,
    data: candidatureData,
  })
}

/**
 * Notification: Statut de candidature changé
 */
export async function notifyCandidatureStatusChange(
  talentUserId: number,
  data: { offreTitre: string; nouveauStatut: string; offreUid: string }
) {
  const messages: Record<string, string> = {
    PRE_SELECTIONNE: `Bonne nouvelle ! Vous êtes pré-sélectionné pour "${data.offreTitre}"`,
    SHORTLIST: `Vous faites partie de la shortlist pour "${data.offreTitre}"`,
    ENTRETIEN_DEMANDE: `Un entretien est demandé pour "${data.offreTitre}"`,
    ACCEPTEE: `Félicitations ! Vous êtes retenu pour "${data.offreTitre}"`,
    REFUSEE: `Votre candidature pour "${data.offreTitre}" n'a pas été retenue`,
  }

  return createNotification({
    userId: talentUserId,
    type: 'STATUT_CANDIDATURE',
    titre: 'Mise à jour candidature',
    message: messages[data.nouveauStatut] || `Statut mis à jour pour "${data.offreTitre}"`,
    lien: `/t/candidatures`,
    data,
  })
}

/**
 * Notification: Shortlist envoyée au client
 */
export async function notifyShortlistSent(
  clientUserId: number,
  data: { offreTitre: string; offreUid: string; nbCandidats: number }
) {
  return createNotification({
    userId: clientUserId,
    type: 'SHORTLIST_ENVOYEE',
    titre: 'Shortlist disponible',
    message: `${data.nbCandidats} candidat(s) sélectionné(s) pour "${data.offreTitre}"`,
    lien: `/c/shortlists`,
    data,
  })
}

/**
 * Notification: Demande d'entretien
 */
export async function notifyEntretienDemande(
  talentUserId: number,
  data: { offreTitre: string; dateProposee: string; entretienUid: string }
) {
  return createNotification({
    userId: talentUserId,
    type: 'ENTRETIEN_DEMANDE',
    titre: 'Demande d\'entretien',
    message: `Un entretien est proposé pour "${data.offreTitre}" le ${data.dateProposee}`,
    lien: `/t/candidatures`,
    data,
  })
}

/**
 * Notification: Entretien confirmé
 */
export async function notifyEntretienConfirme(
  clientUserId: number,
  data: { talentNom: string; offreTitre: string; date: string }
) {
  return createNotification({
    userId: clientUserId,
    type: 'ENTRETIEN_CONFIRME',
    titre: 'Entretien confirmé',
    message: `${data.talentNom} a confirmé l'entretien pour "${data.offreTitre}" le ${data.date}`,
    lien: `/c/offres`,
    data,
  })
}

/**
 * Notification: Rappel d'entretien (24h avant)
 */
export async function notifyEntretienRappel(
  userId: number,
  data: { offreTitre: string; date: string; heure: string; lienVisio?: string }
) {
  return createNotification({
    userId,
    type: 'ENTRETIEN_RAPPEL',
    titre: 'Rappel: Entretien demain',
    message: `Entretien pour "${data.offreTitre}" demain à ${data.heure}`,
    lien: data.lienVisio || '/t/candidatures',
    data,
  })
}

/**
 * Notification: Nouveau message
 */
export async function notifyNewMessage(
  userId: number,
  data: { expediteur: string; preview: string; conversationUid: string }
) {
  return createNotification({
    userId,
    type: 'NOUVEAU_MESSAGE',
    titre: `Message de ${data.expediteur}`,
    message: data.preview.substring(0, 100) + (data.preview.length > 100 ? '...' : ''),
    lien: `/messages/${data.conversationUid}`,
    data,
  })
}

/**
 * Notification: Offre publiée (pour le client)
 */
export async function notifyOffrePubliee(
  clientUserId: number,
  data: { offreTitre: string; offreUid: string }
) {
  return createNotification({
    userId: clientUserId,
    type: 'OFFRE_PUBLIEE',
    titre: 'Offre publiée',
    message: `Votre offre "${data.offreTitre}" est maintenant en ligne`,
    lien: `/c/offres/${data.offreUid}`,
    data,
  })
}

/**
 * Notification: Bienvenue
 */
export async function notifyBienvenue(userId: number, prenom: string) {
  return createNotification({
    userId,
    type: 'BIENVENUE',
    titre: 'Bienvenue sur Talentero !',
    message: `Bonjour ${prenom}, votre compte est maintenant actif. Complétez votre profil pour maximiser vos chances.`,
    lien: '/t/profil',
  })
}

/**
 * Notification: Compte client validé
 */
export async function notifyCompteValide(clientUserId: number, raisonSociale: string) {
  return createNotification({
    userId: clientUserId,
    type: 'VALIDATION_COMPTE',
    titre: 'Compte validé',
    message: `Le compte de ${raisonSociale} a été validé. Vous pouvez maintenant publier des offres.`,
    lien: '/c/offres/nouvelle',
  })
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Convertit une date en temps relatif (ex: "il y a 5 minutes")
 */
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'À l\'instant'
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  }

  // Plus d'une semaine: afficher la date
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Récupère les IDs des admins pour les notifications
 */
export async function getAdminUserIds(): Promise<number[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  })
  return admins.map((a) => a.id)
}

/**
 * Icône par type de notification
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    NOUVELLE_OFFRE_MATCH: '🎯',
    OFFRE_PUBLIEE: '📢',
    NOUVELLE_CANDIDATURE: '📥',
    CANDIDATURE_RECUE: '📥',
    STATUT_CANDIDATURE: '📋',
    SHORTLIST_ENVOYEE: '📋',
    SHORTLIST_RETOUR: '📋',
    ENTRETIEN_DEMANDE: '📅',
    ENTRETIEN_CONFIRME: '✅',
    ENTRETIEN_RAPPEL: '⏰',
    ENTRETIEN_ANNULE: '❌',
    NOUVEAU_MESSAGE: '💬',
    DEMANDE_INFOS: '❓',
    CANDIDAT_SELECTIONNE: '🎉',
    CANDIDAT_REFUSE: '😔',
    MISSION_PERDUE: '😔',
    MISSION_GAGNEE: '🏆',
    VALIDATION_COMPTE: '✅',
    BIENVENUE: '👋',
    SYSTEME: '🔔',
  }
  return icons[type] || '🔔'
}
