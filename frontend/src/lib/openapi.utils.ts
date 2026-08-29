import YAML from 'yaml';
import type { ApiRequest } from '@/store/workspaceStore';

export interface ParsedEndpoint {
  name: string;
  method: string;
  url: string;
  headers: { id: string; key: string; value: string; enabled: boolean }[];
  queryParams: { id: string; key: string; value: string; enabled: boolean }[];
  body?: string;
}

/**
 * Parses OpenAPI 3.0 or Swagger 2.0 content (JSON or YAML) into an array of ApiRequest objects.
 */
export function parseOpenApi(content: string): ParsedEndpoint[] {
  if (!content || !content.trim()) return [];

  let spec: any;
  try {
    spec = JSON.parse(content);
  } catch {
    try {
      spec = YAML.parse(content);
    } catch {
      throw new Error('Invalid JSON or YAML format for OpenAPI specification');
    }
  }

  if (!spec || typeof spec !== 'object') {
    throw new Error('Specification must be an object');
  }

  const endpoints: ParsedEndpoint[] = [];
  let baseUrl = 'https://api.example.com';
  if (spec.servers && Array.isArray(spec.servers) && spec.servers[0]?.url) {
    baseUrl = spec.servers[0].url;
  } else if (spec.host) {
    baseUrl = `${spec.schemes?.[0] || 'https'}://${spec.host}${spec.basePath || ''}`;
  }
  const paths = spec.paths || {};

  for (const [pathKey, pathItem] of Object.entries<any>(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const name = operation.summary || operation.operationId || `${method.toUpperCase()} ${pathKey}`;
      const queryParams: { id: string; key: string; value: string; enabled: boolean }[] = [];
      const headers: { id: string; key: string; value: string; enabled: boolean }[] = [
        { id: '1', key: 'Accept', value: 'application/json', enabled: true },
      ];

      // Parameters
      const allParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];
      allParams.forEach((param: any, idx: number) => {
        if (param.in === 'query') {
          queryParams.push({
            id: String(idx + 1),
            key: param.name,
            value: param.example !== undefined ? String(param.example) : (param.schema?.default !== undefined ? String(param.schema.default) : ''),
            enabled: param.required || false,
          });
        } else if (param.in === 'header') {
          headers.push({
            id: String(Date.now() + idx),
            key: param.name,
            value: param.example !== undefined ? String(param.example) : '',
            enabled: param.required || false,
          });
        }
      });

      // Request Body
      let body = '{\n  \n}';
      if (operation.requestBody?.content?.['application/json']?.schema) {
        headers.push({ id: 'ct', key: 'Content-Type', value: 'application/json', enabled: true });
        const schema = operation.requestBody.content['application/json'].schema;
        if (schema.example) {
          body = JSON.stringify(schema.example, null, 2);
        } else if (schema.properties) {
          const mockBody: Record<string, any> = {};
          for (const [propKey, propVal] of Object.entries<any>(schema.properties)) {
            mockBody[propKey] = propVal.default || (propVal.type === 'string' ? '' : propVal.type === 'number' ? 0 : null);
          }
          body = JSON.stringify(mockBody, null, 2);
        }
      }

      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = pathKey.startsWith('/') ? pathKey : `/${pathKey}`;
      const fullUrl = `${cleanBaseUrl}${cleanPath}`;

      endpoints.push({
        name,
        method: method.toUpperCase(),
        url: fullUrl,
        headers,
        queryParams,
        body,
      });
    }
  }

  return endpoints;
}

/**
 * Parses Postman Collection v2.1 JSON into an array of ApiRequest objects.
 */
export function parsePostmanCollection(content: string): ParsedEndpoint[] {
  let collection: any;
  try {
    collection = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    throw new Error('Invalid JSON format for Postman Collection');
  }

  if (!collection || !Array.isArray(collection.item)) {
    throw new Error('Not a valid Postman Collection (missing item array)');
  }

  const endpoints: ParsedEndpoint[] = [];

  const extractItems = (items: any[]) => {
    items.forEach((item: any) => {
      if (item.item && Array.isArray(item.item)) {
        extractItems(item.item);
      } else if (item.request) {
        const req = item.request;
        const name = item.name || 'Postman Request';
        const method = typeof req.method === 'string' ? req.method.toUpperCase() : 'GET';
        
        let url = '';
        if (typeof req.url === 'string') {
          url = req.url;
        } else if (req.url && req.url.raw) {
          url = req.url.raw;
        }

        const headers = Array.isArray(req.header)
          ? req.header.map((h: any, idx: number) => ({
              id: String(idx + 1),
              key: h.key || '',
              value: h.value || '',
              enabled: !h.disabled,
            }))
          : [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }];

        const queryParams = Array.isArray(req.url?.query)
          ? req.url.query.map((q: any, idx: number) => ({
              id: String(idx + 1),
              key: q.key || '',
              value: q.value || '',
              enabled: !q.disabled,
            }))
          : [];

        const body = req.body?.raw || '{\n  \n}';

        endpoints.push({
          name,
          method,
          url,
          headers,
          queryParams,
          body,
        });
      }
    });
  };

  extractItems(collection.item);
  return endpoints;
}

/**
 * Exports an array of ApiRequest objects to OpenAPI 3.0.0 JSON specification.
 */
export function exportToOpenApi(requests: ApiRequest[], title = 'DevSuite API Collection'): string {
  const paths: Record<string, any> = {};

  requests.forEach((req) => {
    try {
      const parsedUrl = new URL(req.url.includes('://') ? req.url : `http://${req.url}`);
      const path = parsedUrl.pathname || '/';
      const method = req.method.toLowerCase();

      if (!paths[path]) paths[path] = {};

      const operation: any = {
        summary: req.name,
        operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        responses: {
          '200': {
            description: 'Successful response',
          },
        },
      };

      if (req.queryParams && req.queryParams.length > 0) {
        operation.parameters = req.queryParams.map((q) => ({
          name: q.key,
          in: 'query',
          schema: { type: 'string' },
          example: q.value,
        }));
      }

      if (req.body && ['post', 'put', 'patch'].includes(method)) {
        try {
          const parsedBody = JSON.parse(req.body);
          operation.requestBody = {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  example: parsedBody,
                },
              },
            },
          };
        } catch {
          // If not valid JSON, leave schema empty
        }
      }

      paths[path][method] = operation;
    } catch {
      // Ignore malformed URLs during export
    }
  });

  const spec = {
    openapi: '3.0.0',
    info: {
      title,
      version: '1.0.0',
      description: 'Exported from DevSuite.dev API Workspace',
    },
    paths,
  };

  return JSON.stringify(spec, null, 2);
}
