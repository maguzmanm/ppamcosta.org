import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { ValidationError } from '../utils/errors';

export async function registerDeviceToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, platform } = req.body;
    if (!token) throw new ValidationError('Token es requerido');

    await prisma.deviceToken.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, token, platform: platform || 'unknown' },
      update: { token, platform: platform || 'unknown' },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function unregisterDeviceToken(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.deviceToken.deleteMany({ where: { userId: req.user!.userId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
