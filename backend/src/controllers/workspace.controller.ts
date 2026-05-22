import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import axios, { Method } from 'axios';
import { z } from 'zod';

const proxySchema = z.object({
  url: z.string().url(),
  method: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
});

export const proxyRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, method, headers, body } = proxySchema.parse(req.body);
    
    const startTime = Date.now();
    
    try {
      const response = await axios({
        url,
        method: method as Method,
        headers,
        data: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined,
        // Don't throw on error status codes
        validateStatus: () => true,
        // Timeout after 15s
        timeout: 15000,
      });
      
      const timeMs = Date.now() - startTime;
      
      res.json({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        timeMs,
      });
    } catch (axiosError: any) {
      const timeMs = Date.now() - startTime;
      res.status(500).json({
        error: axiosError.message || 'Failed to execute request',
        timeMs,
      });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid proxy request payload' });
  }
};

export const getWorkspaces = async (req: Request, res: Response): Promise<void> => {
  const workspaces = await prisma.workspace.findMany({
    where: { userId: req.user!.userId },
    include: {
      requests: {
        orderBy: { updatedAt: 'desc' }
      }
    }
  });
  
  if (workspaces.length === 0) {
    const newWorkspace = await prisma.workspace.create({
      data: {
        userId: req.user!.userId,
        name: 'My Default Workspace',
      },
      include: { requests: true }
    });
    res.json([newWorkspace]);
    return;
  }
  
  res.json(workspaces);
};

export const saveRequest = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId, id, name, method, url, headers, queryParams, body } = req.body;

  if (id) {
    const updated = await prisma.apiRequest.update({
      where: { id },
      data: { name, method, url, headers, queryParams, body }
    });
    res.json(updated);
    return;
  }

  const created = await prisma.apiRequest.create({
    data: { workspaceId, name, method, url, headers, queryParams, body }
  });
  res.status(201).json(created);
};

export const deleteRequest = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await prisma.apiRequest.delete({ where: { id } }).catch(() => {});
  res.json({ success: true });
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const requestsCount = await prisma.apiRequest.count({
    where: {
      workspace: {
        userId: req.user.userId
      }
    }
  });
  
  res.json({
    apiRequests: requestsCount,
  });
};
