import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { notifyNuevoAnuncio } from '../services/notifications';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } },
        ],
      },
      include: {
        author: {
          select: { publisher: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(announcements);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, expiresAt } = req.body;
    if (!title || !content) throw new ValidationError('Título y contenido son requeridos');

    const item = await prisma.announcement.create({
      data: {
        title,
        content,
        authorId: req.user!.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Notificar a todos los usuarios (push)
    const users = await prisma.user.findMany({
      where: { notificationPref: { pushEnabled: true } },
      select: { id: true },
    });

    await notifyNuevoAnuncio(
      users.map((u) => u.id),
      title,
      content.substring(0, 120) + (content.length > 120 ? '...' : '')
    );

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, expiresAt } = req.body;
    const item = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
