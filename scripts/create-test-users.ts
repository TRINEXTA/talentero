import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Génère un code unique
function generateCode(prefix: string, existingCodes: string[]): string {
  let code: string
  do {
    const num = Math.floor(1000 + Math.random() * 9000)
    code = `${prefix}${num}`
  } while (existingCodes.includes(code))
  return code
}

async function main() {
  console.log('🚀 Création des utilisateurs de test...\n')

  const passwordHash = await bcrypt.hash('Test2024!', 12)

  // Récupérer les codes existants
  const existingTalentCodes = (await prisma.talent.findMany({ select: { codeUnique: true } })).map(t => t.codeUnique)
  const existingClientCodes = (await prisma.client.findMany({ select: { codeUnique: true } })).map(c => c.codeUnique)

  // ============================================
  // CLIENTS TEST
  // ============================================
  console.log('📦 Création des clients test...')

  // Client 1 - Tech Solutions
  const client1Code = generateCode('CL', existingClientCodes)
  const user1 = await prisma.user.create({
    data: {
      email: 'client1@test.com',
      passwordHash,
      role: 'CLIENT',
      emailVerified: true,
      isActive: true,
      client: {
        create: {
          codeUnique: client1Code,
          raisonSociale: 'Tech Solutions SAS',
          siret: '12345678901234',
          typeClient: 'DIRECT',
          adresse: '15 rue de la Paix',
          codePostal: '75001',
          ville: 'Paris',
          secteurActivite: 'IT / Services numériques',
          tailleEntreprise: 'PME',
          siteWeb: 'https://tech-solutions.fr',
          description: 'Entreprise spécialisée dans les solutions digitales et le conseil IT.',
          statut: 'ACTIF',
          valideParAdmin: true,
          valideLe: new Date(),
        }
      }
    },
    include: { client: true }
  })
  existingClientCodes.push(client1Code)
  console.log(`  ✅ Client 1: ${user1.email} (${client1Code}) - Tech Solutions SAS`)

  // Client 2 - Innovation Corp
  const client2Code = generateCode('CL', existingClientCodes)
  const user2 = await prisma.user.create({
    data: {
      email: 'client2@test.com',
      passwordHash,
      role: 'CLIENT',
      emailVerified: true,
      isActive: true,
      client: {
        create: {
          codeUnique: client2Code,
          raisonSociale: 'Innovation Corp SARL',
          siret: '98765432109876',
          typeClient: 'DIRECT',
          adresse: '42 avenue des Champs-Élysées',
          codePostal: '75008',
          ville: 'Paris',
          secteurActivite: 'Conseil en transformation digitale',
          tailleEntreprise: 'ETI',
          siteWeb: 'https://innovation-corp.fr',
          description: 'Leader de la transformation digitale pour les grandes entreprises.',
          statut: 'ACTIF',
          valideParAdmin: true,
          valideLe: new Date(),
        }
      }
    },
    include: { client: true }
  })
  console.log(`  ✅ Client 2: ${user2.email} (${client2Code}) - Innovation Corp SARL`)

  // ============================================
  // TALENTS TEST
  // ============================================
  console.log('\n👨‍💻 Création des talents test...')

  // Talent 1 - Développeur Full Stack
  const talent1Code = generateCode('TA', existingTalentCodes)
  const user3 = await prisma.user.create({
    data: {
      email: 'talent1@test.com',
      passwordHash,
      role: 'TALENT',
      emailVerified: true,
      isActive: true,
      talent: {
        create: {
          codeUnique: talent1Code,
          prenom: 'Jean',
          nom: 'Dupont',
          telephone: '0612345678',
          siret: '11122233344455',
          raisonSociale: 'Jean Dupont Consulting',
          typeSociete: 'AUTO_ENTREPRENEUR',
          siretVerifie: true,
          adresse: '10 rue du Code',
          codePostal: '92100',
          ville: 'Boulogne-Billancourt',
          titrePoste: 'Développeur Full Stack Senior',
          categorieProfessionnelle: 'DEVELOPPEUR',
          bio: 'Développeur passionné avec 8 ans d\'expérience en développement web. Spécialisé React/Node.js.',
          competences: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
          anneesExperience: 8,
          tjm: 550,
          tjmMin: 500,
          tjmMax: 600,
          mobilite: 'HYBRIDE',
          disponibilite: 'IMMEDIATE',
          zonesIntervention: ['Paris', 'Ile-de-France'],
          zonesGeographiques: ['75', '92', '93', '94'],
          frameworks: ['React', 'Next.js', 'Express', 'NestJS'],
          baseDonnees: ['PostgreSQL', 'MongoDB', 'Redis'],
          outils: ['Git', 'Docker', 'Kubernetes', 'CI/CD'],
          methodologies: ['Agile', 'Scrum', 'DevOps'],
          langues: ['Français (natif)', 'Anglais (courant)'],
          certifications: ['AWS Solutions Architect'],
          linkedinUrl: 'https://linkedin.com/in/jean-dupont',
          githubUrl: 'https://github.com/jeandupont',
          statut: 'ACTIF',
          visiblePublic: true,
          visibleVitrine: true,
          compteComplet: true,
        }
      }
    },
    include: { talent: true }
  })
  existingTalentCodes.push(talent1Code)
  console.log(`  ✅ Talent 1: ${user3.email} (${talent1Code}) - Jean Dupont, Développeur Full Stack`)

  // Talent 2 - DevOps Engineer
  const talent2Code = generateCode('TA', existingTalentCodes)
  const user4 = await prisma.user.create({
    data: {
      email: 'talent2@test.com',
      passwordHash,
      role: 'TALENT',
      emailVerified: true,
      isActive: true,
      talent: {
        create: {
          codeUnique: talent2Code,
          prenom: 'Marie',
          nom: 'Martin',
          telephone: '0698765432',
          siret: '55544433322211',
          raisonSociale: 'MM DevOps',
          typeSociete: 'SASU',
          siretVerifie: true,
          adresse: '25 boulevard Haussmann',
          codePostal: '75009',
          ville: 'Paris',
          titrePoste: 'Ingénieur DevOps / SRE',
          categorieProfessionnelle: 'DEVOPS_SRE',
          bio: 'Ingénieur DevOps certifié avec expertise Cloud (AWS, GCP). Passionnée par l\'automatisation et l\'infrastructure as code.',
          competences: ['Kubernetes', 'Terraform', 'AWS', 'GCP', 'Python', 'CI/CD', 'Prometheus', 'Grafana'],
          anneesExperience: 6,
          tjm: 650,
          tjmMin: 600,
          tjmMax: 700,
          mobilite: 'FULL_REMOTE',
          disponibilite: 'SOUS_15_JOURS',
          zonesIntervention: ['France entière', 'Remote'],
          zonesGeographiques: ['Remote'],
          frameworks: ['Ansible', 'Terraform', 'Helm'],
          baseDonnees: ['PostgreSQL', 'MySQL', 'ElasticSearch'],
          outils: ['Jenkins', 'GitLab CI', 'ArgoCD', 'Prometheus', 'Grafana', 'ELK Stack'],
          methodologies: ['DevOps', 'SRE', 'GitOps', 'Infrastructure as Code'],
          langues: ['Français (natif)', 'Anglais (bilingue)'],
          certifications: ['AWS DevOps Professional', 'CKA (Kubernetes)', 'Terraform Associate'],
          linkedinUrl: 'https://linkedin.com/in/marie-martin-devops',
          statut: 'ACTIF',
          visiblePublic: true,
          visibleVitrine: true,
          compteComplet: true,
        }
      }
    },
    include: { talent: true }
  })
  console.log(`  ✅ Talent 2: ${user4.email} (${talent2Code}) - Marie Martin, DevOps/SRE`)

  // ============================================
  // RÉSUMÉ
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('📋 RÉSUMÉ DES COMPTES CRÉÉS')
  console.log('='.repeat(50))
  console.log('\n🔐 Mot de passe pour tous les comptes: Test2024!\n')
  console.log('CLIENTS:')
  console.log(`  • client1@test.com (${client1Code}) - Tech Solutions SAS`)
  console.log(`  • client2@test.com (${client2Code}) - Innovation Corp SARL`)
  console.log('\nTALENTS:')
  console.log(`  • talent1@test.com (${talent1Code}) - Jean Dupont`)
  console.log(`  • talent2@test.com (${talent2Code}) - Marie Martin`)
  console.log('\n' + '='.repeat(50))
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
