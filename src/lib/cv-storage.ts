/**
 * Utilitaires pour le stockage sécurisé des CVs
 *
 * Ce module garantit que les fichiers CV sont correctement sauvegardés
 * et vérifie leur intégrité après écriture.
 */

import { writeFile, mkdir, stat, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

// Répertoire de stockage des CVs
const CV_STORAGE_DIR = path.join(process.cwd(), 'data', 'cv')

export interface SaveCVResult {
  success: boolean
  filename: string
  filepath: string
  cvUrl: string
  size: number
  checksum: string
  error?: string
}

/**
 * Génère un checksum MD5 pour vérifier l'intégrité du fichier
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

/**
 * Sauvegarde un fichier CV de manière sécurisée avec vérification
 *
 * @param buffer - Le contenu du fichier
 * @param userUid - L'UID de l'utilisateur (pour nommer le fichier)
 * @param originalFilename - Le nom original du fichier
 * @returns Résultat de la sauvegarde avec vérification
 */
export async function saveCVSecurely(
  buffer: Buffer,
  userUid: string,
  originalFilename: string
): Promise<SaveCVResult> {
  // Étape 1: Créer le répertoire si nécessaire
  if (!existsSync(CV_STORAGE_DIR)) {
    await mkdir(CV_STORAGE_DIR, { recursive: true })
  }

  // Étape 2: Générer le nom de fichier unique
  const ext = path.extname(originalFilename).toLowerCase()
  const timestamp = Date.now()
  const filename = `${userUid}_${timestamp}${ext}`
  const filepath = path.join(CV_STORAGE_DIR, filename)

  // Étape 3: Calculer le checksum avant écriture
  const originalChecksum = calculateChecksum(buffer)

  try {
    // Étape 4: Écrire le fichier
    await writeFile(filepath, buffer)

    // Étape 5: VÉRIFICATION CRITIQUE - Relire le fichier et vérifier
    if (!existsSync(filepath)) {
      throw new Error(`ERREUR CRITIQUE: Le fichier n'existe pas après écriture: ${filepath}`)
    }

    const stats = await stat(filepath)
    if (stats.size !== buffer.length) {
      throw new Error(`ERREUR CRITIQUE: Taille fichier incorrecte. Attendu: ${buffer.length}, Réel: ${stats.size}`)
    }

    // Vérifier le checksum
    const savedBuffer = await readFile(filepath)
    const savedChecksum = calculateChecksum(savedBuffer)

    if (savedChecksum !== originalChecksum) {
      throw new Error(`ERREUR CRITIQUE: Checksum invalide. Original: ${originalChecksum}, Sauvé: ${savedChecksum}`)
    }

    console.log(`✅ CV sauvegardé avec succès: ${filename} (${stats.size} bytes, checksum: ${savedChecksum})`)

    return {
      success: true,
      filename,
      filepath,
      cvUrl: `/api/cv/${filename}`,
      size: stats.size,
      checksum: savedChecksum
    }
  } catch (error) {
    console.error(`❌ ERREUR sauvegarde CV:`, error)

    // Tenter de nettoyer si le fichier a été partiellement écrit
    try {
      if (existsSync(filepath)) {
        const { unlink } = await import('fs/promises')
        await unlink(filepath)
      }
    } catch {
      // Ignore les erreurs de nettoyage
    }

    return {
      success: false,
      filename,
      filepath,
      cvUrl: '',
      size: 0,
      checksum: '',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Vérifie si un fichier CV existe physiquement
 */
export function cvFileExists(cvUrl: string | null): boolean {
  if (!cvUrl) return false

  const filename = cvUrl.split('/').pop()
  if (!filename) return false

  const dataPath = path.join(process.cwd(), 'data', 'cv', filename)
  const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)

  return existsSync(dataPath) || existsSync(publicPath)
}

/**
 * Obtient le chemin physique d'un fichier CV
 */
export function getCVFilePath(cvUrl: string | null): string | null {
  if (!cvUrl) return null

  const filename = cvUrl.split('/').pop()
  if (!filename) return null

  const dataPath = path.join(process.cwd(), 'data', 'cv', filename)
  if (existsSync(dataPath)) return dataPath

  const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)
  if (existsSync(publicPath)) return publicPath

  return null
}
