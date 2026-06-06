import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError } from '../utils/errors';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { circuitId } = req.query;
    const where = circuitId ? { circuitId: String(circuitId) } : {};

    const congregations = await prisma.congregation.findMany({
      where,
      include: { circuit: true, _count: { select: { publishers: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(congregations);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const congregation = await prisma.congregation.findUnique({
      where: { id: req.params.id },
      include: { circuit: true, _count: { select: { publishers: true } } },
    });
    if (!congregation) throw new NotFoundError('Congregación no encontrada');
    res.json(congregation);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, circuitId } = req.body;
    if (!name || !circuitId) throw new ValidationError('Nombre y circuito son requeridos');

    // Verificar que el circuito existe
    const circuit = await prisma.circuit.findUnique({ where: { id: circuitId } });
    if (!circuit) throw new NotFoundError('Circuito no encontrado');

    const congregation = await prisma.congregation.create({
      data: { name, circuitId },
      include: { circuit: true },
    });
    res.status(201).json(congregation);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, circuitId } = req.body;
    const congregation = await prisma.congregation.update({
      where: { id: req.params.id },
      data: { name, circuitId },
      include: { circuit: true },
    });
    res.json(congregation);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.congregation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
