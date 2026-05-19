import { create } from 'zustand';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: string;
}

interface WorkspaceState {
  activeRequest: ApiRequest;
  history: ApiRequest[];
  setActiveRequest: (req: Partial<ApiRequest>) => void;
  updateHeader: (id: string, field: keyof KeyValuePair, value: string | boolean) => void;
  addHeader: () => void;
  removeHeader: (id: string) => void;
  updateQueryParam: (id: string, field: keyof KeyValuePair, value: string | boolean) => void;
  addQueryParam: () => void;
  removeQueryParam: (id: string) => void;
}

const defaultRequest: ApiRequest = {
  id: 'new',
  name: 'Untitled Request',
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
  queryParams: [{ id: '1', key: '', value: '', enabled: false }],
  body: '{\n  \n}',
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeRequest: defaultRequest,
  history: [],
  
  setActiveRequest: (req) => 
    set((state) => ({ activeRequest: { ...state.activeRequest, ...req } })),
    
  updateHeader: (id, field, value) =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        headers: state.activeRequest.headers.map(h => h.id === id ? { ...h, [field]: value } : h)
      }
    })),
    
  addHeader: () =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        headers: [...state.activeRequest.headers, { id: Date.now().toString(), key: '', value: '', enabled: true }]
      }
    })),
    
  removeHeader: (id) =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        headers: state.activeRequest.headers.filter(h => h.id !== id)
      }
    })),

  updateQueryParam: (id, field, value) =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        queryParams: state.activeRequest.queryParams.map(q => q.id === id ? { ...q, [field]: value } : q)
      }
    })),
    
  addQueryParam: () =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        queryParams: [...state.activeRequest.queryParams, { id: Date.now().toString(), key: '', value: '', enabled: true }]
      }
    })),
    
  removeQueryParam: (id) =>
    set((state) => ({
      activeRequest: {
        ...state.activeRequest,
        queryParams: state.activeRequest.queryParams.filter(q => q.id !== id)
      }
    })),
}));
