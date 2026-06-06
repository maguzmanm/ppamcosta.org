import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError } from '../utils/errors';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const circuits = await prisma.circuit.findMany({
      include: { _count: { select: { congregations: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(circuits);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const circuit = await prisma.circuit.findUnique({
      where: { id: req.params.id },
      include: {
        congregations: {
          include: { _count: { select: { publishers: true } } },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!circuit) throw new NotFoundError('Circuito no encontrado');
    res.json(circuit);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;
    if (!name) throw new ValidationError('El nombre es requerido');

    const existing = await prisma.circuit.findUnique({ where: { name } });
    if (existing) throw new ValidationError('Ya existe un circuito con ese nombre');

    const circuit = await prisma.circuit.create({ data: { name } });
    res.status(201).json(circuit);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;
    const circuit = await prisma.circuit.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json(circuit);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.circuit.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
