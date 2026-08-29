import { create } from 'zustand';
import { api } from '../lib/api';

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

export interface Workspace {
  id: string;
  name: string;
  userId: string;
  requests: ApiRequest[];
}

interface WorkspaceState {
  activeRequest: ApiRequest;
  workspaces: Workspace[];
  savedRequests: ApiRequest[];
  isLoadingWorkspaces: boolean;
  isSavingRequest: boolean;

  setActiveRequest: (req: Partial<ApiRequest>) => void;
  setUrl: (url: string) => void;
  updateHeader: (id: string, field: keyof KeyValuePair, value: string | boolean) => void;
  addHeader: () => void;
  removeHeader: (id: string) => void;
  updateQueryParam: (id: string, field: keyof KeyValuePair, value: string | boolean) => void;
  addQueryParam: () => void;
  removeQueryParam: (id: string) => void;
  setAuth: (auth: Partial<AuthConfig>) => void;
  
  fetchWorkspaces: () => Promise<void>;
  saveRequestToDb: (name?: string) => Promise<ApiRequest | null>;
  deleteRequestFromDb: (id: string) => Promise<boolean>;
  loadSavedRequest: (req: ApiRequest) => void;
  createNewRequest: () => void;
}

const defaultAuth: AuthConfig = {
  type: 'none',
  bearerToken: '',
  basicUsername: '',
  basicPassword: '',
  apiKeyName: 'X-API-Key',
  apiKeyValue: '',
  apiKeyAddTo: 'header',
};

const defaultRequest: ApiRequest = {
  id: 'new',
  name: 'Untitled Request',
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
  queryParams: [],
  auth: defaultAuth,
  body: '{\n  \n}',
};

// Helper to rebuild URL with enabled query parameters
export function buildUrlWithParams(baseUrl: string, params: KeyValuePair[], auth?: AuthConfig): string {
  if (!baseUrl) return '';
  try {
    const hasProtocol = baseUrl.includes('://');
    const dummyPrefix = hasProtocol ? '' : 'http://';
    const parsed = new URL(dummyPrefix + baseUrl);
    
    // Clear search and rebuild from params array
    parsed.search = '';
    const searchParams = new URLSearchParams();

    params.forEach(p => {
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

// Helper to parse query parameters from a raw URL string
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

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeRequest: defaultRequest,
  workspaces: [],
  savedRequests: [],
  isLoadingWorkspaces: false,
  isSavingRequest: false,

  setActiveRequest: (req) =>
    set((state) => ({ activeRequest: { ...state.activeRequest, ...req } })),

  setUrl: (url: string) => {
    const currentParams = get().activeRequest.queryParams;
    // Extract query params from new URL
    const extractedParams = parseParamsFromUrl(url);
    
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        url,
        // If the URL has query params, synchronize them into the table
        queryParams: extractedParams.length > 0 ? extractedParams : currentParams,
      },
    }));
  },

  updateHeader: (id, field, value) =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        headers: state.activeRequest.headers.map((h) =>
          h.id === id ? { ...h, [field]: value } : h
        ),
      },
    })),

  addHeader: () =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        headers: [
          ...state.activeRequest.headers,
          { id: Date.now().toString(), key: '', value: '', enabled: true },
        ],
      },
    })),

  removeHeader: (id) =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        headers: state.activeRequest.headers.filter((h) => h.id !== id),
      },
    })),

  updateQueryParam: (id, field, value) => {
    const currentReq = get().activeRequest;
    const updatedParams = currentReq.queryParams.map((q) =>
      q.id === id ? { ...q, [field]: value } : q
    );
    const newUrl = buildUrlWithParams(currentReq.url, updatedParams, currentReq.auth);

    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        queryParams: updatedParams,
        url: newUrl,
      },
    }));
  },

  addQueryParam: () =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        queryParams: [
          ...state.activeRequest.queryParams,
          { id: Date.now().toString(), key: '', value: '', enabled: true },
        ],
      },
    })),

  removeQueryParam: (id) => {
    const currentReq = get().activeRequest;
    const updatedParams = currentReq.queryParams.filter((q) => q.id !== id);
    const newUrl = buildUrlWithParams(currentReq.url, updatedParams, currentReq.auth);

    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        queryParams: updatedParams,
        url: newUrl,
      },
    }));
  },

  setAuth: (authUpdate) =>
    set((state) => {
      const newAuth = { ...state.activeRequest.auth, ...authUpdate };
      const newUrl = buildUrlWithParams(state.activeRequest.url, state.activeRequest.queryParams, newAuth);
      return {
        activeRequest: {
          ...state.activeRequest,
          auth: newAuth,
          url: newUrl,
        },
      };
    }),

  fetchWorkspaces: async () => {
    set({ isLoadingWorkspaces: true });
    try {
      const res = await api.get('/workspace');
      const workspaces: Workspace[] = res.data;
      const allRequests = workspaces.flatMap((w) =>
        (w.requests || []).map((r: ApiRequest) => ({
          ...r,
          headers: Array.isArray(r.headers) ? r.headers : [],
          queryParams: Array.isArray(r.queryParams) ? r.queryParams : [],
          auth: r.auth || defaultAuth,
        }))
      );
      set({ workspaces, savedRequests: allRequests });
    } catch {
      // Ignore or let error interceptor handle
    } finally {
      set({ isLoadingWorkspaces: false });
    }
  },

  saveRequestToDb: async (name) => {
    set({ isSavingRequest: true });
    const { activeRequest, workspaces } = get();
    const reqName = name || activeRequest.name || 'Untitled Request';
    const workspaceId = activeRequest.workspaceId || workspaces[0]?.id;

    try {
      const payload = {
        id: activeRequest.id === 'new' ? undefined : activeRequest.id,
        workspaceId,
        name: reqName,
        method: activeRequest.method,
        url: activeRequest.url,
        headers: activeRequest.headers,
        queryParams: activeRequest.queryParams,
        body: activeRequest.body,
      };

      const res = await api.post('/workspace/request', payload);
      const saved: ApiRequest = {
        ...res.data,
        headers: Array.isArray(res.data.headers) ? res.data.headers : activeRequest.headers,
        queryParams: Array.isArray(res.data.queryParams) ? res.data.queryParams : activeRequest.queryParams,
        auth: activeRequest.auth,
      };

      set((state) => {
        const existingIdx = state.savedRequests.findIndex((r) => r.id === saved.id);
        const updatedList = existingIdx >= 0
          ? state.savedRequests.map((r) => (r.id === saved.id ? saved : r))
          : [saved, ...state.savedRequests];
        
        return {
          activeRequest: { ...saved, auth: state.activeRequest.auth },
          savedRequests: updatedList,
        };
      });

      return saved;
    } finally {
      set({ isSavingRequest: false });
    }
  },

  deleteRequestFromDb: async (id: string) => {
    try {
      await api.delete(`/workspace/request/${id}`);
      set((state) => ({
        savedRequests: state.savedRequests.filter((r) => r.id !== id),
        activeRequest: state.activeRequest.id === id ? defaultRequest : state.activeRequest,
      }));
      return true;
    } catch {
      return false;
    }
  },

  loadSavedRequest: (req: ApiRequest) => {
    set({
      activeRequest: {
        ...req,
        headers: Array.isArray(req.headers) && req.headers.length > 0 ? req.headers : defaultRequest.headers,
        queryParams: Array.isArray(req.queryParams) ? req.queryParams : [],
        auth: req.auth || defaultAuth,
        body: req.body || '{\n  \n}',
      },
    });
  },

  createNewRequest: () => {
    set({
      activeRequest: {
        ...defaultRequest,
        id: 'new',
        name: 'Untitled Request',
      },
    });
  },
}));
