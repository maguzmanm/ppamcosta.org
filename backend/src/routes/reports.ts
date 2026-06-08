import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { publishersReport, shiftsReport, experiencesReport, locationsReport } from '../controllers/reports';

export const reportRouter = Router();

reportRouter.use(authenticate);

reportRouter.get('/publishers', authorize('COORDINADOR'), publishersReport);
reportRouter.get('/shifts', authorize('COORDINADOR'), shiftsReport);
reportRouter.get('/experiences', authorize('COORDINADOR'), experiencesReport);
reportRouter.get('/locations', authorize('COORDINADOR'), locationsReport);
