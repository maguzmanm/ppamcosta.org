import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';

// Listar incidentes — coordinador/auxiliar ven todos, publicador solo los suyos
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.userId;
    const publisherId = req.user!.publisherId;

    const where: Record<string, unknown> = {};

    // Publicador solo ve sus incidentes
    if (userRole === 'PUBLICADOR' || userRole === 'ENCARGADO_PUNTO' || userRole === 'AUXILIAR_PUNTO' || userRole === 'ENCARGADO_EXPERIENCIAS') {
      where.reportedById = userId;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        reportedBy: {
          select: { publisher: { select: { firstName: true, lastName: true } } },
        },
        respondedBy: {
          select: { publisher: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(incidents);
  } catch (err) {
    next(err);
  }
}

// Crear incidente — cualquier usuario
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      throw new ValidationError('Título y descripción son requeridos');
    }

    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        reportedById: req.user!.userId,
        status: 'ABIERTO',
      },
    });
    res.status(201).json(incident);
  } catch (err) {
    next(err);
  }
}

// Responder incidente — solo coordinador
export async function respond(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { response, status } = req.body; // status: RESPONDIDO | CERRADO

    if (!response) throw new ValidationError('La respuesta es requerida');

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incidente no encontrado');

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        response,
        status: status || 'RESPONDIDO',
        respondedById: req.user!.userId,
      },
      include: {
        reportedBy: { select: { publisher: { select: { firstName: true, lastName: true } } } },
        respondedBy: { select: { publisher: { select: { firstName: true, lastName: true } } } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
