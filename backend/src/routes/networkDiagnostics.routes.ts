import { Router } from 'express';
import { queryDns, inspectSsl } from '../controllers/networkDiagnostics.controller';

const router = Router();

router.post('/dns', queryDns);
router.post('/ssl', inspectSsl);

export default router;
