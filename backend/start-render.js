// Script de inicio para Render: ejecuta migraciones y seed si es necesario
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');

async function start() {
  // Si la BD no existe o está vacía, ejecutar seed
  const dbExists = fs.existsSync(dbPath);
  
  if (!dbExists) {
    console.log('📦 Base de datos no encontrada. Ejecutando seed...');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: __dirname });
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', cwd: __dirname });
      console.log('✅ Seed completado');
    } catch (e) {
      console.error('❌ Error en seed:', e.message);
    }
  }

  // Iniciar servidor
  require('./dist/index.js');
}

start();
