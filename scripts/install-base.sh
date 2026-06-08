#!/bin/bash
# =============================================
# PPAM Costa - Instalación completa en VPS
# AlmaLinux 9 / RHEL 9
# =============================================
set -e

echo "========================================="
echo " PPAM Costa - Instalación VPS"
echo " AlmaLinux 9"
echo "========================================="

# ─── 1. Actualizar sistema ───
echo ""
echo "📦 Paso 1/7: Actualizando sistema..."
dnf update -y

# ─── 2. Instalar Node.js 22 ───
echo ""
echo "📦 Paso 2/7: Instalando Node.js 22..."
dnf install -y dnf-plugins-core
dnf module enable nodejs:22 -y
dnf install -y nodejs
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

# ─── 3. Instalar Nginx ───
echo ""
echo "📦 Paso 3/7: Instalando Nginx..."
dnf install -y nginx
systemctl enable nginx
systemctl start nginx
echo "Nginx: $(nginx -v 2>&1)"

# ─── 4. Instalar MySQL 8 ───
echo ""
echo "📦 Paso 4/7: Instalando MySQL 8..."
dnf install -y mysql-server
systemctl enable mysqld
systemctl start mysqld

# Obtener contraseña temporal
TEMP_PASS=$(grep 'temporary password' /var/log/mysqld.log 2>/dev/null | tail -1 | awk '{print $NF}')
if [ -z "$TEMP_PASS" ]; then
  echo "⚠️  No se encontró contraseña temporal. MySQL puede tener acceso sin contraseña."
else
  echo "🔑 Contraseña temporal MySQL: $TEMP_PASS"
fi

# ─── 5. Configurar firewall ───
echo ""
echo "📦 Paso 5/7: Configurando firewall..."
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload
echo "Firewall: HTTP, HTTPS, SSH abiertos"

# ─── 6. Crear estructura de directorios ───
echo ""
echo "📦 Paso 6/7: Creando estructura..."
mkdir -p /opt/ppamcosta
mkdir -p /var/www/guzmanm.net
useradd -r -s /sbin/nologin ppam 2>/dev/null || true

# ─── 7. Configurar MySQL ───
echo ""
echo "📦 Paso 7/7: Configurando base de datos..."
cat > /tmp/ppam_db_setup.sql << 'EOSQL'
CREATE DATABASE IF NOT EXISTS ppamcosta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ppam_user'@'localhost' IDENTIFIED BY 'PpamCosta#2026!';
GRANT ALL PRIVILEGES ON ppamcosta_db.* TO 'ppam_user'@'localhost';
FLUSH PRIVILEGES;
EOSQL

mysql < /tmp/ppam_db_setup.sql 2>/dev/null && echo "✅ Base de datos creada" || echo "⚠️  Ejecuta manualmente el script SQL con la contraseña temporal"

echo ""
echo "========================================="
echo " ✅ INSTALACIÓN BASE COMPLETA"
echo "========================================="
echo ""
echo "Siguientes pasos:"
echo "1. mysql_secure_installation"
echo "2. Configurar nginx para guzmanm.net"
echo "3. Clonar repositorio y desplegar backend"
echo "4. Construir y servir frontend"
echo "5. Configurar SSL con Let's Encrypt"
echo ""
