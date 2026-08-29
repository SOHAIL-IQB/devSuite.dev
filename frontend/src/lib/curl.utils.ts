export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey';

export interface AuthConfig {
  type: AuthType;
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyAddTo: 'header' | 'query';
}

export interface ApiRequest {
  id: string;
  workspaceId?: string;
  name: string;
  method: string;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  auth: AuthConfig;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Rebuilds a URL string with enabled query parameters and optional auth query parameters.
 */
export function buildUrlWithParams(baseUrl: string, params: KeyValuePair[], auth?: AuthConfig): string {
  if (!baseUrl) return '';
  try {
    const hasProtocol = baseUrl.includes('://');
    const dummyPrefix = hasProtocol ? '' : 'http://';
    const parsed = new URL(dummyPrefix + baseUrl);

    // Clear search and rebuild from params array
    parsed.search = '';
    const searchParams = new URLSearchParams();

    params.forEach((p) => {
      if (p.enabled && p.key.trim()) {
        searchParams.append(p.key.trim(), p.value);
      }
    });

    if (auth?.type === 'apiKey' && auth.apiKeyAddTo === 'query' && auth.apiKeyName.trim() && auth.apiKeyValue) {
      searchParams.append(auth.apiKeyName.trim(), auth.apiKeyValue);
    }

    const qs = searchParams.toString();
    const cleanOriginAndPath = hasProtocol
      ? `${parsed.origin}${parsed.pathname}`
      : `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;

    return qs ? `${cleanOriginAndPath}?${qs}${parsed.hash}` : `${cleanOriginAndPath}${parsed.hash}`;
  } catch {
    return baseUrl;
  }
}

/**
 * Extracts query parameters from a raw URL string.
 */
export function parseParamsFromUrl(rawUrl: string): KeyValuePair[] {
  if (!rawUrl || !rawUrl.includes('?')) return [];
  try {
    const hasProtocol = rawUrl.includes('://');
    const parsed = new URL(hasProtocol ? rawUrl : `http://${rawUrl}`);
    const params: KeyValuePair[] = [];

    parsed.searchParams.forEach((value, key) => {
      params.push({
        id: Math.random().toString(36).substr(2, 9),
        key,
        value,
        enabled: true,
      });
    });

    return params;
  } catch {
    return [];
  }
}

/**
 * Generates an executable cURL command from an ApiRequest object.
 */
export function generateCurl(req: ApiRequest): string {
  const parts: string[] = ['curl'];

  // Method
  if (req.method && req.method !== 'GET') {
    parts.push(`-X ${req.method}`);
  }

  // URL (enclosed in quotes)
  parts.push(`"${req.url}"`);

  // Enabled Headers
  if (Array.isArray(req.headers)) {
    req.headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        parts.push(`-H "${h.key.trim()}: ${h.value.replace(/"/g, '\\"')}"`);
      }
    });
  }

  // Auth Headers
  if (req.auth) {
    if (req.auth.type === 'bearer' && req.auth.bearerToken.trim()) {
      parts.push(`-H "Authorization: Bearer ${req.auth.bearerToken.trim()}"`);
    } else if (req.auth.type === 'basic' && (req.auth.basicUsername || req.auth.basicPassword)) {
      const basicStr = btoa(`${req.auth.basicUsername}:${req.auth.basicPassword}`);
      parts.push(`-H "Authorization: Basic ${basicStr}"`);
    } else if (req.auth.type === 'apiKey' && req.auth.apiKeyAddTo === 'header' && req.auth.apiKeyName.trim() && req.auth.apiKeyValue) {
      parts.push(`-H "${req.auth.apiKeyName.trim()}: ${req.auth.apiKeyValue.replace(/"/g, '\\"')}"`);
    }
  }

  // Body
  if (req.body && req.body.trim() && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const cleanBody = req.body.replace(/"/g, '\\"').replace(/\n/g, '');
    parts.push(`-d "${cleanBody}"`);
  }

  return parts.join(' \\\n  ');
}

/**
 * Parses a raw cURL command into Partial<ApiRequest>.
 */
export function parseCurl(curlCommand: string): Partial<ApiRequest> | null {
  if (!curlCommand || !curlCommand.trim().toLowerCase().startsWith('curl')) {
    return null;
  }

  try {
    const tokens = curlCommand.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    let method = 'GET';
    let url = '';
    const headers: KeyValuePair[] = [];
    let body = '';

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      const unquote = (str: string) => str.replace(/^['"]|['"]$/g, '');

      if (token === '-X' || token === '--request') {
        method = unquote(tokens[++i]).toUpperCase();
      } else if (token === '-H' || token === '--header') {
        const headerStr = unquote(tokens[++i]);
        const colonIdx = headerStr.indexOf(':');
        if (colonIdx > 0) {
          headers.push({
            id: Math.random().toString(36).substr(2, 9),
            key: headerStr.slice(0, colonIdx).trim(),
            value: headerStr.slice(colonIdx + 1).trim(),
            enabled: true,
          });
        }
      } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
        body = unquote(tokens[++i]);
        if (method === 'GET') method = 'POST';
      } else if (!token.startsWith('-') && !url) {
        url = unquote(token);
      }
    }

    if (!url) return null;

    return {
      method,
      url,
      headers: headers.length > 0 ? headers : [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
      body: body || '{\n  \n}',
    };
  } catch {
    return null;
  }
}
