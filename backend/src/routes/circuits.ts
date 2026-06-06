import { Router } from 'express';
import { list, getById, create, update, remove } from '../controllers/circuits';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const circuitRouter = Router();

circuitRouter.use(authenticate);

circuitRouter.get('/', authorize('COORDINADOR', 'AUXILIAR'), list);
circuitRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR'), getById);
circuitRouter.post('/', authorize('COORDINADOR'), create);
circuitRouter.put('/:id', authorize('COORDINADOR'), update);
circuitRouter.delete('/:id', authorize('COORDINADOR'), remove);
