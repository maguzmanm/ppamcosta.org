import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { NotFoundError, ValidationError } from '../utils/errors';

// ─── CRUD Publicadores ───

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { congregationId, isActive, search } = req.query;
    const where: Record<string, unknown> = {};

    if (congregationId) where.congregationId = String(congregationId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
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
    const { firstName, lastName, marriedLastName, designations, gender, congregationId, locationId, phone, email, notes, password, role } = req.body;
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
      data: { firstName, lastName, marriedLastName: marriedLastName || null, designations: designations || null, gender: gender || null, congregationId, locationId: locationId || null, phone, email, notes },
      include: { congregation: { include: { circuit: true } } },
    });

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
    const { firstName, lastName, marriedLastName, designations, gender, congregationId, locationId, phone, email, notes, isActive, role, password } = req.body;

    if (locationId) {
      const loc = await prisma.location.findUnique({ where: { id: locationId } });
      if (!loc) throw new NotFoundError('Punto no encontrado');
    }

    const publisher = await prisma.publisher.update({
      where: { id: req.params.id },
      data: {
        firstName, lastName,
        marriedLastName: marriedLastName !== undefined ? (marriedLastName || null) : undefined,
        designations: designations !== undefined ? (designations || null) : undefined,
        gender: gender !== undefined ? (gender || null) : undefined,
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
    // En lugar de eliminar, desactivamos
    await prisma.publisher.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.status(204).send();
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
    const { date, timeSlotId } = req.query;
    if (!date || !timeSlotId) {
      throw new ValidationError('Fecha y franja horaria son requeridos');
    }

    const shiftDate = new Date(String(date));
    const dayOfWeek = shiftDate.getUTCDay(); // 0=Dom, 1=Lun, ...

    const availablePublishers = await prisma.publisher.findMany({
      where: {
        isActive: true,
        availabilities: {
          some: {
            dayOfWeek,
            timeSlotId: String(timeSlotId),
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
