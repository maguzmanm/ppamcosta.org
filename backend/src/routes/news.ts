import { Router } from 'express';
import { list, getById, create, update, remove } from '../controllers/news';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const newsRouter = Router();

newsRouter.use(authenticate);

newsRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), list);
newsRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), getById);
newsRouter.post('/', authorize('COORDINADOR'), create);
newsRouter.put('/:id', authorize('COORDINADOR'), update);
newsRouter.delete('/:id', authorize('COORDINADOR'), remove);
