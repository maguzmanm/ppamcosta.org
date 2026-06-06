import { Router, Request, Response } from 'express';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');

const router = Router();

router.post('/', (_req: Request, res: Response) => {
  try {
    const cwd = resolve(process.cwd());
    
    // Asegurar que el directorio prisma existe y el archivo dev.db
    const prismaDir = resolve(cwd, 'prisma');
    if (!existsSync(prismaDir)) mkdirSync(prismaDir, { recursive: true });
    
    // Crear BD vacía si no existe
    const dbPath = resolve(prismaDir, 'dev.db');
    if (!existsSync(dbPath)) {
      console.log('📦 Creando base de datos...');
      execSync(`node -e "require('fs').writeFileSync('${dbPath.replace(/\\/g,'\\\\')}','')"`, { cwd, timeout: 10000 });
    }
    
    // Forzar DATABASE_URL en el entorno
    process.env.DATABASE_URL = 'file:' + dbPath;
    
    console.log('📦 Ejecutando prisma db push...');
    const pushOut = execSync('npx prisma db push --accept-data-loss', {
      cwd,
      timeout: 60000,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'file:' + dbPath },
    });
    console.log(pushOut);
    
    console.log('📦 Ejecutando seed...');
    const seedOut = execSync('npx tsx prisma/seed.ts', {
      cwd,
      timeout: 60000,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'file:' + dbPath },
    });
    console.log(seedOut);
    
    res.json({ ok: true, output: pushOut + '\n' + seedOut });
  } catch (e: any) {
    console.error('Seed error:', e.message);
    res.status(500).json({
      ok: false,
      error: e.message,
      stderr: e.stderr?.toString() || '',
      stdout: e.stdout?.toString() || '',
    });
  }
});

export { router as seedRouter };
