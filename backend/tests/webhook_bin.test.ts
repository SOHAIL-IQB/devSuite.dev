import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { webhookBinService } from '../src/services/webhookBin.service';

describe('Webhook Bin & Request Catcher Service', () => {
  let testBinId: string;

  beforeEach(() => {
    const bin = webhookBinService.createBin({
      statusCode: 201,
      contentType: 'application/json',
      responseBody: JSON.stringify({ custom: 'ok' }),
    });
    testBinId = bin.id;
  });

  it('should initialize a webhook bin with configured response properties', () => {
    const bin = webhookBinService.getBin(testBinId);
    assert.ok(bin);
    assert.equal(bin.config.statusCode, 201);
    assert.equal(bin.config.contentType, 'application/json');
    const parsedBody = JSON.parse(bin.config.responseBody);
    assert.equal(parsedBody.custom, 'ok');
    assert.equal(bin.requests.length, 0);
  });

  it('should capture incoming webhook requests with method, path, headers, query, and payload', () => {
    const result = webhookBinService.recordRequest(testBinId, {
      method: 'POST',
      url: `/api/bin/catch/${testBinId}/orders?source=stripe`,
      path: '/orders',
      queryParams: { source: 'stripe' },
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'sig_test_123',
      },
      body: { event: 'payment_intent.succeeded', amount: 4900 },
      clientIp: '192.168.1.100',
    });

    assert.ok(result);
    assert.equal(result.captured.method, 'POST');
    assert.equal(result.captured.path, '/orders');
    assert.equal(result.captured.queryParams.source, 'stripe');
    assert.equal(result.captured.headers['stripe-signature'], 'sig_test_123');
    assert.equal(result.captured.clientIp, '192.168.1.100');
    assert.ok(result.captured.size > 0);

    const bin = webhookBinService.getBin(testBinId);
    assert.ok(bin);
    assert.equal(bin.requests.length, 1);
  });

  it('should update bin configuration dynamically', () => {
    const updated = webhookBinService.updateBinConfig(testBinId, {
      statusCode: 202,
      responseBody: 'Accepted',
      contentType: 'text/plain',
    });

    assert.ok(updated);
    assert.equal(updated.config.statusCode, 202);
    assert.equal(updated.config.responseBody, 'Accepted');
    assert.equal(updated.config.contentType, 'text/plain');
  });

  it('should clear captured requests on demand', () => {
    webhookBinService.recordRequest(testBinId, {
      method: 'GET',
      url: `/api/bin/catch/${testBinId}`,
      path: '/',
      queryParams: {},
      headers: {},
      body: null,
      clientIp: '127.0.0.1',
    });

    const binWithReq = webhookBinService.getBin(testBinId);
    assert.equal(binWithReq?.requests.length, 1);

    const cleared = webhookBinService.clearRequests(testBinId);
    assert.equal(cleared, true);

    const binAfterClear = webhookBinService.getBin(testBinId);
    assert.equal(binAfterClear?.requests.length, 0);
  });
});
