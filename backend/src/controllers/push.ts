import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

// Guardar suscripción push del navegador
export async function subscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Faltan campos: endpoint, keys.p256dh, keys.auth' });
    }

    // Upsert por endpoint (evita duplicados)
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'] || null,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({ ok: true, id: sub.id });
  } catch (err) {
    next(err);
  }
}

// Eliminar suscripción
export async function unsubscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Falta endpoint' });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user!.userId },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Listar suscripciones (admin)
export async function listSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            publisher: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subs);
  } catch (err) {
    next(err);
  }
}
