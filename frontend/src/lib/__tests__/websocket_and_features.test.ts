import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenApi, parsePostmanCollection, exportToOpenApi } from '../openapi.utils.ts';
import type { ApiRequest } from '../../store/workspaceStore.ts';

describe('Real-Time WebSocket Client Capabilities & Logic', () => {
  function validateWsUrl(rawUrl: string): { valid: boolean; error?: string } {
    if (!rawUrl || !rawUrl.trim()) {
      return { valid: false, error: 'URL cannot be empty' };
    }
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
      return { valid: false, error: 'URL must start with ws:// or wss://' };
    }
    try {
      new URL(trimmed);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Malformed WebSocket URL' };
    }
  }

  it('should accept valid ws:// and wss:// URLs and reject invalid schemes', () => {
    assert.equal(validateWsUrl('wss://echo.websocket.org').valid, true);
    assert.equal(validateWsUrl('ws://localhost:8080/stream').valid, true);
    assert.equal(validateWsUrl('wss://api.example.com/v1/realtime?token=xyz').valid, true);

    assert.equal(validateWsUrl('http://echo.websocket.org').valid, false);
    assert.equal(validateWsUrl('https://echo.websocket.org').valid, false);
    assert.equal(validateWsUrl('ftp://echo.websocket.org').valid, false);
    assert.equal(validateWsUrl('').valid, false);
    assert.equal(validateWsUrl('wss://invalid url with spaces').valid, false);
  });

  it('should correctly calculate message payload sizes and format log entries', () => {
    interface WsMessageLog {
      id: string;
      type: 'sent' | 'received' | 'system';
      data: string;
      timestamp: number;
      size: number;
    }

    function createLogEntry(type: 'sent' | 'received' | 'system', data: string): WsMessageLog {
      return {
        id: 'msg-' + Math.random().toString(36).substr(2, 6),
        type,
        data,
        timestamp: Date.now(),
        size: Buffer.byteLength(data, 'utf8'),
      };
    }

    const sentJson = JSON.stringify({ action: 'subscribe', channel: 'trades' });
    const log1 = createLogEntry('sent', sentJson);
    assert.equal(log1.type, 'sent');
    assert.equal(log1.size, Buffer.byteLength(sentJson));

    const receivedJson = JSON.stringify({ channel: 'trades', price: 64230.5, volume: 1.25 });
    const log2 = createLogEntry('received', receivedJson);
    assert.equal(log2.type, 'received');
    assert.ok(log2.size > 0);

    const systemLog = createLogEntry('system', 'Connected to wss://echo.websocket.org');
    assert.equal(systemLog.type, 'system');
  });

  it('should filter stream messages correctly by direction and type', () => {
    const logs = [
      { id: '1', type: 'system', data: 'Connecting...' },
      { id: '2', type: 'system', data: 'Connected' },
      { id: '3', type: 'sent', data: '{"ping": 1}' },
      { id: '4', type: 'received', data: '{"pong": 1}' },
      { id: '5', type: 'sent', data: '{"ping": 2}' },
      { id: '6', type: 'received', data: '{"pong": 2}' },
    ];

    const sentOnly = logs.filter(l => l.type === 'sent');
    assert.equal(sentOnly.length, 2);
    assert.equal(sentOnly[0].data, '{"ping": 1}');

    const receivedOnly = logs.filter(l => l.type === 'received');
    assert.equal(receivedOnly.length, 2);
    assert.equal(receivedOnly[0].data, '{"pong": 1}');

    const systemOnly = logs.filter(l => l.type === 'system');
    assert.equal(systemOnly.length, 2);
  });
});

describe('Advanced OpenAPI 3.0 & Postman Collection Ingestion', () => {
  it('should handle OpenAPI 3.0 specs with path parameters, complex bodies, and multiple verbs', () => {
    const complexSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Enterprise Banking API', version: '2.4.0' },
      servers: [
        { url: 'https://api.bank.com/v2' },
      ],
      paths: {
        '/accounts/{accountId}/transactions': {
          get: {
            summary: 'Get Account Transactions',
            parameters: [
              { name: 'accountId', in: 'path', required: true, example: 'acc_9921' },
              { name: 'startDate', in: 'query', required: false, schema: { default: '2026-01-01' } },
              { name: 'limit', in: 'query', required: true, example: '50' },
              { name: 'X-Trace-ID', in: 'header', required: true, example: 'trace-8891' },
            ],
          },
          post: {
            summary: 'Execute Fund Transfer',
            parameters: [
              { name: 'accountId', in: 'path', required: true },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    properties: {
                      recipientAccount: { type: 'string', default: 'acc_1002' },
                      amount: { type: 'number', default: 500.0 },
                      currency: { type: 'string', default: 'USD' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const parsed = parseOpenApi(complexSpec);
    assert.equal(parsed.length, 2);

    const getTx = parsed.find(e => e.method === 'GET');
    assert.ok(getTx);
    assert.equal(getTx.url, 'https://api.bank.com/v2/accounts/{accountId}/transactions');
    assert.equal(getTx.name, 'Get Account Transactions');
    
    // Check Query Params
    const limitParam = getTx.queryParams.find(q => q.key === 'limit');
    assert.ok(limitParam);
    assert.equal(limitParam.value, '50');
    assert.equal(limitParam.enabled, true);

    const dateParam = getTx.queryParams.find(q => q.key === 'startDate');
    assert.ok(dateParam);
    assert.equal(dateParam.value, '2026-01-01');

    // Check Headers
    const traceHeader = getTx.headers.find(h => h.key === 'X-Trace-ID');
    assert.ok(traceHeader);
    assert.equal(traceHeader.value, 'trace-8891');

    // Check POST body
    const postTx = parsed.find(e => e.method === 'POST');
    assert.ok(postTx);
    assert.ok(postTx.body);
    const parsedBody = JSON.parse(postTx.body);
    assert.equal(parsedBody.recipientAccount, 'acc_1002');
    assert.equal(parsedBody.amount, 500.0);
    assert.equal(parsedBody.currency, 'USD');
  });

  it('should deeply parse nested Postman folder hierarchies (3+ levels)', () => {
    const nestedPostman = {
      info: { name: 'Deep Hierarchy Workspace' },
      item: [
        {
          name: 'Core Services',
          item: [
            {
              name: 'Auth Subsystem',
              item: [
                {
                  name: 'OAuth Token',
                  request: {
                    method: 'POST',
                    url: 'https://auth.enterprise.io/oauth/token',
                    header: [{ key: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
                    body: { raw: 'grant_type=client_credentials' },
                  },
                },
              ],
            },
            {
              name: 'Users Subsystem',
              item: [
                {
                  name: 'List Members',
                  request: {
                    method: 'GET',
                    url: {
                      raw: 'https://api.enterprise.io/members?role=admin&active=true',
                      query: [
                        { key: 'role', value: 'admin' },
                        { key: 'active', value: 'true' },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const endpoints = parsePostmanCollection(JSON.stringify(nestedPostman));
    assert.equal(endpoints.length, 2);

    const tokenReq = endpoints.find(e => e.name === 'OAuth Token');
    assert.ok(tokenReq);
    assert.equal(tokenReq.method, 'POST');
    assert.equal(tokenReq.url, 'https://auth.enterprise.io/oauth/token');
    assert.equal(tokenReq.body, 'grant_type=client_credentials');

    const membersReq = endpoints.find(e => e.name === 'List Members');
    assert.ok(membersReq);
    assert.equal(membersReq.method, 'GET');
    assert.equal(membersReq.url, 'https://api.enterprise.io/members?role=admin&active=true');
    assert.equal(membersReq.queryParams.length, 2);
  });

  it('should export collection to OpenAPI 3.0 and allow re-importing without loss', () => {
    const originalRequests: ApiRequest[] = [
      {
        id: 'r1',
        name: 'List Products',
        method: 'GET',
        url: 'https://store.devsuite.dev/v1/products',
        headers: [{ id: '1', key: 'Accept', value: 'application/json', enabled: true }],
        queryParams: [{ id: '1', key: 'category', value: 'electronics', enabled: true }],
        body: '',
        auth: { type: 'none', bearerToken: '', basicUsername: '', basicPassword: '', apiKeyName: '', apiKeyValue: '', apiKeyAddTo: 'header' },
      },
      {
        id: 'r2',
        name: 'Create Product',
        method: 'POST',
        url: 'https://store.devsuite.dev/v1/products',
        headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
        queryParams: [],
        body: JSON.stringify({ title: 'Mechanical Keyboard', price: 149.99 }),
        auth: { type: 'bearer', bearerToken: 'my-token', basicUsername: '', basicPassword: '', apiKeyName: '', apiKeyValue: '', apiKeyAddTo: 'header' },
      },
    ];

    // 1. Export
    const openApiJson = exportToOpenApi(originalRequests, 'DevSuite Store API');
    const parsedSpec = JSON.parse(openApiJson);

    assert.equal(parsedSpec.openapi, '3.0.0');
    assert.equal(parsedSpec.info.title, 'DevSuite Store API');
    assert.ok(parsedSpec.paths['/v1/products']);
    assert.ok(parsedSpec.paths['/v1/products'].get);
    assert.ok(parsedSpec.paths['/v1/products'].post);

    // 2. Re-import
    const reimported = parseOpenApi(openApiJson);
    assert.equal(reimported.length, 2);

    const reimportedGet = reimported.find(e => e.method === 'GET');
    assert.ok(reimportedGet);
    assert.equal(reimportedGet.name, 'List Products');
    assert.equal(reimportedGet.queryParams[0].key, 'category');
    assert.equal(reimportedGet.queryParams[0].value, 'electronics');

    const reimportedPost = reimported.find(e => e.method === 'POST');
    assert.ok(reimportedPost);
    assert.equal(reimportedPost.name, 'Create Product');
    assert.ok(reimportedPost.body?.includes('Mechanical Keyboard'));
  });
});
