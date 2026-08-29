import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

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

describe('Authorization & Request Validation Schemas', () => {
  it('should validate valid API save request payloads', () => {
    const validPayload = {
      name: 'Get User List',
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
      queryParams: [{ key: 'page', value: '1', enabled: true }],
      body: null,
    };

    const parsed = saveRequestSchema.parse(validPayload);
    assert.equal(parsed.name, 'Get User List');
    assert.equal(parsed.method, 'GET');
  });

  it('should reject invalid or empty request names', () => {
    assert.throws(() => {
      saveRequestSchema.parse({
        name: '',
        url: 'https://api.example.com',
      });
    });
  });

  it('should reject invalid HTTP methods', () => {
    assert.throws(() => {
      saveRequestSchema.parse({
        name: 'Invalid Method',
        method: 'INVALID_VERB',
        url: 'https://api.example.com',
      });
    });
  });

  it('should enforce UUID format on workspace and request IDs', () => {
    assert.throws(() => {
      saveRequestSchema.parse({
        id: 'not-a-valid-uuid',
        name: 'Test',
        url: 'https://api.example.com',
      });
    });

    const validWithUuid = saveRequestSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      workspaceId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Valid UUID',
      url: 'https://api.example.com',
    });

    assert.equal(validWithUuid.id, '123e4567-e89b-12d3-a456-426614174000');
  });
});
