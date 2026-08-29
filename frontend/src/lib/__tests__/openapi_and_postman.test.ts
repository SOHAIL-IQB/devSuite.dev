import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenApi, parsePostmanCollection, exportToOpenApi } from '../openapi.utils.ts';
import type { ApiRequest } from '../../store/workspaceStore.ts';

describe('OpenAPI 3.0 Parser and Exporter', () => {
  it('should parse OpenAPI 3.0 JSON specification into endpoints', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Sample Store API', version: '1.0.0' },
      servers: [{ url: 'https://api.petstore.com/v2' }],
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            parameters: [
              { name: 'limit', in: 'query', required: true, example: '20' },
            ],
          },
          post: {
            summary: 'Create a pet',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    example: { name: 'Fido', tag: 'dog' },
                  },
                },
              },
            },
          },
        },
      },
    });

    const endpoints = parseOpenApi(spec);
    assert.equal(endpoints.length, 2);

    const getPets = endpoints.find((e) => e.method === 'GET');
    assert.ok(getPets);
    assert.equal(getPets.url, 'https://api.petstore.com/v2/pets');
    assert.equal(getPets.queryParams.length, 1);
    assert.equal(getPets.queryParams[0].key, 'limit');
    assert.equal(getPets.queryParams[0].value, '20');

    const postPets = endpoints.find((e) => e.method === 'POST');
    assert.ok(postPets);
    assert.equal(postPets.method, 'POST');
    assert.ok(postPets.body?.includes('"name": "Fido"'));
  });

  it('should parse YAML OpenAPI specification', () => {
    const yamlSpec = `
openapi: 3.0.0
info:
  title: YAML API
  version: 1.0.0
servers:
  - url: https://yaml.api.io
paths:
  /health:
    get:
      summary: Health check
`;
    const endpoints = parseOpenApi(yamlSpec);
    assert.equal(endpoints.length, 1);
    assert.equal(endpoints[0].url, 'https://yaml.api.io/health');
    assert.equal(endpoints[0].method, 'GET');
  });

  it('should export ApiRequests into valid OpenAPI 3.0 specification', () => {
    const sampleRequests: ApiRequest[] = [
      {
        id: 'req-1',
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/v1/users',
        headers: [],
        queryParams: [{ id: '1', key: 'page', value: '1', enabled: true }],
        body: '',
        auth: { type: 'none', bearerToken: '', basicUsername: '', basicPassword: '', apiKeyName: '', apiKeyValue: '', apiKeyAddTo: 'header' },
      },
    ];

    const exportedJson = exportToOpenApi(sampleRequests, 'My API Suite');
    const parsed = JSON.parse(exportedJson);

    assert.equal(parsed.openapi, '3.0.0');
    assert.equal(parsed.info.title, 'My API Suite');
    assert.ok(parsed.paths['/v1/users']);
    assert.ok(parsed.paths['/v1/users'].get);
    assert.equal(parsed.paths['/v1/users'].get.summary, 'Get Users');
  });
});

describe('Postman Collection v2.1 Parser', () => {
  it('should parse Postman Collection JSON into endpoints', () => {
    const postmanCollection = {
      info: { name: 'Postman Test Collection' },
      item: [
        {
          name: 'Get Items',
          request: {
            method: 'GET',
            url: {
              raw: 'https://api.test.com/items?sort=asc',
              query: [{ key: 'sort', value: 'asc' }],
            },
            header: [{ key: 'X-Custom-Header', value: 'custom-val' }],
          },
        },
      ],
    };

    const endpoints = parsePostmanCollection(JSON.stringify(postmanCollection));
    assert.equal(endpoints.length, 1);
    assert.equal(endpoints[0].name, 'Get Items');
    assert.equal(endpoints[0].method, 'GET');
    assert.equal(endpoints[0].url, 'https://api.test.com/items?sort=asc');
    assert.equal(endpoints[0].queryParams[0].key, 'sort');
    assert.equal(endpoints[0].queryParams[0].value, 'asc');
    assert.equal(endpoints[0].headers[0].key, 'X-Custom-Header');
    assert.equal(endpoints[0].headers[0].value, 'custom-val');
  });
});
