/**
 * Service de gestion des comptes inactifs
 * Gère les rappels et la suppression automatique des comptes non activés
 *
 * RÈGLES:
 * - Un talent importé par admin a 7 jours pour activer son compte
 * - Rappel automatique après 3 jours
 * - Rappel automatique après 5 jours
 * - Suppression automatique après 7 jours si non activé
 *
 * Pour les comptes normaux (inscrits eux-mêmes):
 * - Rappel après 3 jours si email non vérifié
 * - Suppression après 30 jours si non vérifié
 */

import { prisma } from './db'
import { sendActivationReminder, sendAccountDeletionWarning } from './microsoft-graph'

// Configuration
const CONFIG = {
  // Comptes importés par admin
  IMPORT: {
    RAPPEL_1_JOURS: 3,      // Premier rappel après 3 jours
    RAPPEL_2_JOURS: 5,      // Deuxième rappel après 5 jours
    SUPPRESSION_JOURS: 7,   // Suppression après 7 jours
  },
  // Comptes créés par inscription normale
  INSCRIPTION: {
    RAPPEL_1_JOURS: 3,      // Premier rappel après 3 jours
    RAPPEL_2_JOURS: 14,     // Deuxième rappel après 14 jours
    SUPPRESSION_JOURS: 30,  // Suppression après 30 jours
  }
}

export interface AccountManagementResult {
  rappelsEnvoyes: number
  comptesSupprimes: number
  erreurs: string[]
  details: {
    talentsRappel1: string[]
    talentsRappel2: string[]
    talentsSupprimes: string[]
  }
}

/**
 * Récupère les comptes inactifs qui ont besoin d'un rappel ou d'une suppression
 */
export async function getInactiveAccounts() {
  const now = new Date()

  // Comptes talents non activés (emailVerified = false)
  const inactiveAccounts = await prisma.talent.findMany({
    where: {
      user: {
        emailVerified: false,
        activationToken: { not: null }, // A un token d'activation en attente
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          createdAt: true,
          emailVerified: true,
          activationToken: true,
          activationTokenExpiry: true,
        },
      },
    },
  })

  return inactiveAccounts.map(talent => {
    const createdAt = talent.user.createdAt
    const joursDepuisCreation = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    const config = talent.importeParAdmin ? CONFIG.IMPORT : CONFIG.INSCRIPTION

    return {
      talentId: talent.id,
      talentUid: talent.uid,
      userId: talent.user.id,
      email: talent.user.email,
      prenom: talent.prenom,
      nom: talent.nom,
      importeParAdmin: talent.importeParAdmin,
      createdAt,
      joursDepuisCreation,
      activationEmailEnvoye: talent.activationEmailEnvoye,
      activationEmailEnvoyeLe: talent.activationEmailEnvoyeLe,
      // Calcul des actions nécessaires
      besoinRappel1: joursDepuisCreation >= config.RAPPEL_1_JOURS && !talent.activationEmailEnvoye,
      besoinRappel2: joursDepuisCreation >= config.RAPPEL_2_JOURS && talent.activationEmailEnvoye,
      besoinSuppression: joursDepuisCreation >= config.SUPPRESSION_JOURS,
      config,
    }
  })
}

/**
 * Envoie les rappels et supprime les comptes inactifs
 * @param dryRun Si true, ne fait que simuler sans effectuer les actions
 */
export async function processInactiveAccounts(dryRun: boolean = false): Promise<AccountManagementResult> {
  const result: AccountManagementResult = {
    rappelsEnvoyes: 0,
    comptesSupprimes: 0,
    erreurs: [],
    details: {
      talentsRappel1: [],
      talentsRappel2: [],
      talentsSupprimes: [],
    },
  }

  const inactiveAccounts = await getInactiveAccounts()

  for (const account of inactiveAccounts) {
    try {
      // PRIORITÉ 1: Suppression si délai dépassé
      if (account.besoinSuppression) {
        if (!dryRun) {
          // Envoie un email d'avertissement de suppression
          try {
            await sendAccountDeletionWarning(
              account.email,
              account.prenom,
              account.joursDepuisCreation
            )
          } catch (emailError) {
            console.error(`Erreur envoi email suppression ${account.email}:`, emailError)
          }

          // Supprime le compte (cascade: supprime aussi le talent)
          await prisma.user.delete({
            where: { id: account.userId },
          })

          // Log l'action
          await prisma.auditLog.create({
            data: {
              action: 'DELETE_INACTIVE_ACCOUNT',
              entite: 'User',
              entiteId: account.userId,
              details: {
                email: account.email,
                talentUid: account.talentUid,
                joursInactif: account.joursDepuisCreation,
                importeParAdmin: account.importeParAdmin,
              },
            },
          })
        }

        result.comptesSupprimes++
        result.details.talentsSupprimes.push(`${account.prenom} ${account.nom} (${account.email}) - ${account.joursDepuisCreation} jours`)
        continue // Passe au compte suivant
      }

      // PRIORITÉ 2: Deuxième rappel
      if (account.besoinRappel2) {
        if (!dryRun) {
          try {
            await sendActivationReminder(
              account.email,
              account.prenom,
              2, // Rappel numéro 2
              account.config.SUPPRESSION_JOURS - account.joursDepuisCreation // Jours restants
            )

            // Met à jour la date du dernier rappel
            await prisma.talent.update({
              where: { id: account.talentId },
              data: {
                activationEmailEnvoyeLe: new Date(),
              },
            })
          } catch (emailError) {
            result.erreurs.push(`Erreur rappel 2 ${account.email}: ${emailError}`)
            continue
          }
        }

        result.rappelsEnvoyes++
        result.details.talentsRappel2.push(`${account.prenom} ${account.nom} (${account.email})`)
        continue
      }

      // PRIORITÉ 3: Premier rappel
      if (account.besoinRappel1) {
        if (!dryRun) {
          try {
            await sendActivationReminder(
              account.email,
              account.prenom,
              1, // Rappel numéro 1
              account.config.SUPPRESSION_JOURS - account.joursDepuisCreation // Jours restants
            )

            // Met à jour le statut d'envoi
            await prisma.talent.update({
              where: { id: account.talentId },
              data: {
                activationEmailEnvoye: true,
                activationEmailEnvoyeLe: new Date(),
              },
            })
          } catch (emailError) {
            result.erreurs.push(`Erreur rappel 1 ${account.email}: ${emailError}`)
            continue
          }
        }

        result.rappelsEnvoyes++
        result.details.talentsRappel1.push(`${account.prenom} ${account.nom} (${account.email})`)
      }
    } catch (error) {
      result.erreurs.push(`Erreur traitement ${account.email}: ${error}`)
    }
  }

  return result
}

/**
 * Récupère les statistiques des comptes inactifs
 */
export async function getInactiveAccountsStats() {
  const now = new Date()
  const stats = {
    total: 0,
    importesParAdmin: 0,
    inscriptionsNormales: 0,
    parAge: {
      moins3Jours: 0,
      entre3Et7Jours: 0,
      entre7Et14Jours: 0,
      entre14Et30Jours: 0,
      plus30Jours: 0,
    },
    aSupprimer: 0,
    aRappeler: 0,
  }

  const inactiveAccounts = await getInactiveAccounts()

  for (const account of inactiveAccounts) {
    stats.total++

    if (account.importeParAdmin) {
      stats.importesParAdmin++
    } else {
      stats.inscriptionsNormales++
    }

    if (account.joursDepuisCreation < 3) {
      stats.parAge.moins3Jours++
    } else if (account.joursDepuisCreation < 7) {
      stats.parAge.entre3Et7Jours++
    } else if (account.joursDepuisCreation < 14) {
      stats.parAge.entre7Et14Jours++
    } else if (account.joursDepuisCreation < 30) {
      stats.parAge.entre14Et30Jours++
    } else {
      stats.parAge.plus30Jours++
    }

    if (account.besoinSuppression) {
      stats.aSupprimer++
    } else if (account.besoinRappel1 || account.besoinRappel2) {
      stats.aRappeler++
    }
  }

  return stats
}

/**
 * Force la suppression d'un compte inactif spécifique (admin)
 */
export async function deleteInactiveAccount(talentUid: string): Promise<boolean> {
  const talent = await prisma.talent.findUnique({
    where: { uid: talentUid },
    include: {
      user: {
        select: { id: true, email: true, emailVerified: true },
      },
    },
  })

  if (!talent) {
    throw new Error('Talent non trouvé')
  }

  if (talent.user.emailVerified) {
    throw new Error('Ce compte est déjà activé et ne peut pas être supprimé automatiquement')
  }

  // Supprime le compte
  await prisma.user.delete({
    where: { id: talent.user.id },
  })

  // Log l'action
  await prisma.auditLog.create({
    data: {
      action: 'DELETE_INACTIVE_ACCOUNT_MANUAL',
      entite: 'User',
      entiteId: talent.user.id,
      details: {
        email: talent.user.email,
        talentUid: talent.uid,
        reason: 'Suppression manuelle par admin',
      },
    },
  })

  return true
}

/**
 * Renvoie un email d'activation à un talent spécifique
 */
export async function resendActivationEmail(talentUid: string): Promise<boolean> {
  const talent = await prisma.talent.findUnique({
    where: { uid: talentUid },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
          activationToken: true,
          activationTokenExpiry: true,
        },
      },
    },
  })

  if (!talent) {
    throw new Error('Talent non trouvé')
  }

  if (talent.user.emailVerified) {
    throw new Error('Ce compte est déjà activé')
  }

  // Génère un nouveau token si l'ancien a expiré
  let token = talent.user.activationToken
  const now = new Date()

  if (!token || (talent.user.activationTokenExpiry && talent.user.activationTokenExpiry < now)) {
    // Génère un nouveau token
    token = crypto.randomUUID()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 7) // 7 jours de validité

    await prisma.user.update({
      where: { id: talent.user.id },
      data: {
        activationToken: token,
        activationTokenExpiry: expiry,
      },
    })
  }

  // TODO: Envoyer l'email avec le token
  // Pour l'instant, on met juste à jour le statut
  await prisma.talent.update({
    where: { id: talent.id },
    data: {
      activationEmailEnvoye: true,
      activationEmailEnvoyeLe: new Date(),
    },
  })

  return true
}
