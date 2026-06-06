import { Router } from 'express';
import { list, create, update, remove } from '../controllers/timeSlots';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const timeSlotRouter = Router();

timeSlotRouter.use(authenticate);

timeSlotRouter.get('/', authorize('COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'), list);
timeSlotRouter.post('/', authorize('COORDINADOR'), create);
timeSlotRouter.put('/:id', authorize('COORDINADOR'), update);
timeSlotRouter.delete('/:id', authorize('COORDINADOR'), remove);
