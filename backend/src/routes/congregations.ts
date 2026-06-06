import { Router } from 'express';
import { list, getById, create, update, remove } from '../controllers/congregations';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const congregationRouter = Router();

congregationRouter.use(authenticate);

congregationRouter.get('/', authorize('COORDINADOR', 'AUXILIAR'), list);
congregationRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR'), getById);
congregationRouter.post('/', authorize('COORDINADOR'), create);
congregationRouter.put('/:id', authorize('COORDINADOR'), update);
congregationRouter.delete('/:id', authorize('COORDINADOR'), remove);
