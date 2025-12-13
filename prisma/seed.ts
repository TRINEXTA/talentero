/**
 * Script de seed pour initialiser la base de données
 * Crée un admin par défaut et quelques données de test
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Crée l'admin par défaut
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminTrinexta2025', 12)

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@trinexta.fr' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@trinexta.fr',
      passwordHash: adminPassword,
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  })

  console.log('✅ Admin créé:', admin.email)

  // Crée quelques offres de démonstration
  const offre1 = await prisma.offre.upsert({
    where: { slug: 'dev-fullstack-java-angular-paris' },
    update: {},
    create: {
      slug: 'dev-fullstack-java-angular-paris',
      titre: 'Développeur Full Stack Java/Angular',
      description: `Nous recherchons un développeur Full Stack expérimenté pour rejoindre une équipe agile au sein d'un grand groupe bancaire.

Vous travaillerez sur le développement de nouvelles fonctionnalités pour une application de gestion de portefeuille clients.

Stack technique:
- Backend: Java 17, Spring Boot 3, PostgreSQL
- Frontend: Angular 16, TypeScript, RxJS
- DevOps: Docker, Kubernetes, Jenkins`,
      responsabilites: `- Développer des fonctionnalités full stack
- Participer aux cérémonies agiles (daily, sprint planning, rétro)
- Rédiger des tests unitaires et d'intégration
- Effectuer des code reviews
- Contribuer à l'amélioration continue de l'architecture`,
      profilRecherche: `- 5+ ans d'expérience en développement Java
- Maîtrise de Spring Boot et Angular
- Expérience avec les bases de données relationnelles
- Connaissance de Docker et Kubernetes appréciée
- Bon niveau d'anglais`,
      competencesRequises: ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'PostgreSQL', 'REST API'],
      competencesSouhaitees: ['Docker', 'Kubernetes', 'Jenkins', 'Kafka', 'MongoDB'],
      tjmMin: 500,
      tjmMax: 600,
      dureeJours: 180,
      lieu: 'Paris',
      codePostal: '75009',
      mobilite: 'HYBRIDE',
      experienceMin: 5,
      statut: 'PUBLIEE',
      publieLe: new Date(),
      createdByAdmin: true,
    },
  })

  console.log('✅ Offre créée:', offre1.titre)

  const offre2 = await prisma.offre.upsert({
    where: { slug: 'devops-engineer-aws-remote' },
    update: {},
    create: {
      slug: 'devops-engineer-aws-remote',
      titre: 'DevOps Engineer AWS',
      description: `Mission 100% remote pour un DevOps Engineer confirmé. Vous interviendrez sur l'infrastructure cloud d'une scale-up en forte croissance.

Environnement technique:
- AWS (EKS, RDS, S3, Lambda, CloudFront)
- Terraform, Ansible
- GitLab CI/CD
- Kubernetes, Helm
- Monitoring: Datadog, Prometheus, Grafana`,
      responsabilites: `- Maintenir et améliorer l'infrastructure AWS
- Automatiser les déploiements avec Terraform
- Gérer les clusters Kubernetes
- Optimiser les coûts cloud
- Mettre en place le monitoring et les alertes`,
      profilRecherche: `- 3+ ans d'expérience DevOps/SRE
- Certification AWS appréciée
- Maîtrise de Kubernetes et Terraform
- Expérience CI/CD GitLab
- Autonomie et proactivité`,
      competencesRequises: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'CI/CD'],
      competencesSouhaitees: ['Ansible', 'Prometheus', 'Grafana', 'Python', 'Go'],
      tjmMin: 550,
      tjmMax: 700,
      dureeJours: 120,
      lieu: 'Remote',
      mobilite: 'FULL_REMOTE',
      experienceMin: 3,
      statut: 'PUBLIEE',
      publieLe: new Date(),
      createdByAdmin: true,
    },
  })

  console.log('✅ Offre créée:', offre2.titre)

  const offre3 = await prisma.offre.upsert({
    where: { slug: 'lead-dev-react-nodejs-lyon' },
    update: {},
    create: {
      slug: 'lead-dev-react-nodejs-lyon',
      titre: 'Lead Developer React/Node.js',
      description: `Une PME lyonnaise innovante dans le secteur de la santé recherche un Lead Developer pour encadrer une équipe de 4 développeurs.

Stack:
- Frontend: React 18, Next.js, TypeScript
- Backend: Node.js, NestJS, GraphQL
- Base de données: PostgreSQL, Redis
- Infra: Docker, AWS`,
      responsabilites: `- Encadrer et mentorer l'équipe de développement
- Définir l'architecture technique
- Participer au développement des features critiques
- Assurer la qualité du code (reviews, bonnes pratiques)
- Collaborer avec le Product Owner`,
      profilRecherche: `- 7+ ans d'expérience dont 2 en lead
- Expert React et Node.js
- Expérience en management technique
- Capacité à vulgariser les sujets techniques
- Basé à Lyon ou alentours`,
      competencesRequises: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
      competencesSouhaitees: ['Next.js', 'GraphQL', 'NestJS', 'AWS', 'Redis'],
      tjmMin: 600,
      tjmMax: 750,
      dureeJours: 240,
      lieu: 'Lyon',
      codePostal: '69000',
      mobilite: 'HYBRIDE',
      experienceMin: 7,
      statut: 'PUBLIEE',
      publieLe: new Date(),
      createdByAdmin: true,
    },
  })

  console.log('✅ Offre créée:', offre3.titre)

  // Crée quelques configs de plateforme
  await prisma.configPlateforme.upsert({
    where: { cle: 'PLATEFORME_ACTIVE' },
    update: {},
    create: {
      cle: 'PLATEFORME_ACTIVE',
      valeur: 'true',
      description: 'Active ou désactive la plateforme',
    },
  })

  await prisma.configPlateforme.upsert({
    where: { cle: 'INSCRIPTION_TALENT_ACTIVE' },
    update: {},
    create: {
      cle: 'INSCRIPTION_TALENT_ACTIVE',
      valeur: 'true',
      description: 'Autorise les inscriptions de freelances',
    },
  })

  await prisma.configPlateforme.upsert({
    where: { cle: 'INSCRIPTION_CLIENT_ACTIVE' },
    update: {},
    create: {
      cle: 'INSCRIPTION_CLIENT_ACTIVE',
      valeur: 'true',
      description: 'Autorise les inscriptions de clients',
    },
  })

  console.log('✅ Configuration plateforme créée')

  console.log('')
  console.log('🎉 Seed terminé avec succès!')
  console.log('')
  console.log('📧 Admin: admin@trinexta.fr')
  console.log('🔐 Mot de passe: AdminTrinexta2025')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
