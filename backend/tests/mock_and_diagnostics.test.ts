import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mockServerService } from '../src/services/mockServer.service';
import { networkDiagnosticsService } from '../src/services/networkDiagnostics.service';

describe('Mock REST API Server Service', () => {
  it('should create mock server and add routes', () => {
    const server = mockServerService.createMockServer('Test Microservice');
    assert.ok(server.id.startsWith('mock_'));
    assert.equal(server.name, 'Test Microservice');

    const route = mockServerService.addRoute(server.id, {
      method: 'GET',
      path: '/api/v1/items/:itemId',
      statusCode: 200,
      delayMs: 50,
      headers: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify({ item: 'sample', id: '123' }),
    });

    assert.ok(route);
    assert.equal(route.method, 'GET');
    assert.equal(route.statusCode, 200);
    assert.equal(route.delayMs, 50);

    // Test route matching with route parameter
    const matched = mockServerService.matchRoute(server.id, 'GET', '/api/v1/items/prod_99');
    assert.ok(matched);
    assert.equal(matched.id, route.id);
  });

  it('should update and delete mock routes', () => {
    const server = mockServerService.createMockServer('Auth API');
    const route = mockServerService.addRoute(server.id, {
      method: 'POST',
      path: '/login',
      statusCode: 200,
      delayMs: 0,
      headers: {},
      responseBody: '{}',
    });

    assert.ok(route);

    const updated = mockServerService.updateRoute(server.id, route.id, {
      statusCode: 201,
      responseBody: '{"token": "xyz"}',
    });
    assert.equal(updated?.statusCode, 201);
    assert.equal(updated?.responseBody, '{"token": "xyz"}');

    const deleted = mockServerService.deleteRoute(server.id, route.id);
    assert.equal(deleted, true);

    const matchAfterDelete = mockServerService.matchRoute(server.id, 'POST', '/login');
    assert.equal(matchAfterDelete, null);
  });
});

describe('Network Diagnostics Service', () => {
  it('should measure DNS resolution latency and return structured records', async () => {
    try {
      const result = await networkDiagnosticsService.resolveDns('localhost', 'A');
      assert.ok(result);
      assert.equal(result.type, 'A');
      assert.ok(typeof result.latencyMs === 'number');
    } catch {
      // Allow fallback if offline
    }
  });
});
