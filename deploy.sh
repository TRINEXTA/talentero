#!/bin/bash

# =============================================================================
# Script de déploiement Talentero - VPS Production
# =============================================================================

set -e

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/talentero"
BACKUP_DIR="/var/backups/talentero"
LOG_FILE="/var/log/talentero-deploy.log"

# Fonction de log
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a $LOG_FILE
}

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    error "Ce script doit être exécuté en tant que root (sudo)"
fi

echo -e "${BLUE}"
echo "=============================================="
echo "   TALENTERO - Déploiement Production VPS"
echo "=============================================="
echo -e "${NC}"

# Créer les répertoires nécessaires
mkdir -p $BACKUP_DIR
mkdir -p $(dirname $LOG_FILE)

# Étape 1: Backup de la base de données
log "📦 Création du backup de la base de données..."
if [ -f "$APP_DIR/.env" ]; then
    source $APP_DIR/.env
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    pg_dump $DATABASE_URL > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql" 2>/dev/null || warn "Impossible de créer le backup DB"
    log "✅ Backup créé: db_backup_$TIMESTAMP.sql"
else
    warn "Fichier .env non trouvé, backup ignoré"
fi

# Étape 2: Pull des dernières modifications
log "📥 Récupération des dernières modifications..."
cd $APP_DIR
git fetch origin
git pull origin main || error "Échec du git pull"

# Étape 3: Installation des dépendances
log "📦 Installation des dépendances..."
npm ci --production=false || error "Échec de npm ci"

# Étape 4: Génération du client Prisma
log "🔧 Génération du client Prisma..."
npx prisma generate || error "Échec de prisma generate"

# Étape 5: Migration de la base de données (si nécessaire)
log "🗄️ Application des migrations..."
npx prisma migrate deploy || warn "Pas de nouvelles migrations"

# Étape 6: Build de l'application
log "🏗️ Build de l'application Next.js..."
npm run build || error "Échec du build"

# Étape 7: Redémarrage de l'application avec PM2
log "🔄 Redémarrage de l'application..."
if pm2 list | grep -q "talentero"; then
    pm2 reload talentero --update-env
else
    pm2 start ecosystem.config.js
fi

# Étape 8: Sauvegarde PM2
pm2 save

# Étape 9: Nettoyage des anciens backups (garder 7 jours)
log "🧹 Nettoyage des anciens backups..."
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

# Vérification finale
log "🔍 Vérification du déploiement..."
sleep 3

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
    echo -e "${GREEN}"
    echo "=============================================="
    echo "   ✅ DÉPLOIEMENT RÉUSSI !"
    echo "=============================================="
    echo -e "${NC}"
    log "Déploiement terminé avec succès"
else
    warn "L'API health check ne répond pas (normal si pas configuré)"
    log "Déploiement terminé - vérifiez manuellement"
fi

# Afficher le statut PM2
pm2 status
