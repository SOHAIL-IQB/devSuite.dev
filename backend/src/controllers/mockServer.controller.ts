import { Request, Response } from 'express';
import { mockServerService } from '../services/mockServer.service';

export const createServer = (req: Request, res: Response): void => {
  try {
    const { name } = req.body || {};
    const server = mockServerService.createMockServer(name);
    res.status(201).json({ success: true, server });
  } catch (error) {
    console.error('Error creating mock server:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const listServers = (req: Request, res: Response): void => {
  try {
    const servers = mockServerService.getAllServers();
    res.json({ success: true, servers });
  } catch (error) {
    console.error('Error listing mock servers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getServerDetails = (req: Request, res: Response): void => {
  try {
    const serverId = String(req.params.serverId);
    const server = mockServerService.getServer(serverId);
    if (!server) {
      res.status(404).json({ error: 'Mock server not found' });
      return;
    }
    res.json({ success: true, server });
  } catch (error) {
    console.error('Error fetching mock server:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addRoute = (req: Request, res: Response): void => {
  try {
    const serverId = String(req.params.serverId);
    const { method, path, statusCode, delayMs, headers, responseBody } = req.body || {};

    if (!method || !path) {
      res.status(400).json({ error: 'Method and path are required' });
      return;
    }

    const route = mockServerService.addRoute(serverId, {
      method,
      path,
      statusCode: Number(statusCode) || 200,
      delayMs: Number(delayMs) || 0,
      headers: headers || { 'Content-Type': 'application/json' },
      responseBody: responseBody || '{"success": true}',
    });

    if (!route) {
      res.status(404).json({ error: 'Mock server not found' });
      return;
    }

    res.status(201).json({ success: true, route });
  } catch (error) {
    console.error('Error adding mock route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateRoute = (req: Request, res: Response): void => {
  try {
    const serverId = String(req.params.serverId);
    const routeId = String(req.params.routeId);
    const { method, path, statusCode, delayMs, headers, responseBody } = req.body || {};

    const updated = mockServerService.updateRoute(serverId, routeId, {
      method,
      path,
      statusCode: statusCode !== undefined ? Number(statusCode) : undefined,
      delayMs: delayMs !== undefined ? Number(delayMs) : undefined,
      headers,
      responseBody,
    });

    if (!updated) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    res.json({ success: true, route: updated });
  } catch (error) {
    console.error('Error updating mock route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteRoute = (req: Request, res: Response): void => {
  try {
    const serverId = String(req.params.serverId);
    const routeId = String(req.params.routeId);
    const success = mockServerService.deleteRoute(serverId, routeId);

    if (!success) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting mock route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleServeMockRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const serverId = String(req.params.serverId);
    let subpath = req.params.subpath;
    let requestPath = '/';

    if (Array.isArray(subpath)) {
      requestPath = '/' + subpath.join('/');
    } else if (typeof subpath === 'string' && subpath.trim()) {
      requestPath = subpath.startsWith('/') ? subpath : `/${subpath}`;
    }

    const matchedRoute = mockServerService.matchRoute(serverId, req.method, requestPath);

    if (!matchedRoute) {
      res.status(404).json({
        error: 'Not Found',
        message: `No mock route configured on server '${serverId}' for ${req.method} ${requestPath}`,
        configuredRoutesHint: `/api/mock/servers/${serverId}`,
      });
      return;
    }

    // Apply simulated latency
    if (matchedRoute.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, matchedRoute.delayMs));
    }

    // Set custom headers
    if (matchedRoute.headers) {
      for (const [k, v] of Object.entries(matchedRoute.headers)) {
        res.setHeader(k, v);
      }
    }

    const contentType = matchedRoute.headers?.['Content-Type'] || matchedRoute.headers?.['content-type'] || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.status(matchedRoute.statusCode || 200).send(matchedRoute.responseBody);
  } catch (error) {
    console.error('Error serving mock request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
