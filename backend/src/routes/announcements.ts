import { Router } from 'express';
import { list, create, update, remove } from '../controllers/announcements';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const announcementRouter = Router();

announcementRouter.use(authenticate);

announcementRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), list);
announcementRouter.post('/', authorize('COORDINADOR'), create);
announcementRouter.put('/:id', authorize('COORDINADOR'), update);
announcementRouter.delete('/:id', authorize('COORDINADOR'), remove);
