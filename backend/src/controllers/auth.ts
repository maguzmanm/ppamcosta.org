import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../prisma';
import { signToken } from '../utils/jwt';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, role, publisherId } = req.body;

    // Solo coordinador puede crear usuarios (verificado en ruta)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ValidationError('El email ya está registrado');
    }

    // Verificar que el publisher existe y no tiene usuario
    const publisher = await prisma.publisher.findUnique({ where: { id: publisherId } });
    if (!publisher) {
      throw new NotFoundError('Publicador no encontrado');
    }
    const existingUser = await prisma.user.findUnique({ where: { publisherId } });
    if (existingUser) {
      throw new ValidationError('Este publicador ya tiene un usuario asociado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || 'PUBLICADOR',
        publisherId,
      },
    });

    // Crear preferencias de notificación por defecto
    await prisma.notificationPreference.create({
      data: { userId: user.id },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { publisher: true },
    });

    if (!user) {
      throw new ValidationError('Email o contraseña incorrectos');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new ValidationError('Email o contraseña incorrectos');
    }

    if (!user.publisher.isActive) {
      throw new ForbiddenError('Tu cuenta de publicador está inactiva');
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      publisherId: user.publisherId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        publisherId: user.publisherId,
        publisherName: user.publisher.marriedLastName
          ? `${user.publisher.firstName} de ${user.publisher.marriedLastName}`
          : `${user.publisher.firstName} ${user.publisher.lastName}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        publisher: {
          include: {
            congregation: {
              include: { circuit: true },
            },
          },
        },
        notificationPref: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      publisher: {
        id: user.publisher.id,
        firstName: user.publisher.firstName,
        lastName: user.publisher.lastName,
        phone: user.publisher.phone,
        congregation: user.publisher.congregation.name,
        circuit: user.publisher.congregation.circuit.name,
      },
      preferences: user.notificationPref
        ? {
            pushEnabled: user.notificationPref.pushEnabled,
            emailEnabled: user.notificationPref.emailEnabled,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Recuperar contraseña ───

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) throw new ValidationError('Email es requerido');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // No revelamos si el email existe o no, pero para la demo lo mostramos
      throw new NotFoundError('No existe una cuenta con ese email');
    }

    // Generar código de 6 dígitos
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: code, resetTokenExp: expires },
    });

    // En producción, aquí se enviaría el código por email
    // Para la demo, lo devolvemos en la respuesta
    res.json({
      message: 'Código de recuperación generado. En producción se enviaría por email.',
      code, // Solo para desarrollo
      expiresAt: expires.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      throw new ValidationError('Email, código y nueva contraseña son requeridos');
    }
    if (newPassword.length < 4) {
      throw new ValidationError('La contraseña debe tener al menos 4 caracteres');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundError('No existe una cuenta con ese email');
    }

    if (!user.resetToken || !user.resetTokenExp) {
      throw new ValidationError('No hay un código de recuperación activo. Solicita uno nuevo.');
    }

    if (user.resetToken !== code) {
      throw new ValidationError('Código incorrecto');
    }

    if (new Date() > user.resetTokenExp) {
      throw new ValidationError('El código ha expirado. Solicita uno nuevo.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

// ─── Listar todos los usuarios (solo coordinador) ───
export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        publisher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            marriedLastName: true,
            congregation: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// ─── Cambiar rol de un usuario (solo coordinador) ───
export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Rol inválido. Válidos: ${validRoles.join(', ')}`);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        publisher: { select: { firstName: true, lastName: true } },
      },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}
