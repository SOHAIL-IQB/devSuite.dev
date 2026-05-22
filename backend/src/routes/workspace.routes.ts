import { Router } from 'express';
import { proxyRequest, getWorkspaces, saveRequest, deleteRequest, getStats } from '../controllers/workspace.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/proxy', proxyRequest);
router.get('/', getWorkspaces);
router.get('/stats', getStats);
router.post('/request', saveRequest);
router.delete('/request/:id', deleteRequest);

export default router;
