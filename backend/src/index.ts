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
import { experienceRouter } from './routes/experiences';
import { announcementRouter } from './routes/announcements';
import { notificationRouter } from './routes/notifications';
import { incidentRouter } from './routes/incidents';
import { errorHandler } from './middleware/errorHandler';
import { seedRouter } from './routes/seed';
import { reportRouter } from './routes/reports';
import { pushRouter } from './routes/push';

dotenv.config();

// v2.1 - MySQL en cPanel, notificaciones async, sin Noticias
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
app.use('/api/push', pushRouter);

app.get('/api/ping', (_req, res) => {
  res.json({ ping: 'pong', pushRouter: !!pushRouter });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor PPAM corriendo en http://0.0.0.0:${PORT}`);
});

export default app;
