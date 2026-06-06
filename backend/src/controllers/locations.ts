import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const locations = await prisma.location.findMany({
      include: {
        locationAssignments: {
          include: {
            user: {
              include: { publisher: { select: { firstName: true, lastName: true, marriedLastName: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(locations);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const location = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        locationAssignments: {
          include: {
            user: {
              include: { publisher: { select: { firstName: true, lastName: true, marriedLastName: true } } },
            },
          },
        },
      },
    });
    if (!location) throw new NotFoundError('Punto no encontrado');
    res.json(location);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, address, latitude, longitude, notes } = req.body;
    if (!name || !address) throw new ValidationError('Nombre y dirección son requeridos');

    const parseCoord = (val: unknown): number | null => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const location = await prisma.location.create({
      data: {
        name,
        address,
        latitude: parseCoord(latitude),
        longitude: parseCoord(longitude),
        notes,
      },
    });
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, address, latitude, longitude, notes, isActive } = req.body;

    // Convertir strings vacíos a null para coordenadas
    const parseCoord = (val: unknown): number | null => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
        latitude: parseCoord(latitude),
        longitude: parseCoord(longitude),
      },
    });
    res.json(location);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.location.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Asignación de encargados/auxiliares ───

export async function assignUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { locationId } = req.params;
    const { userId, roleAtLocation } = req.body; // roleAtLocation: ENCARGADO_PUNTO | AUXILIAR_PUNTO

    if (!userId || !roleAtLocation) {
      throw new ValidationError('Usuario y rol son requeridos');
    }

    // Verificar que el usuario tenga un rol compatible
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuario no encontrado');

    const assignment = await prisma.locationAssignment.upsert({
      where: {
        userId_locationId: { userId, locationId },
      },
      create: { userId, locationId, roleAtLocation },
      update: { roleAtLocation },
    });
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

export async function removeAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { locationId, userId } = req.params;
    await prisma.locationAssignment.deleteMany({
      where: { locationId, userId },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Puntos donde un usuario es encargado ───

export async function getMyLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    // Si es coordinador, ve todos los puntos
    if (req.user!.role === 'COORDINADOR') {
      const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
      return res.json(locations);
    }

    // Si no, solo los puntos donde está asignado
    const assignments = await prisma.locationAssignment.findMany({
      where: { userId },
      include: { location: true },
    });

    res.json(assignments.map((a) => a.location));
  } catch (err) {
    next(err);
  }
}
