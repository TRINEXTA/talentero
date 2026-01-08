/**
 * Rate Limiting Simple pour les Endpoints Sensibles
 *
 * Implémentation en mémoire pour limiter les tentatives
 * sur les endpoints d'authentification.
 *
 * NOTE: Pour une solution plus robuste en production à fort trafic,
 * considérer l'utilisation de Redis avec @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Stockage en mémoire des tentatives par IP/identifiant
const rateLimitStore = new Map<string, RateLimitEntry>()

// Nettoyage périodique des entrées expirées (toutes les 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  })
}, CLEANUP_INTERVAL)

export interface RateLimitConfig {
  /** Nombre maximum de requêtes autorisées */
  maxRequests: number
  /** Fenêtre de temps en millisecondes */
  windowMs: number
}

export interface RateLimitResult {
  /** Indique si la requête est autorisée */
  success: boolean
  /** Nombre de requêtes restantes */
  remaining: number
  /** Timestamp de réinitialisation */
  resetAt: number
  /** Temps d'attente en secondes avant nouvelle tentative */
  retryAfter?: number
}

/**
 * Vérifie si une requête est autorisée selon les limites configurées
 *
 * @param identifier - Identifiant unique (IP, email, etc.)
 * @param config - Configuration des limites
 * @returns Résultat de la vérification
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  // Si pas d'entrée ou entrée expirée, créer une nouvelle
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }

  // Incrémenter le compteur
  entry.count++

  // Vérifier si la limite est atteinte
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    }
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Réinitialise le compteur pour un identifiant
 * Utile après une connexion réussie
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

// ============================================
// CONFIGURATIONS PRÉ-DÉFINIES
// ============================================

/** Limite pour les tentatives de connexion: 5 essais par 15 minutes */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
}

/** Limite pour les inscriptions: 3 par heure par IP */
export const REGISTER_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 heure
}

/** Limite pour la vérification d'activation: 10 par heure */
export const ACTIVATION_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 heure
}

/** Limite pour les demandes de reset mot de passe: 3 par heure */
export const PASSWORD_RESET_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 heure
}

// ============================================
// HELPER POUR RÉCUPÉRER L'IP
// ============================================

/**
 * Récupère l'adresse IP d'une requête Next.js
 * Prend en compte les proxies (X-Forwarded-For)
 */
export function getClientIP(request: Request): string {
  // Vérifier d'abord X-Forwarded-For (pour les proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Prendre la première IP (le client original)
    return forwardedFor.split(',')[0].trim()
  }

  // Vérifier X-Real-IP (Nginx)
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback vers une IP générique (ne devrait pas arriver en production)
  return 'unknown'
}
