import { Router } from 'express';
import {
  createServer,
  listServers,
  getServerDetails,
  addRoute,
  updateRoute,
  deleteRoute,
  handleServeMockRequest,
} from '../controllers/mockServer.controller';

const router = Router();

// Mock Server Management
router.post('/servers', createServer);
router.get('/servers', listServers);
router.get('/servers/:serverId', getServerDetails);
router.post('/servers/:serverId/routes', addRoute);
router.put('/servers/:serverId/routes/:routeId', updateRoute);
router.delete('/servers/:serverId/routes/:routeId', deleteRoute);

// Mock Endpoint Catchers (with Express 5 wildcard syntax)
router.all('/serve/:serverId', handleServeMockRequest);
router.all('/serve/:serverId/{*subpath}', handleServeMockRequest);

export default router;
