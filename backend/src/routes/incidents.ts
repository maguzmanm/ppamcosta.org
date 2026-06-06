import { Router } from 'express';
import { list, create, respond } from '../controllers/incidents';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const incidentRouter = Router();

incidentRouter.use(authenticate);

incidentRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), list);
incidentRouter.post('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), create);
incidentRouter.put('/:id/respond', authorize('COORDINADOR'), respond);
