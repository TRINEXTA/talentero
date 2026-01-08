/**
 * Service d'authentification JWT
 */

import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './db'
import { UserRole } from '@prisma/client'

// Vérification du secret JWT au démarrage
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string

// En production, JWT_SECRET est OBLIGATOIRE
// En développement, on permet un fallback pour faciliter le démarrage
const isProduction = process.env.NODE_ENV === 'production'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (isProduction) {
    throw new Error('[SECURITE CRITIQUE] JWT_SECRET doit être défini et faire au moins 32 caractères en production. L\'application ne peut pas démarrer.')
  }
  console.warn('[SECURITE] JWT_SECRET non configuré ou trop court. Configurez une clé de 32+ caractères.')
}

// Utiliser le secret fourni ou générer une erreur en prod
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-fallback-not-for-production-use')

export interface JWTPayload {
  userId: number
  uid: string
  email: string
  role: UserRole
}

export interface AuthUser {
  id: number
  uid: string
  email: string
  role: UserRole
  talentId?: number
  clientId?: number
}

/**
 * Hash un mot de passe
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Vérifie un mot de passe
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Génère un token JWT
 */
export function generateToken(payload: JWTPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  return jwt.sign(payload as object, JWT_SECRET, options)
}

/**
 * Vérifie et décode un token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Récupère l'utilisateur connecté depuis les cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        talent: { select: { id: true } },
        client: { select: { id: true } },
      },
    })

    if (!user || !user.isActive) return null

    return {
      id: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
      talentId: user.talent?.id,
      clientId: user.client?.id,
    }
  } catch {
    return null
  }
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
export async function requireRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  if (!roles.includes(user.role)) {
    throw new Error('Accès non autorisé')
  }

  return user
}

/**
 * Crée une session pour l'utilisateur
 */
export async function createSession(
  userId: number,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) throw new Error('Utilisateur non trouvé')

  const token = generateToken({
    userId: user.id,
    uid: user.uid,
    email: user.email,
    role: user.role,
  })

  // Calcule la date d'expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 jours

  // Sauvegarde la session en base
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    },
  })

  // Met à jour la dernière connexion
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  })

  return token
}

/**
 * Supprime une session (déconnexion)
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  })
}

/**
 * Nettoie les sessions expirées
 */
export async function cleanExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
}
