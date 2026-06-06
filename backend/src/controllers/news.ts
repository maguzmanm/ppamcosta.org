import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError } from '../utils/errors';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const news = await prisma.news.findMany({
      include: {
        author: {
          select: { publisher: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(news);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.news.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: { publisher: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!item) throw new NotFoundError('Noticia no encontrada');
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body;
    if (!title || !content) throw new ValidationError('Título y contenido son requeridos');

    const item = await prisma.news.create({
      data: { title, content, authorId: req.user!.userId },
      include: {
        author: {
          select: { publisher: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body;
    const item = await prisma.news.update({
      where: { id: req.params.id },
      data: { title, content },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.news.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
