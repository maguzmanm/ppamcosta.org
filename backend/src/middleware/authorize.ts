import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

type Role =
  | 'COORDINADOR'
  | 'AUXILIAR'
  | 'ENCARGADO_PUNTO'
  | 'AUXILIAR_PUNTO'
  | 'ENCARGADO_EXPERIENCIAS'
  | 'PUBLICADOR';

/**
 * Middleware que verifica que el usuario tenga al menos uno de los roles especificados.
 * Si no se especifican roles, solo verifica que esté autenticado.
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('No autenticado'));
    }

    if (roles.length === 0) {
      return next();
    }

    if (roles.includes(req.user.role as Role)) {
      return next();
    }

    return next(new ForbiddenError('No tienes permisos para realizar esta acción'));
  };
}

/**
 * Verifica que el usuario sea el propio publicador o tenga rol superior.
 */
export function authorizeSelfOrRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('No autenticado'));
    }

    const targetPublisherId = req.params.publisherId || req.params.id || req.body.publisherId;

    // Si es el propio publicador, permitir
    if (targetPublisherId && req.user.publisherId === targetPublisherId) {
      return next();
    }

    // Si tiene uno de los roles permitidos
    if (roles.includes(req.user.role as Role)) {
      return next();
    }

    return next(new ForbiddenError('No tienes permisos para realizar esta acción'));
  };
}
