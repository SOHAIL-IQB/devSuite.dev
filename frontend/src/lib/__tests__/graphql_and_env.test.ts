import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Environment Variable Interpolation & Resolver', () => {
  function resolveVariables(input: string, variables: Record<string, string>): string {
    if (!input || typeof input !== 'string') return input;
    let result = input;
    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, val);
    }
    return result;
  }

  it('should interpolate single and multiple variables in URLs', () => {
    const env = {
      baseUrl: 'https://api.production.io',
      version: 'v2',
      resource: 'users',
    };

    const template = '{{baseUrl}}/{{version}}/{{resource}}?limit=50';
    const resolved = resolveVariables(template, env);
    assert.equal(resolved, 'https://api.production.io/v2/users?limit=50');
  });

  it('should handle whitespace inside double braces like {{ token }}', () => {
    const env = {
      token: 'jwt_secure_token_998',
    };

    const headerTemplate = 'Bearer {{   token  }}';
    const resolved = resolveVariables(headerTemplate, env);
    assert.equal(resolved, 'Bearer jwt_secure_token_998');
  });

  it('should leave unmatched variables untouched', () => {
    const env = {
      name: 'Alice',
    };

    const body = '{"name": "{{name}}", "email": "{{unknownEmail}}"}';
    const resolved = resolveVariables(body, env);
    assert.equal(resolved, '{"name": "Alice", "email": "{{unknownEmail}}"}');
  });
});

describe('GraphQL Query & Variables Serialization', () => {
  it('should construct valid GraphQL POST payload with query and variables', () => {
    const query = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;
    const variables = { id: 'user-123' };

    const payload = {
      query: query.trim(),
      variables,
    };

    const serialized = JSON.stringify(payload);
    const parsed = JSON.parse(serialized);

    assert.ok(parsed.query.includes('query GetUser'));
    assert.equal(parsed.variables.id, 'user-123');
  });

  it('should format GraphQL Introspection Query correctly', () => {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          types { name kind description }
        }
      }
    `;

    assert.ok(introspectionQuery.includes('__schema'));
    assert.ok(introspectionQuery.includes('types'));
  });
});
