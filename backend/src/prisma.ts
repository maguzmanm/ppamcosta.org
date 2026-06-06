import { PrismaClient } from '@prisma/client';

// En Render, la variable DATABASE_URL a veces no tiene el prefijo file:
// Forzarlo para que Prisma funcione correctamente
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:' + process.env.DATABASE_URL;
  console.log('🔧 DATABASE_URL corregido:', process.env.DATABASE_URL);
}

const prisma = new PrismaClient();

export default prisma;
