import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

// ─── Historial de notificaciones ───

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, readAt: null },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

// ─── Preferencias ───

export async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: req.user!.userId },
    });
    res.json(prefs || { pushEnabled: true, emailEnabled: true });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const { pushEnabled, emailEnabled } = req.body;
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, pushEnabled, emailEnabled },
      update: { pushEnabled, emailEnabled },
    });
    res.json(prefs);
  } catch (err) {
    next(err);
  }
}

// ─── Device token (push) ───

export async function registerDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, platform } = req.body;
    if (!token || !platform) {
      return res.status(400).json({ error: 'Token y plataforma requeridos' });
    }

    const device = await prisma.deviceToken.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, token, platform },
      update: { token, platform },
    });
    res.json(device);
  } catch (err) {
    next(err);
  }
}

export async function unregisterDevice(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.deviceToken.deleteMany({
      where: { userId: req.user!.userId },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
