import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { NotFoundError, ValidationError } from '../utils/errors';

// ─── CRUD Publicadores ───

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { congregationId, isActive, search, role } = req.query;
    const where: Record<string, unknown> = {};

    if (congregationId) where.congregationId = String(congregationId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (role) where.user = { role: String(role) };
    if (search) {
      const s = String(search);
      where.OR = [
        { firstName: { contains: s } },
        { lastName: { contains: s } },
      ];
    }

    const publishers = await prisma.publisher.findMany({
      where,
      include: {
        congregation: { include: { circuit: true } },
        location: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true } },
        _count: { select: { availabilities: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    res.json(publishers);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const publisher = await prisma.publisher.findUnique({
      where: { id: req.params.id },
      include: {
        congregation: { include: { circuit: true } },
        location: { select: { id: true, name: true } },
        availabilities: { include: { timeSlot: true } },
        user: { select: { id: true, email: true, role: true } },
      },
    });
    if (!publisher) throw new NotFoundError('Publicador no encontrado');
    res.json(publisher);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { firstName, lastName, marriedLastName, designations, gender, congregationId, locationId, phone, email, notes, password, role, maritalStatus, spouseId, spouseIsExternal, spouseName } = req.body;
    if (!firstName || !lastName || !congregationId) {
      throw new ValidationError('Nombre, apellido y congregación son requeridos');
    }

    const congregation = await prisma.congregation.findUnique({ where: { id: congregationId } });
    if (!congregation) throw new NotFoundError('Congregación no encontrada');

    if (locationId) {
      const loc = await prisma.location.findUnique({ where: { id: locationId } });
      if (!loc) throw new NotFoundError('Punto no encontrado');
    }

    const publisher = await prisma.publisher.create({
      data: {
        firstName, lastName,
        marriedLastName: marriedLastName || null,
        designations: designations || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        spouseId: spouseId || null,
        spouseIsExternal: spouseIsExternal === true || spouseIsExternal === 'true',
        spouseName: spouseName || null,
        congregationId,
        locationId: locationId || null,
        phone, email, notes,
      },
      include: { congregation: { include: { circuit: true } } },
    });

    // Si se asignó cónyuge, actualizar bidireccionalmente
    if (spouseId) {
      await prisma.publisher.update({
        where: { id: spouseId },
        data: { spouseId: publisher.id, maritalStatus: 'CASADO' },
      });
    }

    // Si se proporciona email y contraseña, crear usuario automáticamente
    if (email && password) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: { email, passwordHash, role: role || 'PUBLICADOR', publisherId: publisher.id },
        });
        await prisma.notificationPreference.create({
          data: { userId: user.id },
        });
      }
    }

    res.status(201).json(publisher);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { firstName, lastName, marriedLastName, designations, gender, congregationId, locationId, phone, email, notes, isActive, role, password, maritalStatus, spouseId, spouseIsExternal, spouseName } = req.body;

    if (locationId) {
      const loc = await prisma.location.findUnique({ where: { id: locationId } });
      if (!loc) throw new NotFoundError('Punto no encontrado');
    }

    // Si cambió el spouseId, limpiar relación anterior y setear bidireccional
    if (spouseId !== undefined) {
      const oldPublisher = await prisma.publisher.findUnique({ where: { id: req.params.id } });
      if (oldPublisher?.spouseId && oldPublisher.spouseId !== spouseId) {
        await prisma.publisher.update({
          where: { id: oldPublisher.spouseId },
          data: { spouseId: null, maritalStatus: null },
        });
      }
      if (spouseId) {
        await prisma.publisher.update({
          where: { id: spouseId },
          data: { spouseId: req.params.id, maritalStatus: 'CASADO' },
        });
      }
    }

    const publisher = await prisma.publisher.update({
      where: { id: req.params.id },
      data: {
        firstName, lastName,
        marriedLastName: marriedLastName !== undefined ? (marriedLastName || null) : undefined,
        designations: designations !== undefined ? (designations || null) : undefined,
        gender: gender !== undefined ? (gender || null) : undefined,
        maritalStatus: maritalStatus !== undefined ? (maritalStatus || null) : undefined,
        spouseId: spouseId !== undefined ? (spouseId || null) : undefined,
        spouseIsExternal: spouseIsExternal !== undefined ? (spouseIsExternal === true || spouseIsExternal === 'true') : undefined,
        spouseName: spouseName !== undefined ? (spouseName || null) : undefined,
        congregationId, locationId: locationId !== undefined ? (locationId || null) : undefined, phone, email, notes, isActive,
      },
      include: { congregation: { include: { circuit: true } }, user: { select: { id: true, email: true, role: true } } },
    });

    // Actualizar o crear usuario si hay email
    if (email) {
      if (publisher.user) {
        // Actualizar usuario existente
        const userData: Record<string, unknown> = {};
        if (email) userData.email = email;
        if (role) userData.role = role;
        if (password) {
          userData.passwordHash = await bcrypt.hash(password, 10);
        }
        if (Object.keys(userData).length > 0) {
          await prisma.user.update({ where: { id: publisher.user.id }, data: userData });
        }
      } else if (password) {
        // Crear usuario si no existe pero hay email y contraseña
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: { email, passwordHash, role: role || 'PUBLICADOR', publisherId: publisher.id },
        });
        await prisma.notificationPreference.create({ data: { userId: user.id } });
      }
    }

    // Refrescar para incluir cambios de usuario
    const updated = await prisma.publisher.findUnique({
      where: { id: req.params.id },
      include: { congregation: { include: { circuit: true } }, user: { select: { id: true, email: true, role: true } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const publisherId = req.params.id;

    // Limpiar relaciones para evitar conflictos
    await prisma.$transaction([
      // Limpiar referencia de cónyuge en el otro publicador
      prisma.publisher.updateMany({
        where: { spouseId: publisherId },
        data: { spouseId: null, maritalStatus: null },
      }),
      // Eliminar disponibilidades
      prisma.availability.deleteMany({ where: { publisherId } }),
      // Eliminar asignaciones a turnos pendientes (las aceptadas se conservan)
      prisma.shiftAssignment.deleteMany({ where: { publisherId, status: 'PENDIENTE' } }),
      // Desactivar usuario si existe
      prisma.user.updateMany({
        where: { publisherId },
        data: { role: 'PUBLICADOR' },
      }),
    ]);

    // Desactivar el publicador
    await prisma.publisher.update({
      where: { id: publisherId },
      data: { isActive: false, locationId: null },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Eliminación definitiva (solo inactivos) ───

export async function hardDelete(req: Request, res: Response, next: NextFunction) {
  try {
    const publisherId = req.params.id;

    const publisher = await prisma.publisher.findUnique({ where: { id: publisherId } });
    if (!publisher) throw new NotFoundError('Publicador no encontrado');

    if (publisher.isActive) {
      throw new ValidationError('Desactiva el publicador antes de eliminarlo definitivamente');
    }

    // Limpiar todas las relaciones
    await prisma.$transaction([
      prisma.publisher.updateMany({ where: { spouseId: publisherId }, data: { spouseId: null, maritalStatus: null } }),
      prisma.availability.deleteMany({ where: { publisherId } }),
      prisma.absence.deleteMany({ where: { publisherId } }),
      prisma.shiftAssignment.deleteMany({ where: { publisherId } }),
      prisma.experience.deleteMany({ where: { publisherId } }),
      prisma.deviceToken.deleteMany({ where: { user: { publisherId } } }),
      prisma.pushSubscription.deleteMany({ where: { user: { publisherId } } }),
      prisma.notificationPreference.deleteMany({ where: { user: { publisherId } } }),
      prisma.notification.deleteMany({ where: { user: { publisherId } } }),
      prisma.user.deleteMany({ where: { publisherId } }),
    ]);

    await prisma.publisher.delete({ where: { id: publisherId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Cónyuges disponibles ───

export async function availableSpouses(req: Request, res: Response, next: NextFunction) {
  try {
    const { gender, excludeId, includeId } = req.query;
    // Buscar el género opuesto
    const targetGender = gender === 'M' ? 'F' : 'M';

    const available = await prisma.publisher.findMany({
      where: {
        gender: targetGender,
        isActive: true,
        OR: [
          { spouseId: null },
          ...(includeId ? [{ id: String(includeId) }] : []),
        ],
        ...(excludeId ? { id: { not: String(excludeId) } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        marriedLastName: true,
        gender: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    res.json(available);
  } catch (err) {
    next(err);
  }
}

// ─── Disponibilidad ───

export async function getAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const publisherId = req.params.id;

    const availabilities = await prisma.availability.findMany({
      where: { publisherId },
      include: { timeSlot: true },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: { sortOrder: 'asc' } }],
    });
    res.json(availabilities);
  } catch (err) {
    next(err);
  }
}

export async function setAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const publisherId = req.params.id;
    const { availabilities } = req.body; // [{ dayOfWeek: 1, timeSlotId: "..." }]

    if (!Array.isArray(availabilities)) {
      throw new ValidationError('Se espera un arreglo de disponibilidades');
    }

    // Eliminar disponibilidad existente y crear la nueva (transacción)
    await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { publisherId } });

      if (availabilities.length > 0) {
        await tx.availability.createMany({
          data: availabilities.map((a: { dayOfWeek: number; timeSlotId: string }) => ({
            publisherId,
            dayOfWeek: a.dayOfWeek,
            timeSlotId: a.timeSlotId,
          })),
        });
      }
    });

    // Retornar la disponibilidad actualizada
    const updated = await prisma.availability.findMany({
      where: { publisherId },
      include: { timeSlot: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ─── Publicadores disponibles para un turno ───

export async function getAvailableForShift(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, timeSlotId, excludeShiftId } = req.query;
    if (!date || !timeSlotId) {
      throw new ValidationError('Fecha y franja horaria son requeridos');
    }

    // Construir fecha UTC explícitamente para evitar ambigüedad de zona horaria
    const [y, m, d] = String(date).split('-').map(Number);
    const shiftDate = new Date(Date.UTC(y, m - 1, d));
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
    const dayOfWeek = shiftDate.getUTCDay(); // 0=Dom, 1=Lun, ...

    // Filtro de turnos en el mismo día — si se está editando un turno, se excluye ese turno
    // Solo turnos NO cancelados bloquean al publicador
    const sameDayShiftFilter: any = {
      date: { gte: shiftDate, lt: nextDay },
      status: { not: 'CANCELADO' },
    };
    if (excludeShiftId) {
      sameDayShiftFilter.id = { not: String(excludeShiftId) };
    }

    const availablePublishers = await prisma.publisher.findMany({
      where: {
        isActive: true,
        availabilities: {
          some: {
            dayOfWeek,
            timeSlotId: String(timeSlotId),
          },
        },
        // Excluir los que están de ausencia en esta fecha
        absences: {
          none: {
            startDate: { lte: shiftDate },
            endDate: { gte: shiftDate },
          },
        },
        // Excluir los que YA están asignados a OTRO turno en la MISMA fecha
        shiftAssignments: {
          none: {
            shift: sameDayShiftFilter,
          },
        },
      },
      include: {
        congregation: { select: { id: true, name: true } },
        shiftAssignments: {
          orderBy: { assignedAt: 'desc' },
          take: 1,
          select: { assignedAt: true },
        },
      },
    });

    // Ordenar: primero los que NUNCA han sido asignados, luego por fecha más antigua
    const sorted = availablePublishers.sort((a, b) => {
      const aLast = a.shiftAssignments[0]?.assignedAt;
      const bLast = b.shiftAssignments[0]?.assignedAt;

      // Sin asignaciones previas = máxima prioridad
      if (!aLast && !bLast) return 0;
      if (!aLast) return -1;
      if (!bLast) return 1;

      // Más antiguo primero (menor fecha = mayor prioridad)
      return new Date(aLast).getTime() - new Date(bLast).getTime();
    });

    res.json(sorted);
  } catch (err) {
    next(err);
  }
}

// ─── Ausencias / Vacaciones ───

export async function getAbsences(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: publisherId } = req.params;
    const absences = await prisma.absence.findMany({
      where: { publisherId },
      orderBy: { startDate: 'desc' },
    });
    res.json(absences);
  } catch (err) { next(err); }
}

export async function createAbsence(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: publisherId } = req.params;
    const { startDate, endDate, reason, notes } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate y endDate son requeridos' });
    }

    // Construir fechas UTC explícitamente para que coincidan con getAvailableForShift
    const [sy, sm, sd] = String(startDate).split('-').map(Number);
    const [ey, em, ed] = String(endDate).split('-').map(Number);

    const absence = await prisma.absence.create({
      data: {
        publisherId,
        startDate: new Date(Date.UTC(sy, sm - 1, sd)),
        endDate: new Date(Date.UTC(ey, em - 1, ed)),
        reason: reason || null,
        notes: notes || null,
      },
    });
    res.status(201).json(absence);
  } catch (err) { next(err); }
}

export async function deleteAbsence(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: publisherId, absenceId } = req.params;
    await prisma.absence.deleteMany({
      where: { id: absenceId, publisherId },
    });
    res.json({ message: 'Ausencia eliminada' });
  } catch (err) { next(err); }
}
