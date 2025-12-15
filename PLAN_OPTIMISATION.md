# PLAN D'OPTIMISATION TALENTERO
## Plateforme ESN/Sous-traitance IT

---

## PHASE 1 : Import en Masse de CVs (PRIORITÉ CRITIQUE)

### 1.1 Nouvelle page `/admin/import-cv-masse`

**Fonctionnalités:**
- Upload multiple fichiers (sélection multi ou ZIP)
- Formats acceptés : PDF, DOCX
- Sélection de l'offre cible (obligatoire)
- Affichage progression en temps réel
- Résumé final avec succès/erreurs

**Flux:**
```
Admin sélectionne offre cible
    ↓
Admin upload CVs (multi-select ou ZIP)
    ↓
Pour chaque CV:
    → Parsing IA (extraction nom, compétences, expérience)
    → Classification auto par catégorie professionnelle
    → Création User (sans mot de passe, activationToken)
    → Création Talent (compteLimite=true, importeParAdmin=true)
    → Création Candidature (liée à l'offre)
    → Envoi email bienvenue personnalisé
    ↓
Affichage résumé (X importés, Y erreurs)
```

### 1.2 API `POST /api/admin/talents/bulk-import`

**Payload:**
```typescript
{
  offreId: number           // Offre à laquelle affecter les CVs
  files: File[]             // CVs à importer
  sendEmails: boolean       // Envoyer emails immédiatement
}
```

**Réponse:**
```typescript
{
  total: number
  imported: number
  errors: { filename: string, error: string }[]
  talents: TalentSummary[]
}
```

### 1.3 Classification automatique par catégorie

**Logique d'analyse du titre/compétences:**
```typescript
const CATEGORY_KEYWORDS = {
  DEVELOPPEUR: ['développeur', 'developer', 'dev', 'fullstack', 'frontend', 'backend'],
  CHEF_DE_PROJET: ['chef de projet', 'project manager', 'pm', 'scrum master'],
  TECHNICIEN_HELPDESK_N1: ['helpdesk n1', 'support n1', 'technicien n1'],
  TECHNICIEN_HELPDESK_N2: ['helpdesk n2', 'support n2', 'technicien n2'],
  SUPPORT_TECHNICIEN: ['technicien', 'support', 'helpdesk'],
  INGENIEUR_SYSTEME_RESEAU: ['ingénieur système', 'admin système', 'sysadmin', 'réseau', 'network'],
  INGENIEUR_CLOUD: ['cloud', 'aws', 'azure', 'gcp', 'devops'],
  DATA_BI: ['data', 'bi', 'analyst', 'analytics', 'big data'],
  CYBERSECURITE: ['cyber', 'sécurité', 'security', 'soc', 'pentester'],
  ARCHITECTE: ['architecte', 'architect'],
}
```

### 1.4 Email de bienvenue personnalisé

**Template:**
```
Objet: Votre candidature TRINEXTA - Activez votre espace

Bonjour {prenom},

Suite à votre candidature pour le poste "{titreOffre}", nous avons le plaisir
de vous informer que votre profil a été sélectionné pour rejoindre notre
vivier de talents IT.

TRINEXTA est une ESN spécialisée dans le placement de consultants IT.
Nous avons analysé votre CV et créé votre espace personnel.

👉 Pour activer votre compte, cliquez ici : {lienActivation}

Ce lien est valable 7 jours.

Une fois connecté, vous pourrez :
- Compléter votre profil professionnel
- Renseigner vos informations administratives (SIRET, société)
- Postuler à d'autres missions

Cordialement,
L'équipe TRINEXTA
```

---

## PHASE 2 : CVs Anonymisés (SOUS-TRAITANCE)

### 2.1 Génération CV anonyme

**Principe:**
- Masquer : nom, prénom, email, téléphone, photo, LinkedIn
- Conserver : compétences, expériences (sans nom entreprise si sensible), formations
- Ajouter : logo TRINEXTA, code talent (TA4523)

**Formats:**
- PDF téléchargeable
- Aperçu web

### 2.2 Nouvelles routes

```
GET /api/admin/talents/[uid]/cv-anonyme
    → Génère et retourne le PDF anonymisé

GET /api/admin/shortlists/[uid]/export-anonyme
    → Exporte tous les CVs de la shortlist en ZIP anonymisé
```

### 2.3 Interface

**Page talent admin:**
- Bouton "Télécharger CV anonyme"
- Prévisualisation

**Page shortlist:**
- Bouton "Exporter shortlist anonyme (ZIP)"
- Option : inclure fiche de synthèse par candidat

---

## PHASE 3 : Matching Hiérarchique (Ingénieur → Technicien)

### 3.1 Hiérarchie des niveaux

```typescript
const CATEGORY_HIERARCHY = {
  // Un ingénieur système/réseau peut prendre des missions technicien
  INGENIEUR_SYSTEME_RESEAU: ['SUPPORT_TECHNICIEN', 'TECHNICIEN_HELPDESK_N1', 'TECHNICIEN_HELPDESK_N2'],
  INGENIEUR_CLOUD: ['SUPPORT_TECHNICIEN', 'DEVOPS_SRE'],
  ARCHITECTE: ['INGENIEUR_SYSTEME_RESEAU', 'DEVELOPPEUR', 'INGENIEUR_CLOUD'],
  CHEF_DE_PROJET: ['SCRUM_MASTER', 'PRODUCT_OWNER'],
}
```

### 3.2 Modification du matching

Dans `/lib/matching.ts`, ajouter la logique :
- Si le talent a une catégorie "supérieure", il peut matcher avec les offres de niveau "inférieur"
- Le score n'est pas pénalisé (bonus même car surqualifié)

---

## PHASE 4 : Workflow Onboarding Freelance

### 4.1 Nouveaux champs Talent (schema.prisma)

```prisma
model Talent {
  // ... champs existants ...

  // Gestion société en cours de création
  dateCreationSocietePrevue  DateTime?   // Date prévue création
  raisonAbsenceSiret         RaisonAbsenceSiret?

  // Suivi archivage
  dateRappel1Envoye          DateTime?   // Rappel J-30
  dateRappel2Envoye          DateTime?   // Rappel J-15
  dateRappel3Envoye          DateTime?   // Rappel J-7
  dateArchivage              DateTime?   // Date d'archivage auto

  // Portage salarial
  societePortage             String?     // Nom de la société de portage
}

enum RaisonAbsenceSiret {
  EN_COURS_CREATION    // Société en cours de création
  PORTAGE_SALARIAL     // En portage salarial
  MICRO_ENTREPRENEUR   // En cours d'immatriculation
  AUTRE
}
```

### 4.2 Pages d'onboarding (après activation)

**Étape 1 : Création mot de passe**
```
/activation/[token]
→ Vérification token
→ Formulaire : mot de passe + confirmation
→ Redirection vers onboarding
```

**Étape 2 : Informations personnelles**
```
/t/onboarding/informations
→ Adresse complète
→ Téléphone
→ Nationalité (important pour habilitations)
```

**Étape 3 : Situation entreprise**
```
/t/onboarding/entreprise
→ "Avez-vous déjà une société ?"
  - OUI : Saisie SIRET → Vérification INSEE auto
  - NON :
    - Type prévu (SASU, EURL, AE, etc.)
    - Date création prévue (max 3 mois)
  - EN PORTAGE : Sélection/saisie société de portage
```

**Étape 4 : Profil professionnel**
```
/t/onboarding/profil
→ Validation/correction compétences parsées
→ TJM souhaité (min/max)
→ Disponibilité
→ Mobilité et zones géographiques
```

### 4.3 Indicateur de complétion

Dashboard talent avec barre de progression :
- Informations personnelles : ✓
- Situation entreprise : ✓ ou "En attente"
- Profil professionnel : ✓
- CV téléchargé : ✓

---

## PHASE 5 : Archivage Automatique (3 mois)

### 5.1 CRON Job quotidien

**Script `/scripts/check-siret-deadline.ts`:**

```typescript
// Exécuté chaque jour à 9h
async function checkSiretDeadlines() {
  const now = new Date()

  // Talents sans SIRET créés il y a plus de 90 jours
  // OU date prévue création dépassée de 14 jours
  const talentsAArchiver = await prisma.talent.findMany({
    where: {
      siret: null,
      compteLimite: true,
      statut: 'ACTIF',
      OR: [
        // Créé il y a plus de 90 jours
        { createdAt: { lt: subDays(now, 90) } },
        // Date prévue dépassée de 14 jours
        { dateCreationSocietePrevue: { lt: subDays(now, 14) } }
      ]
    }
  })

  for (const talent of talentsAArchiver) {
    // Envoyer notification finale
    // Archiver (statut = SUSPENDU)
  }
}
```

### 5.2 Rappels automatiques

| Jour | Action |
|------|--------|
| J-30 | Email : "Votre SIRET est attendu sous 30 jours" |
| J-15 | Email : "Rappel - 15 jours restants" |
| J-7 | Email : "Dernier rappel - compte sera archivé" |
| J-0 | Archivage automatique (`statut = SUSPENDU`) |

### 5.3 Réactivation

- Admin peut réactiver un compte archivé
- Talent fournit SIRET → compte réactivé automatiquement

---

## PHASE 6 : Améliorations Interface Admin

### 6.1 Dashboard enrichi

- Graphiques : évolution talents/offres/candidatures
- Alertes : talents sans SIRET proches deadline
- Stats : taux conversion, délai moyen placement

### 6.2 Gestion contacts clients (UI)

- Formulaire ajout contact dans page client
- Liste contacts avec actions (modifier, supprimer, définir principal)

### 6.3 Export CSV

- Bouton export sur listes (talents, clients, offres)
- Filtres appliqués à l'export

---

## RÉCAPITULATIF FICHIERS À CRÉER/MODIFIER

### Nouveaux fichiers

```
src/
├── app/
│   ├── admin/
│   │   └── import-cv-masse/
│   │       └── page.tsx                    # Import masse
│   ├── api/
│   │   └── admin/
│   │       └── talents/
│   │           ├── bulk-import/
│   │           │   └── route.ts            # API import masse
│   │           └── [uid]/
│   │               └── cv-anonyme/
│   │                   └── route.ts        # Génération CV anonyme
│   └── t/
│       └── onboarding/
│           ├── informations/
│           │   └── page.tsx
│           ├── entreprise/
│           │   └── page.tsx
│           └── profil/
│               └── page.tsx
├── lib/
│   ├── category-classifier.ts              # Classification auto
│   ├── cv-anonymizer.ts                    # Génération CV anonyme
│   └── siret-reminder.ts                   # Logique rappels
└── scripts/
    └── check-siret-deadline.ts             # CRON archivage
```

### Fichiers à modifier

```
prisma/schema.prisma                         # Nouveaux champs
src/lib/matching.ts                          # Hiérarchie catégories
src/lib/microsoft-graph.ts                   # Nouveau template email
src/app/activation/[token]/page.tsx          # Workflow activation
```

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

```
1. [2-3h] Modifier schema.prisma + migration
2. [4-5h] Import masse CVs + classification
3. [2-3h] Email bienvenue personnalisé
4. [3-4h] CV anonymisé
5. [2-3h] Matching hiérarchique
6. [4-5h] Workflow onboarding
7. [2-3h] Archivage automatique
8. [2-3h] Améliorations admin
```

**Total estimé : 20-25h de développement**

---

## QUESTIONS EN SUSPENS

1. Logo TRINEXTA pour CV anonyme (avez-vous le fichier ?)
2. Sociétés de portage à proposer (liste prédéfinie ?)
3. Message exact pour les emails de rappel SIRET ?
4. Faut-il une validation admin avant archivage ou auto total ?
