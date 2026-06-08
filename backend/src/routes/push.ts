import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { subscribe, unsubscribe, listSubscriptions } from '../controllers/push';
import { requireRole } from '../middleware/auth';

export const pushRouter = Router();

// Suscripción/desuscripción: cualquier usuario autenticado
pushRouter.post('/subscribe', authenticate, subscribe);
pushRouter.post('/unsubscribe', authenticate, unsubscribe);

// Ver suscripciones: COORDINADOR y AUXILIAR
pushRouter.get('/subscriptions', authenticate, requireRole(['COORDINADOR', 'AUXILIAR']), listSubscriptions);

export default pushRouter;
