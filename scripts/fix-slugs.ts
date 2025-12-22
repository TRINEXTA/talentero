import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fonction pour transformer un titre en slug propre
function generateSlug(title: string, codeUnique: string) {
  const baseSlug = title
    .toLowerCase()
    .normalize('NFD') // Supprime les accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, '') // Supprime les tirets au début et à la fin

  return `${baseSlug}-${codeUnique}`
}

async function main() {
  console.log('🚀 Démarrage de la réparation des slugs...')

  try {
    const offres = await prisma.offre.findMany({
      select: { id: true, titre: true, codeUnique: true, slug: true }
    })

    console.log(`📦 Analyse de ${offres.length} offres...`)
    let updatedCount = 0

    for (const offre of offres) {
      // Si le slug est vide, null ou invalide
      if (!offre.slug || offre.slug.trim() === '' || offre.slug === 'null') {
        const newSlug = generateSlug(offre.titre, offre.codeUnique)
        
        console.log(`🛠 Correction Offre #${offre.id} : "${offre.titre}" -> "${newSlug}"`)

        await prisma.offre.update({
          where: { id: offre.id },
          data: { slug: newSlug }
        })
        updatedCount++
      }
    }

    console.log(`✅ TERMINÉ : ${updatedCount} offres corrigées.`)
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
