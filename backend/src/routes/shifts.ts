import { Router } from 'express';
import {
  list,
  getById,
  create,
  update,
  addPublisher,
  removePublisher,
  respondToAssignment,
  myShifts,
} from '../controllers/shifts';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const shiftRouter = Router();

shiftRouter.use(authenticate);

// CRUD turnos
shiftRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), list);
shiftRouter.get('/my', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), myShifts);
shiftRouter.get('/:id', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'PUBLICADOR'), getById);
shiftRouter.post('/', authorize('COORDINADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), create);
shiftRouter.put('/:id', authorize('COORDINADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), update);

// Asignaciones
shiftRouter.post('/:shiftId/publishers', authorize('COORDINADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), addPublisher);
shiftRouter.delete('/:shiftId/publishers/:publisherId', authorize('COORDINADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'), removePublisher);

// Respuesta del publicador
shiftRouter.post('/:shiftId/respond', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), respondToAssignment);
