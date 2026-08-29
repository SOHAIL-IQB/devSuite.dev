import { randomUUID } from 'crypto';

export interface MockRoute {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  delayMs: number;
  headers: Record<string, string>;
  responseBody: string;
}

export interface MockServer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  routes: MockRoute[];
}

class MockServerService {
  private servers: Map<string, MockServer> = new Map();
  private maxServers = 100;

  constructor() {
    // Initialize default demo mock server
    const defaultServer = this.createMockServer('Demo REST API');
    this.addRoute(defaultServer.id, {
      method: 'GET',
      path: '/users',
      statusCode: 200,
      delayMs: 150,
      headers: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify([
        { id: 1, name: 'Alice Smith', email: 'alice@example.com', role: 'admin' },
        { id: 2, name: 'Bob Jones', email: 'bob@example.com', role: 'developer' },
      ], null, 2),
    });
    this.addRoute(defaultServer.id, {
      method: 'POST',
      path: '/users',
      statusCode: 201,
      delayMs: 250,
      headers: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify({ success: true, message: 'User created successfully', id: 3 }, null, 2),
    });
  }

  createMockServer(name = 'Custom Mock API'): MockServer {
    if (this.servers.size >= this.maxServers) {
      const oldestKey = this.servers.keys().next().value;
      if (oldestKey) this.servers.delete(oldestKey);
    }

    const id = 'mock_' + randomUUID().replace(/-/g, '').slice(0, 10);
    const now = new Date().toISOString();

    const server: MockServer = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      routes: [],
    };

    this.servers.set(id, server);
    return server;
  }

  getServer(serverId: string): MockServer | null {
    return this.servers.get(serverId) || null;
  }

  getAllServers(): MockServer[] {
    return Array.from(this.servers.values());
  }

  addRoute(serverId: string, routeData: Omit<MockRoute, 'id'>): MockRoute | null {
    const server = this.servers.get(serverId);
    if (!server) return null;

    const route: MockRoute = {
      id: 'route_' + randomUUID().replace(/-/g, '').slice(0, 8),
      method: routeData.method.toUpperCase(),
      path: routeData.path.startsWith('/') ? routeData.path : `/${routeData.path}`,
      statusCode: routeData.statusCode || 200,
      delayMs: Math.min(Math.max(routeData.delayMs || 0, 0), 10000),
      headers: routeData.headers || { 'Content-Type': 'application/json' },
      responseBody: routeData.responseBody || '{"success": true}',
    };

    server.routes.push(route);
    server.updatedAt = new Date().toISOString();
    return route;
  }

  updateRoute(serverId: string, routeId: string, updates: Partial<MockRoute>): MockRoute | null {
    const server = this.servers.get(serverId);
    if (!server) return null;

    const route = server.routes.find((r) => r.id === routeId);
    if (!route) return null;

    if (updates.method) route.method = updates.method.toUpperCase();
    if (updates.path) route.path = updates.path.startsWith('/') ? updates.path : `/${updates.path}`;
    if (updates.statusCode !== undefined) route.statusCode = updates.statusCode;
    if (updates.delayMs !== undefined) route.delayMs = Math.min(Math.max(updates.delayMs, 0), 10000);
    if (updates.headers) route.headers = updates.headers;
    if (updates.responseBody !== undefined) route.responseBody = updates.responseBody;

    server.updatedAt = new Date().toISOString();
    return route;
  }

  deleteRoute(serverId: string, routeId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;

    const initialLen = server.routes.length;
    server.routes = server.routes.filter((r) => r.id !== routeId);
    server.updatedAt = new Date().toISOString();
    return server.routes.length < initialLen;
  }

  matchRoute(serverId: string, method: string, requestPath: string): MockRoute | null {
    const server = this.servers.get(serverId);
    if (!server) return null;

    const normalizedReqPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
    const upperMethod = method.toUpperCase();

    // 1. Exact match
    const exact = server.routes.find(
      (r) => r.method === upperMethod && r.path === normalizedReqPath
    );
    if (exact) return exact;

    // 2. Pattern match (:param)
    for (const route of server.routes) {
      if (route.method !== upperMethod) continue;
      const patternRegex = new RegExp('^' + route.path.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$');
      if (patternRegex.test(normalizedReqPath)) {
        return route;
      }
    }

    return null;
  }
}

export const mockServerService = new MockServerService();
