import { Router } from 'express';
import {
  list,
  getById,
  create,
  update,
  remove,
  hardDelete,
  assignUser,
  removeAssignment,
  getMyLocations,
} from '../controllers/locations';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const locationRouter = Router();

locationRouter.use(authenticate);

locationRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), list);
locationRouter.get('/my', authorize('COORDINADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), getMyLocations);
locationRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), getById);
locationRouter.post('/', authorize('COORDINADOR'), create);
locationRouter.put('/:id', authorize('COORDINADOR'), update);
locationRouter.delete('/:id/hard', authorize('COORDINADOR'), hardDelete);
locationRouter.delete('/:id', authorize('COORDINADOR'), remove);

// Asignación de encargados
locationRouter.post('/:locationId/assign', authorize('COORDINADOR'), assignUser);
locationRouter.delete('/:locationId/assign/:userId', authorize('COORDINADOR'), removeAssignment);
