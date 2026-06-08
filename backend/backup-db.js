// Script de respaldo de base de datos MySQL usando Prisma
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, '..', 'backup');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const date = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

async function main() {
  // 1. Guardar schema.prisma
  console.log('📋 Guardando schema...');
  fs.copyFileSync(
    path.join(__dirname, 'prisma', 'schema.prisma'),
    path.join(backupDir, `schema_${date}.prisma`)
  );

  // 2. Exportar datos
  console.log('📦 Exportando datos...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const models = [
    'circuit', 'congregation', 'publisher', 'user', 'timeSlot', 'location',
    'locationAssignment', 'shift', 'shiftAssignment', 'experience', 'announcement',
    'notification', 'notificationPreference', 'deviceToken', 'pushSubscription',
    'incident', 'availability'
  ];

  const data = {};
  for (const model of models) {
    try {
      const records = await prisma[model].findMany();
      data[model] = records;
      console.log(`  ${model}: ${records.length} registros`);
    } catch (e) {
      console.log(`  ${model}: ❌ ${e.message}`);
    }
  }

  const jsonFile = path.join(backupDir, `data_${date}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
  
  // Resumen
  const totalRecords = Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  console.log(`\n✅ Respaldo completo: ${totalRecords} registros en ${Object.keys(data).length} tablas`);
  console.log(`   Schema: schema_${date}.prisma`);
  console.log(`   Datos:  data_${date}.json`);
  console.log(`   Carpeta: ${backupDir}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
