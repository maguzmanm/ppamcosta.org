import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { circuitRouter } from './routes/circuits';
import { congregationRouter } from './routes/congregations';
import { publisherRouter } from './routes/publishers';
import { timeSlotRouter } from './routes/timeSlots';
import { locationRouter } from './routes/locations';
import { shiftRouter } from './routes/shifts';
import { newsRouter } from './routes/news';
import { experienceRouter } from './routes/experiences';
import { announcementRouter } from './routes/announcements';
import { notificationRouter } from './routes/notifications';
import { incidentRouter } from './routes/incidents';
import { errorHandler } from './middleware/errorHandler';
import prisma from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRouter);
app.use('/api/circuits', circuitRouter);
app.use('/api/congregations', congregationRouter);
app.use('/api/publishers', publisherRouter);
app.use('/api/timeslots', timeSlotRouter);
app.use('/api/locations', locationRouter);
app.use('/api/shifts', shiftRouter);
app.use('/api/news', newsRouter);
app.use('/api/experiences', experienceRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/incidents', incidentRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// En producción, verificar si la BD necesita seed
async function ensureDatabase() {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 BD vacía, ejecutando seed...');
      const { execSync } = require('child_process');
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', cwd: __dirname + '/..' });
      console.log('✅ Seed completado');
    }
  } catch (e: any) {
    console.error('⚠️ Error en seed automático:', e.message);
  }
}

ensureDatabase().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Servidor PPAM corriendo en http://0.0.0.0:${PORT}`);
  });
});
});

export default app;
