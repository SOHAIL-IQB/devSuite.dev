import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;
  
  // Actions
  createEnvironment: (name: string) => string;
  deleteEnvironment: (id: string) => void;
  renameEnvironment: (id: string, name: string) => void;
  setActiveEnvironmentId: (id: string | null) => void;
  addVariable: (envId: string) => void;
  updateVariable: (envId: string, varId: string, updates: Partial<EnvVariable>) => void;
  removeVariable: (envId: string, varId: string) => void;
  
  // Helper
  getActiveVariables: () => Record<string, string>;
  resolveVariables: (input: string) => string;
}

const DEFAULT_ENVIRONMENTS: Environment[] = [
  {
    id: 'default-local',
    name: 'Local Development',
    variables: [
      { id: '1', key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
      { id: '2', key: 'apiVersion', value: 'v1', enabled: true },
    ],
  },
  {
    id: 'default-prod',
    name: 'Production',
    variables: [
      { id: '1', key: 'baseUrl', value: 'https://api.devsuite.dev', enabled: true },
      { id: '2', key: 'apiVersion', value: 'v1', enabled: true },
    ],
  },
];

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: DEFAULT_ENVIRONMENTS,
      activeEnvironmentId: 'default-local',

      createEnvironment: (name: string) => {
        const id = 'env-' + Math.random().toString(36).substr(2, 9);
        const newEnv: Environment = {
          id,
          name: name.trim() || 'New Environment',
          variables: [
            { id: '1', key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
          ],
        };
        set((state) => ({
          environments: [...state.environments, newEnv],
          activeEnvironmentId: id,
        }));
        return id;
      },

      deleteEnvironment: (id: string) => {
        set((state) => {
          const filtered = state.environments.filter((e) => e.id !== id);
          return {
            environments: filtered,
            activeEnvironmentId: state.activeEnvironmentId === id ? (filtered[0]?.id || null) : state.activeEnvironmentId,
          };
        });
      },

      renameEnvironment: (id: string, name: string) => {
        set((state) => ({
          environments: state.environments.map((e) =>
            e.id === id ? { ...e, name: name.trim() || e.name } : e
          ),
        }));
      },

      setActiveEnvironmentId: (id: string | null) => {
        set({ activeEnvironmentId: id });
      },

      addVariable: (envId: string) => {
        set((state) => ({
          environments: state.environments.map((env) => {
            if (env.id !== envId) return env;
            return {
              ...env,
              variables: [
                ...env.variables,
                { id: Math.random().toString(36).substr(2, 9), key: '', value: '', enabled: true },
              ],
            };
          }),
        }));
      },

      updateVariable: (envId: string, varId: string, updates: Partial<EnvVariable>) => {
        set((state) => ({
          environments: state.environments.map((env) => {
            if (env.id !== envId) return env;
            return {
              ...env,
              variables: env.variables.map((v) =>
                v.id === varId ? { ...v, ...updates } : v
              ),
            };
          }),
        }));
      },

      removeVariable: (envId: string, varId: string) => {
        set((state) => ({
          environments: state.environments.map((env) => {
            if (env.id !== envId) return env;
            return {
              ...env,
              variables: env.variables.filter((v) => v.id !== varId),
            };
          }),
        }));
      },

      getActiveVariables: () => {
        const { environments, activeEnvironmentId } = get();
        if (!activeEnvironmentId) return {};
        const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
        if (!activeEnv) return {};

        const map: Record<string, string> = {};
        activeEnv.variables
          .filter((v) => v.enabled && v.key.trim())
          .forEach((v) => {
            map[v.key.trim()] = v.value;
          });
        return map;
      },

      resolveVariables: (input: string) => {
        if (!input || typeof input !== 'string') return input;
        const vars = get().getActiveVariables();
        let result = input;
        
        // Replaces {{variableName}} with its value
        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
          result = result.replace(regex, val);
        }
        return result;
      },
    }),
    {
      name: 'devsuite_environment_store',
    }
  )
);
