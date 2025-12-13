# 🚀 TALENTERO

**Where IT talent meets opportunity**

Plateforme de recrutement freelance IT nouvelle génération, opérée par TRINEXTA.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-proprietary-red)
![Node](https://img.shields.io/badge/node-20.x-green)

---

## ✨ Fonctionnalités

### Pour les Talents (Freelances)
- 🚀 Inscription en 30 secondes avec parsing CV automatique
- ✅ Vérification SIRET obligatoire (100% indépendants)
- ⚡ Matching instantané avec score visible
- 📊 Dashboard personnel avec suivi des candidatures
- 🔔 Alertes personnalisées sur les nouvelles offres

### Pour les Clients (Entreprises)
- 📝 Publication d'offres avec validation TRINEXTA
- 👥 Réception de candidatures matchées
- 🔒 Profils anonymisés (CV brandés TRINEXTA)
- 💬 Messagerie intégrée

### Pour TRINEXTA (Admin)
- 📊 Dashboard global temps réel
- ✅ Validation clients et modération offres
- 🎯 Matching manuel et gestion pipeline
- 📈 Analytics et reporting

---

## 🛠 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS + shadcn/ui |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Parsing CV | Claude API (Anthropic) |
| Vérification SIRET | API INSEE |
| Emails | Brevo (ex-Sendinblue) |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt |

---

## 📁 Structure du Projet

```
talentero/
├── prisma/
│   └── schema.prisma      # Schéma base de données
├── src/
│   ├── app/               # Pages Next.js (App Router)
│   │   ├── page.tsx       # Landing page
│   │   ├── layout.tsx     # Layout principal
│   │   ├── globals.css    # Styles globaux
│   │   ├── offres/        # Pages offres publiques
│   │   ├── t/             # Espace Talent
│   │   ├── c/             # Espace Client
│   │   └── admin/         # Espace Admin
│   ├── components/        # Composants React
│   │   └── ui/            # Composants shadcn/ui
│   └── lib/               # Utilitaires
│       ├── db.ts          # Connexion Prisma
│       ├── siret.ts       # Vérification SIRET
│       └── cv-parser.ts   # Parsing CV avec Claude
├── public/                # Assets statiques
├── .env.example           # Variables d'environnement
├── package.json
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
├── DEPLOIEMENT_VPS.md     # Guide de déploiement
└── README.md
```

---

## 🚀 Installation Locale

### Prérequis

- Node.js 20+
- PostgreSQL 15+
- Compte API Anthropic (Claude)
- Compte API INSEE

### Étapes

```bash
# 1. Cloner le projet
git clone https://github.com/votre-repo/talentero.git
cd talentero

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Initialiser la base de données
npx prisma generate
npx prisma migrate dev

# 5. Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

---

## 🌐 Déploiement Production

Voir le guide complet : [DEPLOIEMENT_VPS.md](./DEPLOIEMENT_VPS.md)

### Résumé

```bash
# Sur le VPS OVH
git clone https://github.com/votre-repo/talentero.git /var/www/talentero
cd /var/www/talentero
npm install
cp .env.example .env
# Configurer .env
npx prisma migrate deploy
npm run build
pm2 start npm --name "talentero" -- start
```

---

## 📊 Base de Données

### Entités principales

| Entité | Description |
|--------|-------------|
| `User` | Compte utilisateur (auth) |
| `Talent` | Profil freelance avec SIRET |
| `Client` | Profil entreprise |
| `Offre` | Offre de mission |
| `Candidature` | Candidature d'un talent |
| `Match` | Score de matching |

### Commandes Prisma

```bash
# Générer le client
npx prisma generate

# Créer une migration
npx prisma migrate dev --name nom_migration

# Appliquer en production
npx prisma migrate deploy

# Ouvrir Prisma Studio
npx prisma studio
```

---

## 🔐 Variables d'Environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Secret pour les tokens JWT |
| `ANTHROPIC_API_KEY` | Clé API Claude |
| `INSEE_API_KEY` | Clé API INSEE |
| `INSEE_API_SECRET` | Secret API INSEE |
| `BREVO_API_KEY` | Clé API Brevo (emails) |
| `NEXT_PUBLIC_APP_URL` | URL publique du site |

---

## 📝 Scripts NPM

```bash
npm run dev        # Serveur de développement
npm run build      # Build de production
npm run start      # Lancer en production
npm run lint       # Vérification du code
npm run db:studio  # Ouvrir Prisma Studio
npm run db:migrate # Créer une migration
```

---

## 🎨 Design System

### Couleurs

| Couleur | Hex | Usage |
|---------|-----|-------|
| Primary | `#2563eb` | Actions principales |
| Success | `#10b981` | Succès, matching |
| Accent | `#f59e0b` | Alertes, attention |
| Dark | `#1e293b` | Texte |
| Light | `#f8fafc` | Fond |

### Composants

Basé sur [shadcn/ui](https://ui.shadcn.com/) :
- Button, Card, Input, Select
- Dialog, Dropdown, Tabs
- Toast, Avatar, Badge
- Et plus...

---

## 📞 Support

**TRINEXTA by TrusTech IT Support**
- Email: contact@trinexta.fr
- Localisation: Corbeil-Essonnes, Île-de-France

---

## 📄 Licence

Propriétaire - TRINEXTA © 2025. Tous droits réservés.
