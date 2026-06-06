import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';

const router = Router();

router.post('/', (_req: Request, res: Response) => {
  try {
    const output = execSync('npx prisma db push --accept-data-loss 2>&1 && npx tsx prisma/seed.ts 2>&1', {
      cwd: process.cwd(),
      timeout: 120000,
      encoding: 'utf8',
    });
    res.json({ ok: true, output });
  } catch (e: any) {
    res.status(500).json({
      ok: false,
      error: e.message,
      stderr: e.stderr?.toString() || '',
      stdout: e.stdout?.toString() || '',
    });
  }
});

export { router as seedRouter };
