#!/bin/bash

# =============================================================================
# Cron Job - Gestion des comptes inactifs
# Ajouter au crontab: crontab -e
# 0 2 * * * /var/www/talentero/cron-inactive-accounts.sh
# =============================================================================

APP_DIR="/var/www/talentero"
LOG_FILE="/var/log/talentero/cron-inactive.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Début du traitement des comptes inactifs" >> $LOG_FILE

# Appel de l'API pour traiter les comptes inactifs
response=$(curl -s -X POST "http://localhost:3000/api/admin/accounts/inactive" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: ${CRON_SECRET}")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Réponse: $response" >> $LOG_FILE

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Traitement terminé" >> $LOG_FILE
