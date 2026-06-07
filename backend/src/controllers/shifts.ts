import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import {
  notifyTurnoAsignado,
  notifyTurnoCancelado,
  notifyTurnoRespuesta,
} from '../services/notifications';

// ─── CRUD Turnos ───

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { locationId, date, status, publisherId } = req.query;
    const where: Record<string, unknown> = {};

    if (locationId) where.locationId = String(locationId);
    if (date) where.date = new Date(String(date));
    if (status) where.status = String(status);
    if (publisherId) {
      where.assignments = { some: { publisherId: String(publisherId) } };
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        location: { select: { id: true, name: true } },
        timeSlot: true,
        createdBy: {
          select: { id: true, publisherId: true },
        },
        assignments: {
          include: {
            publisher: { select: { id: true, firstName: true, lastName: true, congregation: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { timeSlot: { sortOrder: 'asc' } }],
    });
    res.json(shifts);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        timeSlot: true,
        createdBy: {
          select: { id: true, publisherId: true },
        },
        assignments: {
          include: {
            publisher: { select: { id: true, firstName: true, lastName: true, phone: true, congregation: { select: { name: true } } } },
          },
        },
      },
    });
    if (!shift) throw new NotFoundError('Turno no encontrado');
    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { locationId, date, timeSlotId, maxPublishers, publisherIds, notes } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!locationId || !date || !timeSlotId) {
      throw new ValidationError('Punto, fecha y franja horaria son requeridos');
    }

    // Verificar que el punto existe y está activo
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location || !location.isActive) throw new NotFoundError('Punto no encontrado o inactivo');

    // Si no es coordinador, verificar que sea encargado/auxiliar de ese punto
    if (userRole !== 'COORDINADOR') {
      const assignment = await prisma.locationAssignment.findUnique({
        where: { userId_locationId: { userId, locationId } },
      });
      if (!assignment) {
        throw new ForbiddenError('No eres encargado de este punto');
      }
    }

    // Verificar franja horaria
    const timeSlot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } });
    if (!timeSlot) throw new NotFoundError('Franja horaria no encontrada');

    // Crear turno con asignaciones
    const shift = await prisma.$transaction(async (tx) => {
      const newShift = await tx.shift.create({
        data: {
          locationId,
          date: new Date(date),
          timeSlotId,
          maxPublishers: maxPublishers || 2,
          createdById: userId,
          notes,
        },
        include: {
          location: { select: { id: true, name: true } },
          timeSlot: true,
        },
      });

      // Asignar publicadores (si se especificaron)
      if (publisherIds && publisherIds.length > 0) {
        const assignmentData = publisherIds.map((pid: string) => ({
          shiftId: newShift.id,
          publisherId: pid,
          status: 'PENDIENTE' as const,
        }));

        await tx.shiftAssignment.createMany({ data: assignmentData });
      }

      return newShift;
    });

    // Retornar con asignaciones (enviar respuesta ANTES de notificaciones)
    const created = await prisma.shift.findUnique({
      where: { id: shift.id },
      include: {
        location: { select: { id: true, name: true } },
        timeSlot: true,
        assignments: {
          include: {
            publisher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    res.status(201).json(created);

    // Notificar a los publicadores asignados (no bloquea la respuesta)
    if (publisherIds && publisherIds.length > 0) {
      const shiftDate = new Date(date).toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Fire-and-forget: no esperamos la respuesta
      Promise.allSettled(
        publisherIds.map(async (pid: string) => {
          try {
            const pub = await prisma.publisher.findUnique({
              where: { id: pid },
              include: { user: true },
            });
            if (pub?.user) {
              await notifyTurnoAsignado(
                pub.user.id,
                `${pub.firstName} ${pub.lastName}`,
                location.name,
                shiftDate,
                timeSlot.name,
                shift.id
              );
            }
          } catch (e) {
            console.error('Error notificando asignación:', e);
          }
        })
      );
    }
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, timeSlotId, maxPublishers, status, notes, locationId, publisherIds } = req.body;

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        ...(locationId && { locationId }),
        ...(date && { date: new Date(date) }),
        ...(timeSlotId && { timeSlotId }),
        ...(maxPublishers !== undefined && { maxPublishers }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Actualizar asignaciones de publicadores
    if (publisherIds && Array.isArray(publisherIds)) {
      // Eliminar asignaciones que ya no están
      await prisma.shiftAssignment.deleteMany({
        where: {
          shiftId: shift.id,
          publisherId: { notIn: publisherIds.filter(Boolean) },
        },
      });

      // Agregar nuevas asignaciones
      for (const pubId of publisherIds) {
        if (!pubId) continue;
        await prisma.shiftAssignment.upsert({
          where: {
            shiftId_publisherId: { shiftId: shift.id, publisherId: pubId },
          },
          create: { shiftId: shift.id, publisherId: pubId, status: 'PENDIENTE' },
          update: {},
        });
      }
    }

    // Si se cancela, notificar a los asignados
    if (status === 'CANCELADO') {
      const fullShift = await prisma.shift.findUnique({
        where: { id: shift.id },
        include: {
          location: true,
          timeSlot: true,
          assignments: { include: { publisher: { include: { user: true } } } },
        },
      });

      if (fullShift) {
        const shiftDate = new Date(fullShift.date).toLocaleDateString('es-CL');
        for (const a of fullShift.assignments) {
          if (a.publisher.user) {
            await notifyTurnoCancelado(
              a.publisher.user.id,
              `${a.publisher.firstName} ${a.publisher.lastName}`,
              fullShift.location.name,
              shiftDate,
              fullShift.timeSlot.name
            );
          }
        }
      }
    }

    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function addPublisher(req: Request, res: Response, next: NextFunction) {
  try {
    const { shiftId } = req.params;
    const { publisherId } = req.body;

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundError('Turno no encontrado');

    // Verificar que no esté ya asignado
    const existing = await prisma.shiftAssignment.findUnique({
      where: { shiftId_publisherId: { shiftId, publisherId } },
    });
    if (existing) throw new ValidationError('El publicador ya está asignado a este turno');

    const assignment = await prisma.shiftAssignment.create({
      data: { shiftId, publisherId, status: 'PENDIENTE' },
      include: { publisher: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Notificar
    const pub = await prisma.publisher.findUnique({
      where: { id: publisherId },
      include: { user: true },
    });
    if (pub?.user) {
      const shiftDate = new Date(shift.date).toLocaleDateString('es-CL');
      const loc = await prisma.location.findUnique({ where: { id: shift.locationId } });
      const ts = await prisma.timeSlot.findUnique({ where: { id: shift.timeSlotId } });
      if (loc && ts) {
        await notifyTurnoAsignado(
          pub.user.id,
          `${pub.firstName} ${pub.lastName}`,
          loc.name,
          shiftDate,
          ts.name,
          shiftId
        );
      }
    }

    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

export async function removePublisher(req: Request, res: Response, next: NextFunction) {
  try {
    const { shiftId, publisherId } = req.params;
    await prisma.shiftAssignment.deleteMany({
      where: { shiftId, publisherId },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Aceptar / Rechazar turno (publicador) ───

export async function respondToAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { shiftId } = req.params;
    const { response } = req.body; // 'ACEPTADO' | 'RECHAZADO'
    const publisherId = req.user!.publisherId;

    if (!['ACEPTADO', 'RECHAZADO'].includes(response)) {
      throw new ValidationError('La respuesta debe ser ACEPTADO o RECHAZADO');
    }

    const assignment = await prisma.shiftAssignment.findUnique({
      where: { shiftId_publisherId: { shiftId, publisherId } },
    });
    if (!assignment) throw new NotFoundError('No estás asignado a este turno');

    const updated = await prisma.shiftAssignment.update({
      where: { id: assignment.id },
      data: {
        status: response,
        respondedAt: new Date(),
      },
      include: {
        shift: {
          include: {
            location: true,
            timeSlot: true,
            createdBy: true,
          },
        },
        publisher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notificar al creador del turno
    const shiftDate = new Date(updated.shift.date).toLocaleDateString('es-CL');
    await notifyTurnoRespuesta(
      updated.shift.createdById,
      `${updated.publisher.firstName} ${updated.publisher.lastName}`,
      updated.shift.location.name,
      shiftDate,
      updated.shift.timeSlot.name,
      response === 'ACEPTADO'
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ─── Mis turnos (publicador) ───

export async function myShifts(req: Request, res: Response, next: NextFunction) {
  try {
    const publisherId = req.user!.publisherId;
    const { status } = req.query;

    const where: Record<string, unknown> = { publisherId };
    if (status) where.status = String(status);

    const assignments = await prisma.shiftAssignment.findMany({
      where,
      include: {
        shift: {
          include: {
            location: {
              select: {
                id: true, name: true, address: true,
                locationAssignments: {
                  select: {
                    roleAtLocation: true,
                    user: {
                      select: {
                        publisher: { select: { firstName: true, lastName: true, phone: true } },
                      },
                    },
                  },
                },
              },
            },
            timeSlot: true,
          },
        },
      },
      orderBy: { shift: { date: 'asc' } },
    });

    res.json(assignments);
  } catch (err) {
    next(err);
  }
}
