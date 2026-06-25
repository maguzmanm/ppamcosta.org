import { Router } from 'express';
import {
  list,
  getById,
  create,
  update,
  remove,
  hardDelete,
  getAvailability,
  setAvailability,
  getAvailableForShift,
  availableSpouses,
  getAbsences,
  createAbsence,
  deleteAbsence,
} from '../controllers/publishers';
import { authenticate } from '../middleware/auth';
import { authorize, authorizeSelfOrRole } from '../middleware/authorize';

export const publisherRouter = Router();

publisherRouter.use(authenticate);

// CRUD
publisherRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), list);
publisherRouter.get('/available-for-shift', authorize('COORDINADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), getAvailableForShift);
publisherRouter.get('/available-spouses', authorize('COORDINADOR'), availableSpouses);
publisherRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), getById);
publisherRouter.post('/', authorize('COORDINADOR'), create);
publisherRouter.put('/:id', authorize('COORDINADOR'), update);
publisherRouter.delete('/:id/hard', authorize('COORDINADOR'), hardDelete);
publisherRouter.delete('/:id', authorize('COORDINADOR'), remove);

// Disponibilidad
publisherRouter.get('/:id/availability', authorizeSelfOrRole('COORDINADOR', 'AUXILIAR'), getAvailability);
publisherRouter.put('/:id/availability', authorizeSelfOrRole('COORDINADOR'), setAvailability);

// Ausencias / Vacaciones
publisherRouter.get('/:id/absences', authorizeSelfOrRole('COORDINADOR', 'AUXILIAR'), getAbsences);
publisherRouter.post('/:id/absences', authorizeSelfOrRole('COORDINADOR'), createAbsence);
publisherRouter.delete('/:id/absences/:absenceId', authorizeSelfOrRole('COORDINADOR'), deleteAbsence);
