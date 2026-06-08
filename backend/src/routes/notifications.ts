import { Router } from 'express';
import {
  list,
  markAsRead,
  markAllAsRead,
  unreadCount,
  getPreferences,
  updatePreferences,
  registerDevice,
  unregisterDevice,
} from '../controllers/notifications';
import { authenticate, requireRole } from '../middleware/auth';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

// Historial (COORDINADOR y AUXILIAR pueden ver)
notificationRouter.get('/', list);
notificationRouter.get('/unread-count', unreadCount);
notificationRouter.put('/:id/read', markAsRead);
notificationRouter.put('/read-all', markAllAsRead);

// Preferencias: ver cualquiera, modificar solo COORDINADOR
notificationRouter.get('/preferences', getPreferences);
notificationRouter.put('/preferences', requireRole(['COORDINADOR']), updatePreferences);

// Device token (push) - cualquier usuario
notificationRouter.post('/device', registerDevice);
notificationRouter.delete('/device', unregisterDevice);
