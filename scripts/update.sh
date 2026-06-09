#!/bin/bash
# =============================================
# PPAM Costa - Actualización rápida
# Solo rebuild + restart, sin reinstalar servicios
# =============================================
set -e

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[✓]${NC} $1"; }

APP_DIR="/opt/ppamcosta.org"

echo "=== PPAM Costa - Update ==="

cd "$APP_DIR"

# Pull latest code
log "Actualizando código..."
git pull origin main

# Backend
log "Compilando backend..."
cd "$APP_DIR/backend"
npm install --production
npx prisma db push --accept-data-loss
npm run build

# Frontend
log "Compilando frontend..."
cd "$APP_DIR/web"
npm install
npm run build

# Restart
log "Reiniciando PM2..."
pm2 restart ppamcosta-backend
pm2 save

log "¡Actualización completa!"
pm2 status
