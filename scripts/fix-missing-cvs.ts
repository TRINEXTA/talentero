/**
 * Script de réparation des CVs manquants
 *
 * Ce script:
 * 1. Trouve tous les talents avec un cvUrl mais sans fichier physique
 * 2. Met à jour la base pour refléter la réalité (cvUrl = null)
 * 3. Optionnellement envoie des notifications aux talents concernés
 *
 * Usage:
 *   npx ts-node scripts/fix-missing-cvs.ts [--dry-run] [--notify]
 *
 * Options:
 *   --dry-run : Affiche ce qui serait fait sans modifier la base
 *   --notify  : Envoie un email aux talents pour leur demander de ré-uploader
 */

import { PrismaClient } from '@prisma/client'
import { existsSync } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface MissingCV {
  talentId: number
  talentUid: string
  prenom: string
  nom: string
  email: string
  cvUrl: string
  expectedPath: string
}

async function findMissingCVs(): Promise<MissingCV[]> {
  const talents = await prisma.talent.findMany({
    where: {
      cvUrl: { not: null }
    },
    include: {
      user: {
        select: { email: true }
      }
    }
  })

  const missing: MissingCV[] = []

  for (const talent of talents) {
    if (!talent.cvUrl) continue

    // Extraire le nom du fichier
    const filename = talent.cvUrl.split('/').pop()
    if (!filename) continue

    // Vérifier les deux emplacements possibles
    const dataPath = path.join(process.cwd(), 'data', 'cv', filename)
    const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)

    const fileExists = existsSync(dataPath) || existsSync(publicPath)

    if (!fileExists) {
      missing.push({
        talentId: talent.id,
        talentUid: talent.uid,
        prenom: talent.prenom,
        nom: talent.nom,
        email: talent.user.email,
        cvUrl: talent.cvUrl,
        expectedPath: dataPath
      })
    }
  }

  return missing
}

async function fixMissingCVs(dryRun: boolean = false): Promise<void> {
  console.log('=== Script de réparation des CVs manquants ===\n')

  const missing = await findMissingCVs()

  if (missing.length === 0) {
    console.log('✅ Aucun CV manquant trouvé. Tout est OK!')
    return
  }

  console.log(`⚠️  ${missing.length} CV(s) manquant(s) trouvé(s):\n`)

  for (const cv of missing) {
    console.log(`  - ${cv.prenom} ${cv.nom} (${cv.email})`)
    console.log(`    cvUrl: ${cv.cvUrl}`)
    console.log(`    Fichier attendu: ${cv.expectedPath}`)
    console.log('')
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Aucune modification effectuée.')
    console.log('Relancez sans --dry-run pour appliquer les corrections.')
    return
  }

  console.log('\nApplication des corrections...\n')

  for (const cv of missing) {
    await prisma.talent.update({
      where: { id: cv.talentId },
      data: {
        cvUrl: null,
        cvOriginalName: null,
      }
    })
    console.log(`  ✓ ${cv.prenom} ${cv.nom} - cvUrl remis à null`)
  }

  console.log(`\n✅ ${missing.length} profil(s) mis à jour.`)
  console.log('Les talents concernés devront ré-uploader leur CV.')
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  try {
    await fixMissingCVs(dryRun)
  } catch (error) {
    console.error('Erreur:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
