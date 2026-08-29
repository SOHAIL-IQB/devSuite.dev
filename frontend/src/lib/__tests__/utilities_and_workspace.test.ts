import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  generateCurl, 
  parseCurl, 
  buildUrlWithParams, 
  parseParamsFromUrl 
} from '../curl.utils.ts';
import type { ApiRequest } from '../curl.utils.ts';

describe('cURL Generator and Parser', () => {
  it('should generate valid cURL command from ApiRequest', () => {
    const req: ApiRequest = {
      id: '1',
      name: 'Get Users',
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      headers: [
        { id: '1', key: 'Accept', value: 'application/json', enabled: true },
        { id: '2', key: 'X-Disabled', value: 'ignore-me', enabled: false },
      ],
      queryParams: [],
      auth: {
        type: 'bearer',
        bearerToken: 'secret-token-xyz',
        basicUsername: '',
        basicPassword: '',
        apiKeyName: '',
        apiKeyValue: '',
        apiKeyAddTo: 'header',
      },
      body: '',
    };

    const curl = generateCurl(req);
    assert.ok(curl.includes('"https://api.example.com/v1/users"'));
    assert.ok(curl.includes('-H "Accept: application/json"'));
    assert.ok(curl.includes('-H "Authorization: Bearer secret-token-xyz"'));
    assert.ok(!curl.includes('X-Disabled'));
  });

  it('should parse raw cURL command into request object', () => {
    const rawCurl = `curl -X POST "https://api.example.com/v1/login" -H "Content-Type: application/json" -H "Accept: application/json" -d '{"email":"test@example.com"}'`;
    const parsed = parseCurl(rawCurl);

    assert.ok(parsed !== null);
    assert.equal(parsed?.method, 'POST');
    assert.equal(parsed?.url, 'https://api.example.com/v1/login');
    assert.equal(parsed?.headers?.length, 2);
    assert.equal(parsed?.headers?.[0].key, 'Content-Type');
    assert.equal(parsed?.headers?.[0].value, 'application/json');
    assert.equal(parsed?.body, '{"email":"test@example.com"}');
  });

  it('should return null for invalid cURL input', () => {
    assert.equal(parseCurl(''), null);
    assert.equal(parseCurl('not a curl command'), null);
  });
});

describe('URL & Query Params Bi-directional Synchronization', () => {
  it('should extract query parameters from raw URL string', () => {
    const url = 'https://api.example.com/search?q=typescript&limit=10&active=true';
    const params = parseParamsFromUrl(url);

    assert.equal(params.length, 3);
    assert.equal(params[0].key, 'q');
    assert.equal(params[0].value, 'typescript');
    assert.equal(params[1].key, 'limit');
    assert.equal(params[1].value, '10');
    assert.equal(params[2].key, 'active');
    assert.equal(params[2].value, 'true');
  });

  it('should rebuild URL with enabled parameters and omit disabled ones', () => {
    const baseUrl = 'https://api.example.com/search?old=param';
    const params = [
      { id: '1', key: 'filter', value: 'active', enabled: true },
      { id: '2', key: 'page', value: '2', enabled: true },
      { id: '3', key: 'secret', value: 'omit', enabled: false },
    ];

    const result = buildUrlWithParams(baseUrl, params);
    assert.equal(result, 'https://api.example.com/search?filter=active&page=2');
    assert.ok(!result.includes('secret'));
  });

  it('should inject API key query parameter when auth is configured as query param', () => {
    const baseUrl = 'https://api.example.com/weather';
    const params = [{ id: '1', key: 'city', value: 'London', enabled: true }];
    const auth = {
      type: 'apiKey' as const,
      bearerToken: '',
      basicUsername: '',
      basicPassword: '',
      apiKeyName: 'appid',
      apiKeyValue: '123456abcdef',
      apiKeyAddTo: 'query' as const,
    };

    const result = buildUrlWithParams(baseUrl, params, auth);
    assert.equal(result, 'https://api.example.com/weather?city=London&appid=123456abcdef');
  });
});
