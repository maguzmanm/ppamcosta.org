import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.TURSO_AUTH_TOKEN) {
  const { PrismaLibSql } = require('@prisma/adapter-libsql');
  const { createClient } = require('@libsql/client');
  const libsql = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  prisma = new PrismaClient({ adapter: new PrismaLibSql(libsql) });
} else {
  prisma = new PrismaClient();
}

export default prisma;
