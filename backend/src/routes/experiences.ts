import { Router } from 'express';
import { list, getById, create, review } from '../controllers/experiences';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const experienceRouter = Router();

experienceRouter.use(authenticate);

experienceRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), list);
experienceRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), getById);
experienceRouter.post('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), create);
experienceRouter.put('/:id/review', authorize('COORDINADOR', 'ENCARGADO_EXPERIENCIAS'), review);
