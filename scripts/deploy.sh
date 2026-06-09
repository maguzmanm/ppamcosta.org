#!/bin/bash
# =============================================
# PPAM Costa - Deploy completo en VPS
# Domains: ppamcosta.org, mguzman.pro, guzmanm.net
# Ejecutar como root en AlmaLinux 9 limpio
# =============================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

APP_DIR="/opt/ppamcosta.org"
BACKEND_DIR="$APP_DIR/backend"
WEB_DIR="$APP_DIR/web"
GIT_REPO="https://github.com/maguzmanm/ppamcosta.org.git"

DB_NAME="ppamcosta_db"
DB_USER="ppam_user"
DB_PASS="PpamCosta2026"
DB_ROOT_PASS="SiCr#1861!Db"

NODE_VERSION="22"

DOMAINS="ppamcosta.org,www.ppamcosta.org,guzmanm.net,www.guzmanm.net,mguzman.pro,www.mguzman.pro"
CERT_EMAIL="maguzmanm@gmail.com"

echo "========================================="
echo " PPAM Costa - Full Deploy"
echo " $(date)"
echo " Dominios: $DOMAINS"
echo "========================================="

# ─────────────────────────────────────
# 1. Actualizar sistema
# ─────────────────────────────────────
info "Paso 1/13: Actualizando sistema..."
dnf update -y
log "Sistema actualizado"

# ─────────────────────────────────────
# 2. Instalar Node.js via NVM
# ─────────────────────────────────────
info "Paso 2/13: Instalando Node.js $NODE_VERSION (NVM)..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
  nvm alias default "$NODE_VERSION"
fi
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
log "Node.js $(node -v) | npm $(npm -v)"

# ─────────────────────────────────────
# 3. Instalar MySQL 8
# ─────────────────────────────────────
info "Paso 3/13: Instalando MySQL 8..."
if ! systemctl is-active --quiet mysqld; then
  dnf install -y mysql-server
  systemctl enable --now mysqld
fi

# Si no podemos entrar, reseteamos root password
if ! mysql -u root -e "SELECT 1" &>/dev/null; then
  info "Reseteando password de root MySQL..."
  systemctl stop mysqld
  mysqld_safe --skip-grant-tables &
  sleep 3
  mysql -u root <<SQL
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '$DB_ROOT_PASS';
FLUSH PRIVILEGES;
SQL
  killall mysqld 2>/dev/null
  systemctl start mysqld
fi
log "MySQL 8 activo"

# ─────────────────────────────────────
# 4. Crear base de datos y usuario
# ─────────────────────────────────────
info "Paso 4/13: Creando base de datos..."
mysql -u root -p"$DB_ROOT_PASS" <<SQL 2>/dev/null || mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
log "Base de datos '$DB_NAME' lista"

# ─────────────────────────────────────
# 5. Instalar Nginx
# ─────────────────────────────────────
info "Paso 5/13: Instalando Nginx..."
dnf install -y nginx
systemctl enable --now nginx
log "Nginx activo"

# ─────────────────────────────────────
# 6. Configurar firewall
# ─────────────────────────────────────
info "Paso 6/13: Configurando firewall..."
firewall-cmd --add-service=http --permanent 2>/dev/null || true
firewall-cmd --add-service=https --permanent 2>/dev/null || true
firewall-cmd --add-port=22022/tcp --permanent 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true
log "Firewall configurado"

# ─────────────────────────────────────
# 7. Instalar PM2
# ─────────────────────────────────────
info "Paso 7/13: Instalando PM2..."
npm install -g pm2
log "PM2 $(pm2 -v)"

# ─────────────────────────────────────
# 8. Clonar repositorio
# ─────────────────────────────────────
info "Paso 8/13: Clonando repositorio..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git pull origin main
  log "Repositorio actualizado"
else
  git clone "$GIT_REPO" "$APP_DIR"
  log "Repositorio clonado"
fi

# ─────────────────────────────────────
# 9. Backend: .env + dependencias + build
# ─────────────────────────────────────
info "Paso 9/13: Configurando backend..."

cd "$BACKEND_DIR"

cat > .env << ENVEOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
JWT_SECRET="Pp4mC0st4_S3cur3_JWT_2026!"
JWT_EXPIRES_IN="7d"
VAPID_PUBLIC_KEY="BPK8EhomUlXsVYAtZqIMgkrSlbPLoYIKunNw_rvbypDrsARO0b3O1fLHaq7juTmrLH5Rcqq3Aoh_BrWHdDlMmuQ"
VAPID_PRIVATE_KEY="m1eidLn046IkMtknjAatpmnq15ztrh9c3LRhqe5SwTI"
NODE_ENV="production"
PORT=3000
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="ppamcosta@gmail.com"
SMTP_PASS=""
ENVEOF

npm install
npx prisma db push --accept-data-loss

# Seed (requiere tsx, ya en devDependencies)
npx tsx prisma/seed.ts 2>/dev/null || log "Seed omitido (sin cambios)"

npm run build
log "Backend compilado"

# Frontend .env.production
log "Creando .env.production para frontend..."
echo "VITE_API_URL=/api" > "$WEB_DIR/.env.production"

# ─────────────────────────────────────
# 10. Frontend: dependencias + build
# ─────────────────────────────────────
info "Paso 10/13: Construyendo frontend..."
cd "$WEB_DIR"
npm install
npm run build
log "Frontend compilado → $WEB_DIR/dist"

# ─────────────────────────────────────
# 11. Configurar Nginx
# ─────────────────────────────────────
info "Paso 11/13: Configurando Nginx..."

cat > /etc/nginx/conf.d/ppamcosta.conf << 'NGINX'
server {
    listen 80;
    server_name ppamcosta.org www.ppamcosta.org guzmanm.net www.guzmanm.net mguzman.pro www.mguzman.pro;

    root /opt/ppamcosta.org/web/dist;
    index index.html;

    # PWA + SPA: servir index.html para todas las rutas
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API: proxy reverso al backend Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting heredado del backend
        proxy_read_timeout 60s;
    }

    # Cache de assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # PWA manifest + service worker
    location = /manifest.webmanifest {
        add_header Content-Type "application/manifest+json";
    }
    location = /sw.js {
        add_header Service-Worker-Allowed "/";
        add_header Cache-Control "no-cache";
    }
}
NGINX

nginx -t && systemctl reload nginx
log "Nginx configurado y recargado"

# ─────────────────────────────────────
# 12. Iniciar backend con PM2
# ─────────────────────────────────────
info "Paso 12/13: Iniciando backend con PM2..."
cd "$BACKEND_DIR"
pm2 delete ppamcosta-backend 2>/dev/null || true
pm2 start dist/index.js --name ppamcosta-backend
pm2 save

# Configurar auto-arranque
export PATH="/root/.nvm/versions/node/v$(node -v | cut -d'v' -f2)/bin:$PATH"
pm2 startup systemd -u root --hp /root 2>/dev/null || true
systemctl enable pm2-root 2>/dev/null || true
log "PM2 configurado con auto-arranque"

# ─────────────────────────────────────
# 13. SSL con Certbot
# ─────────────────────────────────────
info "Paso 13/13: Configurando SSL..."
dnf install -y certbot python3-certbot-nginx

certbot --nginx \
  -d ppamcosta.org -d www.ppamcosta.org \
  -d guzmanm.net -d www.guzmanm.net \
  -d mguzman.pro -d www.mguzman.pro \
  --non-interactive --agree-tos \
  -m "$CERT_EMAIL" \
  --redirect 2>/dev/null && log "SSL configurado" || log "SSL pendiente (DNS no apunta aún)"

# ─────────────────────────────────────
# Resumen final
# ─────────────────────────────────────
echo ""
echo "========================================="
echo " ${GREEN}DEPLOY COMPLETO${NC}"
echo "========================================="
echo " Backend:  http://127.0.0.1:3000"
echo " Frontend: http://$(hostname -I | awk '{print $1}')"
echo " PM2:      $(pm2 list | grep online | wc -l) procesos online"
echo " DB:       $DB_NAME @ localhost"
echo ""
echo " Dominios: $DOMAINS"
echo " SSL:      Verificar con: certbot certificates"
echo ""
echo " Usuarios de prueba (password: 123456):"
echo "   juan@ppam.org (Coordinador)"
echo "   maria@ppam.org (Auxiliar)"
echo "========================================="
