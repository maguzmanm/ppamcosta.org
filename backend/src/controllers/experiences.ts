import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { notifyExperienciaPendiente } from '../services/notifications';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const userRole = req.user!.role;

    const where: Record<string, unknown> = {};

    // Filtrar por estado si se solicita
    if (status) where.status = String(status);

    // Si no es coordinador, auxiliar ni encargado de experiencias, solo ver aprobadas
    if (!['COORDINADOR', 'AUXILIAR', 'ENCARGADO_EXPERIENCIAS'].includes(userRole)) {
      where.status = 'APROBADO';
    }

    const experiences = await prisma.experience.findMany({
      where,
      include: {
        publisher: { select: { id: true, firstName: true, lastName: true, congregation: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(experiences);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const experience = await prisma.experience.findUnique({
      where: { id: req.params.id },
      include: {
        publisher: { select: { id: true, firstName: true, lastName: true, congregation: { select: { name: true } } } },
      },
    });
    if (!experience) throw new NotFoundError('Experiencia no encontrada');

    // Verificar permisos de lectura
    const userRole = req.user!.role;
    const publisherId = req.user!.publisherId;
    if (experience.status !== 'APROBADO' && !['COORDINADOR', 'AUXILIAR', 'ENCARGADO_EXPERIENCIAS'].includes(userRole) && experience.publisherId !== publisherId) {
      throw new ForbiddenError('No tienes acceso a esta experiencia');
    }

    res.json(experience);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body;
    if (!title || !content) throw new ValidationError('Título y contenido son requeridos');

    const publisherId = req.user!.publisherId;

    const experience = await prisma.experience.create({
      data: { title, content, publisherId, status: 'PENDIENTE' },
    });

    // Notificar a los encargados de experiencias
    const encargados = await prisma.user.findMany({
      where: { role: { in: ['ENCARGADO_EXPERIENCIAS', 'COORDINADOR'] } },
    });

    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
    });

    for (const encargado of encargados) {
      if (publisher) {
        await notifyExperienciaPendiente(
          encargado.id,
          '', // Se llena en el template con el nombre del encargado
          `${publisher.firstName} ${publisher.lastName}`,
          title
        );
      }
    }

    res.status(201).json(experience);
  } catch (err) {
    next(err);
  }
}

// ─── Revisar experiencia (encargado de experiencias / coordinador) ───

export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, content, reviewNotes } = req.body; // status: APROBADO | RECHAZADO

    if (!['APROBADO', 'RECHAZADO'].includes(status)) {
      throw new ValidationError('El estado debe ser APROBADO o RECHAZADO');
    }

    const experience = await prisma.experience.findUnique({ where: { id } });
    if (!experience) throw new NotFoundError('Experiencia no encontrada');

    const updated = await prisma.experience.update({
      where: { id },
      data: {
        status,
        ...(content && { content }),
        reviewNotes,
        reviewedBy: req.user!.userId,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
