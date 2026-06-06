import { Router } from 'express';
import {
  list,
  getById,
  create,
  update,
  remove,
  getAvailability,
  setAvailability,
  getAvailableForShift,
} from '../controllers/publishers';
import { authenticate } from '../middleware/auth';
import { authorize, authorizeSelfOrRole } from '../middleware/authorize';

export const publisherRouter = Router();

publisherRouter.use(authenticate);

// CRUD
publisherRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), list);
publisherRouter.get('/available-for-shift', authorize('COORDINADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), getAvailableForShift);
publisherRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), getById);
publisherRouter.post('/', authorize('COORDINADOR'), create);
publisherRouter.put('/:id', authorize('COORDINADOR'), update);
publisherRouter.delete('/:id', authorize('COORDINADOR'), remove);

// Disponibilidad
publisherRouter.get('/:id/availability', authorizeSelfOrRole('COORDINADOR', 'AUXILIAR'), getAvailability);
publisherRouter.put('/:id/availability', authorizeSelfOrRole('COORDINADOR'), setAvailability);
