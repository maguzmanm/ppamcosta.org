import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Solo accesible por COORDINADOR, deshabilitado en producción
router.post('/', authenticate, requireRole(['COORDINADOR']), (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seed no disponible en producción' });
  }
  
  try {
    const { execSync } = require('child_process');
    const { resolve } = require('path');
    const { existsSync, mkdirSync } = require('fs');
    
    const cwd = resolve(process.cwd());
    
    const prismaDir = resolve(cwd, 'prisma');
    if (!existsSync(prismaDir)) mkdirSync(prismaDir, { recursive: true });
    
    const dbPath = resolve(prismaDir, 'dev.db');
    if (!existsSync(dbPath)) {
      execSync(`node -e "require('fs').writeFileSync('${dbPath.replace(/\\/g,'\\\\')}','')"`, { cwd, timeout: 10000 });
    }
    
    process.env.DATABASE_URL = 'file:' + dbPath;
    
    const pushOut = execSync('npx prisma db push --accept-data-loss', {
      cwd, timeout: 60000, encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'file:' + dbPath },
    });
    
    const seedOut = execSync('npx tsx prisma/seed.ts', {
      cwd, timeout: 60000, encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'file:' + dbPath },
    });
    
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Seed error:', e.message);
    res.status(500).json({ ok: false, error: 'Error ejecutando seed' });
  }
});

export { router as seedRouter };
