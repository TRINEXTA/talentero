#!/bin/bash

# =============================================================================
# Script d'installation initiale VPS pour Talentero
# À exécuter une seule fois lors de la première installation
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "=============================================="
echo "   TALENTERO - Installation VPS initiale"
echo "=============================================="
echo -e "${NC}"

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Ce script doit être exécuté en tant que root (sudo)${NC}"
    exit 1
fi

# Variables
read -p "Entrez votre nom de domaine (ex: talentero.com): " DOMAIN_NAME
read -p "Entrez votre email pour SSL (Let's Encrypt): " SSL_EMAIL
read -p "Entrez le mot de passe PostgreSQL: " -s DB_PASSWORD
echo ""

APP_DIR="/var/www/talentero"
NODE_VERSION="20"

echo -e "${GREEN}[1/10]${NC} Mise à jour du système..."
apt update && apt upgrade -y

echo -e "${GREEN}[2/10]${NC} Installation des dépendances système..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw

echo -e "${GREEN}[3/10]${NC} Installation de Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

echo -e "${GREEN}[4/10]${NC} Installation de PM2..."
npm install -g pm2

echo -e "${GREEN}[5/10]${NC} Installation de PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Configuration PostgreSQL
echo -e "${GREEN}[6/10]${NC} Configuration de la base de données..."
sudo -u postgres psql <<EOF
CREATE USER talentero WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE talentero OWNER talentero;
GRANT ALL PRIVILEGES ON DATABASE talentero TO talentero;
EOF

echo -e "${GREEN}[7/10]${NC} Création des répertoires..."
mkdir -p $APP_DIR
mkdir -p /var/log/talentero
mkdir -p /var/backups/talentero

echo -e "${GREEN}[8/10]${NC} Configuration du firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

echo -e "${GREEN}[9/10]${NC} Clonage du repository..."
echo "Entrez l'URL de votre repository Git:"
read GIT_URL
git clone $GIT_URL $APP_DIR

# Création du fichier .env
echo -e "${GREEN}[10/10]${NC} Configuration de l'environnement..."
cat > $APP_DIR/.env <<EOF
# Base de données
DATABASE_URL="postgresql://talentero:${DB_PASSWORD}@localhost:5432/talentero"

# Authentification
JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
NEXTAUTH_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
NEXTAUTH_URL="https://${DOMAIN_NAME}"

# Application
NEXT_PUBLIC_APP_URL="https://${DOMAIN_NAME}"
NODE_ENV="production"

# Microsoft Graph (à configurer manuellement)
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_TENANT_ID=""

# Claude AI (à configurer manuellement)
ANTHROPIC_API_KEY=""

# Email
ADMIN_EMAIL=""
EOF

# Configuration Nginx
cp $APP_DIR/nginx.conf /etc/nginx/sites-available/talentero
sed -i "s/votredomaine.com/${DOMAIN_NAME}/g" /etc/nginx/sites-available/talentero
ln -sf /etc/nginx/sites-available/talentero /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx
nginx -t

# Certificat SSL
echo -e "${YELLOW}Configuration du certificat SSL...${NC}"
certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos -m $SSL_EMAIL

# Installation des dépendances
cd $APP_DIR
npm ci

# Génération Prisma et migration
npx prisma generate
npx prisma migrate deploy

# Build
npm run build

# Démarrage avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Redémarrage Nginx
systemctl restart nginx

echo -e "${GREEN}"
echo "=============================================="
echo "   ✅ INSTALLATION TERMINÉE !"
echo "=============================================="
echo -e "${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Éditez $APP_DIR/.env pour configurer:"
echo "   - MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID"
echo "   - ANTHROPIC_API_KEY"
echo "   - ADMIN_EMAIL"
echo ""
echo "2. Redémarrez l'application:"
echo "   pm2 reload talentero"
echo ""
echo "3. Votre site est accessible sur: https://${DOMAIN_NAME}"
echo ""
echo "Commandes utiles:"
echo "  pm2 logs talentero    - Voir les logs"
echo "  pm2 status            - Voir le statut"
echo "  ./deploy.sh           - Déployer une mise à jour"
