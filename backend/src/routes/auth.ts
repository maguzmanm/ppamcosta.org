import { Router } from 'express';
import { register, login, me, listUsers, updateRole, forgotPassword, resetPassword } from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

export const authRouter = Router();

authRouter.post('/register', authenticate, authorize('COORDINADOR'), register);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/me', authenticate, me);
authRouter.get('/users', authenticate, authorize('COORDINADOR'), listUsers);
authRouter.put('/users/:id/role', authenticate, authorize('COORDINADOR'), updateRole);
