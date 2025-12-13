# 🚀 Guide de Déploiement - TALENTERO sur VPS OVH

## Prérequis

- VPS OVH avec Ubuntu 22.04 ou 24.04
- Accès SSH root
- Nom de domaine configuré (talentero.io ou autre)

---

## 1. Connexion et Mise à Jour

```bash
# Connexion SSH
ssh root@votre-ip-vps

# Mise à jour du système
apt update && apt upgrade -y

# Installation des outils de base
apt install -y curl wget git htop ufw fail2ban
```

---

## 2. Sécurisation du VPS

### Firewall (UFW)

```bash
# Configuration du firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

### Fail2ban (Protection contre les attaques brute force)

```bash
# Configuration de base (fonctionne par défaut)
systemctl enable fail2ban
systemctl start fail2ban
```

### Création d'un utilisateur non-root

```bash
# Créer utilisateur
adduser talentero
usermod -aG sudo talentero

# Copier les clés SSH
rsync --archive --chown=talentero:talentero ~/.ssh /home/talentero

# Déconnexion et reconnexion avec le nouvel utilisateur
exit
ssh talentero@votre-ip-vps
```

---

## 3. Installation de PostgreSQL

```bash
# Installation
sudo apt install -y postgresql postgresql-contrib

# Démarrage
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Création de la base de données et de l'utilisateur
sudo -u postgres psql

# Dans le shell PostgreSQL:
CREATE USER talentero WITH PASSWORD 'VotreMotDePasseSecurise';
CREATE DATABASE talentero OWNER talentero;
GRANT ALL PRIVILEGES ON DATABASE talentero TO talentero;
\q
```

### Configuration de PostgreSQL

```bash
# Autoriser les connexions locales
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Ajouter cette ligne (après les autres entrées local):
local   talentero   talentero   md5

# Redémarrer PostgreSQL
sudo systemctl restart postgresql

# Test de connexion
psql -U talentero -d talentero -W
```

---

## 4. Installation de Node.js (via nvm)

```bash
# Installation de nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Installation de Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Vérification
node -v  # v20.x.x
npm -v   # 10.x.x
```

---

## 5. Installation de PM2

```bash
# Installation globale
npm install -g pm2

# Configuration du démarrage automatique
pm2 startup systemd
# Exécuter la commande affichée
```

---

## 6. Installation de Nginx

```bash
# Installation
sudo apt install -y nginx

# Démarrage
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configuration Nginx pour Talentero

```bash
sudo nano /etc/nginx/sites-available/talentero
```

Contenu du fichier:

```nginx
server {
    listen 80;
    server_name talentero.io www.talentero.io;

    # Redirection vers HTTPS (activé après Certbot)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        alias /var/www/talentero/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Taille max upload (10MB)
    client_max_body_size 10M;
}
```

Activation du site:

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/talentero /etc/nginx/sites-enabled/

# Désactiver le site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl reload nginx
```

---

## 7. Certificat SSL avec Let's Encrypt

```bash
# Installation de Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtention du certificat
sudo certbot --nginx -d talentero.io -d www.talentero.io

# Le certificat se renouvelle automatiquement
# Vérifier le timer:
sudo systemctl status certbot.timer
```

---

## 8. Déploiement de l'Application

### Création des dossiers

```bash
# Créer le dossier de l'application
sudo mkdir -p /var/www/talentero
sudo chown -R talentero:talentero /var/www/talentero

# Créer le dossier des uploads
sudo mkdir -p /var/www/talentero/uploads
sudo chown -R talentero:talentero /var/www/talentero/uploads
```

### Cloner et configurer le projet

```bash
cd /var/www/talentero

# Option 1: Cloner depuis Git
git clone https://github.com/votre-repo/talentero.git .

# Option 2: Upload via SFTP (si pas de Git)
# Utilisez FileZilla ou scp pour uploader les fichiers

# Installer les dépendances
npm install

# Copier et configurer l'environnement
cp .env.example .env
nano .env
```

### Configuration du fichier .env

```bash
# Base de données
DATABASE_URL="postgresql://talentero:VotreMotDePasseSecurise@localhost:5432/talentero"

# JWT
JWT_SECRET="votre-secret-jwt-tres-long-et-securise-minimum-32-caracteres"
NEXTAUTH_URL="https://talentero.io"

# Claude API
ANTHROPIC_API_KEY="sk-ant-api..."

# INSEE API
INSEE_API_KEY="votre-cle-insee"
INSEE_API_SECRET="votre-secret-insee"

# Emails
BREVO_API_KEY="xkeysib-..."
EMAIL_FROM="contact@talentero.io"

# Upload
UPLOAD_DIR="/var/www/talentero/uploads"

# URLs
NEXT_PUBLIC_APP_URL="https://talentero.io"
NEXT_PUBLIC_API_URL="https://talentero.io/api"

# Admin
ADMIN_EMAIL="admin@trinexta.fr"
ADMIN_PASSWORD="VotreMotDePasseAdmin!"

# Production
NODE_ENV="production"
```

### Initialisation de la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# (Optionnel) Seed des données initiales
npx prisma db seed
```

### Build et lancement

```bash
# Build de production
npm run build

# Lancer avec PM2
pm2 start npm --name "talentero" -- start

# Sauvegarder la config PM2
pm2 save

# Vérifier le statut
pm2 status
pm2 logs talentero
```

---

## 9. Commandes Utiles

### PM2

```bash
# Voir les logs
pm2 logs talentero

# Redémarrer l'app
pm2 restart talentero

# Arrêter l'app
pm2 stop talentero

# Monitorer
pm2 monit
```

### Mise à jour de l'application

```bash
cd /var/www/talentero

# Pull les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
npm install

# Appliquer les migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Redémarrer
pm2 restart talentero
```

### Base de données

```bash
# Accéder à PostgreSQL
psql -U talentero -d talentero

# Backup
pg_dump -U talentero talentero > backup_$(date +%Y%m%d).sql

# Restore
psql -U talentero talentero < backup.sql

# Ouvrir Prisma Studio (dev uniquement)
npx prisma studio
```

---

## 10. Monitoring et Maintenance

### Logs

```bash
# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs Application
pm2 logs talentero --lines 100

# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Espace disque

```bash
# Vérifier l'espace
df -h

# Nettoyer les logs anciens
sudo journalctl --vacuum-time=7d

# Nettoyer npm cache
npm cache clean --force
```

### Backup automatique

Créer un script de backup:

```bash
nano /home/talentero/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/talentero/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup base de données
pg_dump -U talentero talentero > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/talentero/uploads

# Supprimer les backups de plus de 7 jours
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup terminé: $DATE"
```

```bash
# Rendre exécutable
chmod +x /home/talentero/backup.sh

# Ajouter au cron (tous les jours à 3h)
crontab -e
# Ajouter:
0 3 * * * /home/talentero/backup.sh >> /home/talentero/backup.log 2>&1
```

---

## 11. Checklist de Déploiement

- [ ] VPS configuré et sécurisé
- [ ] PostgreSQL installé et configuré
- [ ] Node.js 20 installé via nvm
- [ ] PM2 installé et configuré
- [ ] Nginx installé et configuré
- [ ] Certificat SSL installé
- [ ] Application déployée
- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Application en cours d'exécution (pm2 status)
- [ ] Site accessible en HTTPS
- [ ] Backups automatiques configurés

---

## Support

En cas de problème:
1. Vérifier les logs: `pm2 logs talentero`
2. Vérifier Nginx: `sudo nginx -t`
3. Vérifier PostgreSQL: `sudo systemctl status postgresql`
4. Redémarrer si nécessaire: `pm2 restart talentero`

---

**Talentero** - Opéré par TRINEXTA
