import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { publishersReport, shiftsReport, experiencesReport, locationsReport } from '../controllers/reports';

export const reportRouter = Router();

reportRouter.use(authenticate);

const reportRoles = ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'] as const;

reportRouter.get('/publishers', authorize(...reportRoles), publishersReport);
reportRouter.get('/shifts', authorize(...reportRoles), shiftsReport);
reportRouter.get('/experiences', authorize(...reportRoles), experiencesReport);
reportRouter.get('/locations', authorize(...reportRoles), locationsReport);
