import { Router } from 'express';
import { register, login, logout, refresh, me, updateProfile, updatePassword, deleteAccount } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/profile', requireAuth, updateProfile);
router.put('/password', requireAuth, updatePassword);
router.delete('/account', requireAuth, deleteAccount);

export default router;
