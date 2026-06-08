#!/bin/bash
# =============================================
# PPAM Costa - Despliegue de la aplicación
# Ejecutar DESPUÉS de install-base.sh
# =============================================
set -e

APP_DIR="/opt/ppamcosta"
WEB_DIR="/var/www/guzmanm.net"
DOMAIN="guzmanm.net"

echo "========================================="
echo " PPAM Costa - Despliegue de aplicación"
echo "========================================="

# ─── 1. Clonar repositorio ───
echo ""
echo "📦 Paso 1/6: Clonando repositorio..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone https://github.com/maguzmanm/ppamcosta.org.git "$APP_DIR"
fi

# ─── 2. Instalar dependencias y build backend ───
echo ""
echo "📦 Paso 2/6: Instalando backend..."
cd "$APP_DIR/backend"

# Crear .env para producción
cat > .env << 'EODOTENV'
DATABASE_URL="mysql://ppam_user:PpamCosta#2026!@localhost:3306/ppamcosta_db"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_EXPIRES_IN="7d"
VAPID_PUBLIC_KEY="BPK8EhomUlXsVYAtZqIMgkrSlbPLoYIKunNw_rvbypDrsARO0b3O1fLHaq7juTmrLH5Rcqq3Aoh_BrWHdDlMmuQ"
VAPID_PRIVATE_KEY="m1eidLn046IkMtknjAatpmnq15ztrh9c3LRhqe5SwTI"
NODE_ENV="production"
PORT="3000"
EODOTENV

npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

# ─── 3. Restaurar datos del backup ───
echo ""
echo "📦 Paso 3/6: Restaurando datos..."
if [ -f "$APP_DIR/backup/data_2026-06-08T21-19-54.json" ]; then
  echo "⚡ Ejecutando seed con datos de backup..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const fs = require('fs');
    const prisma = new PrismaClient();
    const data = JSON.parse(fs.readFileSync('$APP_DIR/backup/data_2026-06-08T21-19-54.json', 'utf8'));
    
    async function restore() {
      for (const [model, records] of Object.entries(data)) {
        if (records.length === 0) continue;
        try {
          await prisma[model].createMany({ data: records, skipDuplicates: true });
          console.log(model + ': ' + records.length + ' restaurados');
        } catch(e) { console.log(model + ': ' + e.message); }
      }
      await prisma.\$disconnect();
    }
    restore();
  "
else
  echo "⚠️  No se encontró backup. Ejecutando seed demo..."
  npx tsx prisma/seed.ts
fi

# ─── 4. Systemd service para backend ───
echo ""
echo "📦 Paso 4/6: Creando servicio systemd..."
cat > /etc/systemd/system/ppam-api.service << 'EOSERVICE'
[Unit]
Description=PPAM Costa API
After=network.target mysqld.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ppamcosta/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOSERVICE

systemctl daemon-reload
systemctl enable ppam-api
systemctl start ppam-api
echo "Backend: systemctl status ppam-api"

# ─── 5. Construir frontend ───
echo ""
echo "📦 Paso 5/6: Construyendo frontend..."
cd "$APP_DIR/web"
cat > .env.production << EODOTENV
VITE_API_URL=https://${DOMAIN}/api
EODOTENV

npm install
npm run build

# Copiar archivos estáticos
rm -rf "$WEB_DIR"/*
cp -r dist/* "$WEB_DIR/"
chown -R nginx:nginx "$WEB_DIR"

# ─── 6. Configurar Nginx ───
echo ""
echo "📦 Paso 6/6: Configurando Nginx..."
cat > /etc/nginx/conf.d/guzmanm.net.conf << 'EONGINX'
server {
    listen 80;
    server_name guzmanm.net www.guzmanm.net;

    root /var/www/guzmanm.net;
    index index.html;

    # Frontend estático
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API - proxy reverso al backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
}
EONGINX

systemctl restart nginx

echo ""
echo "========================================="
echo " ✅ DESPLIEGUE COMPLETO"
echo "========================================="
echo ""
echo "🌐 Sitio: http://${DOMAIN}"
echo "🔌 API:   http://${DOMAIN}/api/health"
echo "📋 Backend: systemctl status ppam-api"
echo "📋 Nginx:   systemctl status nginx"
echo ""
echo "Siguiente paso: SSL con Let's Encrypt"
echo "  dnf install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d guzmanm.net -d www.guzmanm.net"
echo ""
