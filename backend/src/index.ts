import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { circuitRouter } from './routes/circuits';
import { congregationRouter } from './routes/congregations';
import { publisherRouter } from './routes/publishers';
import { timeSlotRouter } from './routes/timeSlots';
import { locationRouter } from './routes/locations';
import { shiftRouter } from './routes/shifts';
import { experienceRouter } from './routes/experiences';
import { announcementRouter } from './routes/announcements';
import { notificationRouter } from './routes/notifications';
import { incidentRouter } from './routes/incidents';
import { errorHandler } from './middleware/errorHandler';
import { seedRouter } from './routes/seed';
import { reportRouter } from './routes/reports';
import { authenticate, requireRole } from './middleware/auth';
import { subscribe, unsubscribe, listSubscriptions } from './controllers/push';

dotenv.config();

// v2.1 - MySQL en cPanel, notificaciones async, sin Noticias
const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad
app.use(helmet());
app.use(cors({
  origin: ['https://guzmanm.net', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting simple para auth
const authLimiter = new Map<string, { count: number; resetAt: number }>();
app.use('/api/auth/login', (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = authLimiter.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 10) {
      return res.status(429).json({ error: 'Demasiados intentos. Intenta en 15 minutos.' });
    }
    entry.count++;
  } else {
    authLimiter.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }
  next();
});

// Limpiar rate limits cada 30 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authLimiter) {
    if (now >= entry.resetAt) authLimiter.delete(ip);
  }
}, 30 * 60 * 1000);

app.use('/api/auth', authRouter);
app.use('/api/circuits', circuitRouter);
app.use('/api/congregations', congregationRouter);
app.use('/api/publishers', publisherRouter);
app.use('/api/timeslots', timeSlotRouter);
app.use('/api/locations', locationRouter);
app.use('/api/shifts', shiftRouter);
app.use('/api/experiences', experienceRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/incidents', incidentRouter);
app.use('/api/seed', seedRouter);
app.use('/api/reports', reportRouter);

// Push notifications (PWA)
app.post('/api/push/subscribe', authenticate, subscribe);
app.post('/api/push/unsubscribe', authenticate, unsubscribe);
app.get('/api/push/subscriptions', authenticate, requireRole(['COORDINADOR', 'AUXILIAR']), listSubscriptions);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor PPAM corriendo en http://0.0.0.0:${PORT}`);
});

export default app;
