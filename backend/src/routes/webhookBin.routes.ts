import { Router } from 'express';
import {
  createNewBin,
  getBinDetails,
  updateBinConfig,
  clearBinRequests,
  handleIncomingWebhook,
} from '../controllers/webhookBin.controller';

const router = Router();

// Bin Management
router.post('/new', createNewBin);
router.get('/:binId', getBinDetails);
router.put('/:binId/config', updateBinConfig);
router.delete('/:binId/requests', clearBinRequests);

// Webhook Catcher Routes
router.all('/catch/:binId', handleIncomingWebhook);
router.all('/catch/:binId/*', handleIncomingWebhook);

export default router;
