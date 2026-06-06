import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { ValidationError } from '../utils/errors';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const slots = await prisma.timeSlot.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(slots);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, startTime, endTime, sortOrder } = req.body;
    if (!name || !startTime || !endTime) {
      throw new ValidationError('Nombre, hora inicio y hora fin son requeridos');
    }
    const slot = await prisma.timeSlot.create({
      data: { name, startTime, endTime, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(slot);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, startTime, endTime, sortOrder } = req.body;
    const slot = await prisma.timeSlot.update({
      where: { id: req.params.id },
      data: { name, startTime, endTime, sortOrder },
    });
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.timeSlot.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
