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
import { authenticate } from '../middleware/auth';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

// Historial
notificationRouter.get('/', list);
notificationRouter.get('/unread-count', unreadCount);
notificationRouter.put('/:id/read', markAsRead);
notificationRouter.put('/read-all', markAllAsRead);

// Preferencias
notificationRouter.get('/preferences', getPreferences);
notificationRouter.put('/preferences', updatePreferences);

// Device token (push)
notificationRouter.post('/device', registerDevice);
notificationRouter.delete('/device', unregisterDevice);
