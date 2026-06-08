import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    const body: any = { error: err.message };
    if ((err as any).details) {
      body.details = (err as any).details;
    }
    return res.status(err.statusCode).json(body);
  }

  console.error('Error inesperado:', err);
  return res.status(500).json({
    error: 'Error interno del servidor',
  });
}
