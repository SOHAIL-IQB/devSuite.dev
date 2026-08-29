import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSafeUrl, isPrivateIPv4, isPrivateIPv6 } from '../src/utils/ssrf.utils';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt.utils';

describe('SSRF Protection & URL Validation', () => {
  it('should identify private and loopback IPv4 addresses', () => {
    assert.equal(isPrivateIPv4('127.0.0.1'), true);
    assert.equal(isPrivateIPv4('127.0.0.2'), true);
    assert.equal(isPrivateIPv4('10.0.0.1'), true);
    assert.equal(isPrivateIPv4('10.255.255.255'), true);
    assert.equal(isPrivateIPv4('172.16.0.1'), true);
    assert.equal(isPrivateIPv4('172.31.255.255'), true);
    assert.equal(isPrivateIPv4('192.168.0.1'), true);
    assert.equal(isPrivateIPv4('192.168.255.255'), true);
    assert.equal(isPrivateIPv4('169.254.169.254'), true); // Cloud metadata
    assert.equal(isPrivateIPv4('0.0.0.0'), true);
    assert.equal(isPrivateIPv4('100.64.0.1'), true);
    
    // Public IPv4 addresses
    assert.equal(isPrivateIPv4('8.8.8.8'), false);
    assert.equal(isPrivateIPv4('1.1.1.1'), false);
    assert.equal(isPrivateIPv4('93.184.216.34'), false);
  });

  it('should identify private and loopback IPv6 addresses', () => {
    assert.equal(isPrivateIPv6('::1'), true);
    assert.equal(isPrivateIPv6('::'), true);
    assert.equal(isPrivateIPv6('fc00::1'), true);
    assert.equal(isPrivateIPv6('fe80::1'), true);
    assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateIPv6('::ffff:192.168.1.1'), true);
    
    // Public IPv6
    assert.equal(isPrivateIPv6('2606:4700:4700::1111'), false);
  });

  it('should block unsafe protocols and internal hostnames in validateSafeUrl', async () => {
    const fileResult = await validateSafeUrl('file:///etc/passwd');
    assert.equal(fileResult.safe, false);

    const gopherResult = await validateSafeUrl('gopher://127.0.0.1:70');
    assert.equal(gopherResult.safe, false);

    const localhostResult = await validateSafeUrl('http://localhost:3000/api');
    assert.equal(localhostResult.safe, false);

    const dbResult = await validateSafeUrl('http://db:5432');
    assert.equal(dbResult.safe, false);

    const redisResult = await validateSafeUrl('http://redis:6379');
    assert.equal(redisResult.safe, false);

    const metadataResult = await validateSafeUrl('http://metadata.google.internal/computeMetadata/v1');
    assert.equal(metadataResult.safe, false);

    const loopbackIpResult = await validateSafeUrl('http://127.0.0.1:8080/secret');
    assert.equal(loopbackIpResult.safe, false);

    const metadataIpResult = await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(metadataIpResult.safe, false);
  });

  it('should allow valid public HTTP/HTTPS IP literals in validateSafeUrl', async () => {
    const publicIpResult = await validateSafeUrl('http://93.184.216.34/api/data');
    assert.equal(publicIpResult.safe, true);

    const publicIpResult2 = await validateSafeUrl('https://8.8.8.8/dns-query');
    assert.equal(publicIpResult2.safe, true);
  });
});

describe('JWT Generation and Verification', () => {
  const userId = 'user-test-uuid-1234';
  const sessionId = 'session-test-uuid-5678';

  it('should generate and verify access token correctly', () => {
    const token = generateAccessToken(userId);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = verifyAccessToken(token);
    assert.ok(verified !== null);
    assert.equal(verified?.userId, userId);
  });

  it('should generate and verify refresh token with session ID correctly', () => {
    const token = generateRefreshToken(userId, sessionId);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = verifyRefreshToken(token);
    assert.ok(verified !== null);
    assert.equal(verified?.userId, userId);
    assert.equal(verified?.sessionId, sessionId);
  });

  it('should reject tampered or invalid JWTs', () => {
    const token = generateAccessToken(userId);
    const tampered = token.slice(0, -5) + 'xxxxx';

    const result = verifyAccessToken(tampered);
    assert.equal(result, null);

    const emptyResult = verifyAccessToken('');
    assert.equal(emptyResult, null);
  });
});
