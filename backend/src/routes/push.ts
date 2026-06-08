import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { subscribe, unsubscribe, listSubscriptions } from '../controllers/push';
import { requireRole } from '../middleware/auth';

const router = Router();

// Suscripción/desuscripción: cualquier usuario autenticado
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);

// Ver suscripciones: COORDINADOR y AUXILIAR
router.get('/subscriptions', authenticate, requireRole(['COORDINADOR', 'AUXILIAR']), listSubscriptions);

export default router;
