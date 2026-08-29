import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import axios, { Method } from 'axios';
import { z } from 'zod';
import { validateSafeUrl } from '../utils/ssrf.utils';

const proxySchema = z.object({
  url: z.string().url('A valid HTTP or HTTPS URL is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
});

const saveRequestSchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  name: z.string().min(1, 'Request name cannot be empty').max(150, 'Name is too long'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
  url: z.string().min(1, 'URL cannot be empty'),
  headers: z.any().optional(),
  queryParams: z.any().optional(),
  body: z.string().optional().nullable(),
});

export const proxyRequest = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { url, method, headers, body } = proxySchema.parse(req.body);

    // 1. Validate destination URL against SSRF vulnerabilities
    const ssrfCheck = await validateSafeUrl(url);
    if (!ssrfCheck.safe) {
      res.status(403).json({
        error: `SSRF Protection: ${ssrfCheck.error}`,
        blocked: true,
      });
      return;
    }

    const startTime = Date.now();

    try {
      const response = await axios({
        url,
        method: method as Method,
        headers: headers ? { ...headers, 'User-Agent': 'DevSuite-Client/1.0' } : { 'User-Agent': 'DevSuite-Client/1.0' },
        data: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined,
        validateStatus: () => true, // Forward all status codes (2xx, 4xx, 5xx) to client
        timeout: 15000,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        maxBodyLength: 10 * 1024 * 1024,
        maxRedirects: 5,
        beforeRedirect: async (options) => {
          if (options.href) {
            const redirectCheck = await validateSafeUrl(options.href);
            if (!redirectCheck.safe) {
              throw new Error(`SSRF Blocked redirect to unsafe destination: ${redirectCheck.error}`);
            }
          }
        },
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
      res.status(502).json({
        error: axiosError.message || 'Failed to execute remote request',
        timeMs,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      res.status(400).json({ error: 'Invalid proxy request payload' });
    }
  }
};

export const getWorkspaces = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const workspaces = await prisma.workspace.findMany({
    where: { userId: req.user.userId },
    include: {
      requests: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  if (workspaces.length === 0) {
    const newWorkspace = await prisma.workspace.create({
      data: {
        userId: req.user.userId,
        name: 'My Default Workspace',
      },
      include: { requests: true },
    });
    res.json([newWorkspace]);
    return;
  }

  res.json(workspaces);
};

export const saveRequest = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const validated = saveRequestSchema.parse(req.body);
    const { id, workspaceId, name, method, url, headers, queryParams, body } = validated;

    // If updating an existing request, verify ownership
    if (id) {
      const existing = await prisma.apiRequest.findFirst({
        where: {
          id,
          workspace: {
            userId: req.user.userId,
          },
        },
      });

      if (!existing) {
        res.status(404).json({ error: 'Request not found or unauthorized' });
        return;
      }

      const updated = await prisma.apiRequest.update({
        where: { id },
        data: { name, method, url, headers, queryParams, body },
      });
      res.json(updated);
      return;
    }

    // Creating a new request
    let targetWorkspaceId = workspaceId;

    if (targetWorkspaceId) {
      // Verify user owns the provided workspace
      const userWorkspace = await prisma.workspace.findFirst({
        where: { id: targetWorkspaceId, userId: req.user.userId },
      });

      if (!userWorkspace) {
        res.status(403).json({ error: 'Target workspace not found or unauthorized' });
        return;
      }
    } else {
      // Find or create default workspace for user
      let defaultWorkspace = await prisma.workspace.findFirst({
        where: { userId: req.user.userId },
      });

      if (!defaultWorkspace) {
        defaultWorkspace = await prisma.workspace.create({
          data: {
            userId: req.user.userId,
            name: 'My Default Workspace',
          },
        });
      }
      targetWorkspaceId = defaultWorkspace.id;
    }

    const created = await prisma.apiRequest.create({
      data: {
        workspaceId: targetWorkspaceId,
        name,
        method,
        url,
        headers: headers || undefined,
        queryParams: queryParams || undefined,
        body: body || null,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      res.status(500).json({ error: 'Internal server error while saving request' });
    }
  }
};

export const deleteRequest = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const id = req.params.id as string;
  if (!id) {
    res.status(400).json({ error: 'Request ID is required' });
    return;
  }

  // IDOR Protection: Verify ownership before deletion
  const existing = await prisma.apiRequest.findFirst({
    where: {
      id,
      workspace: {
        userId: req.user.userId,
      },
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Request not found or unauthorized' });
    return;
  }

  await prisma.apiRequest.delete({
    where: { id },
  });

  res.json({ success: true, message: 'Request deleted successfully' });
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const requestsCount = await prisma.apiRequest.count({
    where: {
      workspace: {
        userId: req.user.userId,
      },
    },
  });

  res.json({
    apiRequests: requestsCount,
  });
};
