// Script para ejecutar en Render Shell: node seed-render.js
const { execSync } = require('child_process');
console.log('📦 Ejecutando prisma db push...');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
console.log('📦 Ejecutando seed...');
execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
console.log('✅ Seed completado!');
