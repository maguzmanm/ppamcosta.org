import { PrismaClient } from '@prisma/client';

// En Render, la variable DATABASE_URL a veces no tiene el prefijo file:
// Forzarlo para que Prisma funcione correctamente
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:' + process.env.DATABASE_URL;
}

const prisma = new PrismaClient();

// En producción, ejecutar seed automáticamente si la BD está vacía
async function ensureDatabase() {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    // Intentar contar usuarios - si falla, la BD necesita seed
    await prisma.user.count();
    console.log('💾 Base de datos existente');
  } catch {
    console.log('🌱 Base de datos nueva, ejecutando seed...');
    try {
      const { execSync } = require('child_process');
      const cwd = process.cwd();
      execSync('npx prisma db push --accept-data-loss', {
        cwd, timeout: 60000, stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      execSync('npx tsx prisma/seed.ts', {
        cwd, timeout: 60000, stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      console.log('✅ Seed completado');
    } catch (e: any) {
      console.error('⚠️ Error en seed:', e.message);
    }
  }
}

ensureDatabase();

export default prisma;
