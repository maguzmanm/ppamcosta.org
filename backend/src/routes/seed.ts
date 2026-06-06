import { Router, Request, Response } from 'express';
import { resolve } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');

const router = Router();

router.post('/', (_req: Request, res: Response) => {
  try {
    const cwd = resolve(process.cwd());
    console.log('📦 Ejecutando prisma db push...');
    const pushOut = execSync('npx prisma db push --accept-data-loss 2>&1', { cwd, timeout: 60000, encoding: 'utf8' });
    console.log(pushOut);
    console.log('📦 Ejecutando seed...');
    const seedOut = execSync('npx tsx prisma/seed.ts 2>&1', { cwd, timeout: 60000, encoding: 'utf8' });
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
