import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Send,
  Loader2,
  Database,
  Layers,
  FileCode,
  Copy,
  Trash2,
  Plus
} from 'lucide-react';

interface HeaderItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

const SAMPLE_QUERY = `query GetCountries {
  countries(filter: { code: { in: ["US", "CA", "GB", "DE", "JP"] } }) {
    code
    name
    capital
    currency
    emoji
    languages {
      code
      name
    }
  }
}`;

const SAMPLE_VARIABLES = `{\n  \n}`;

export function GraphQLWorkspace() {
  const { theme } = useThemeStore();
  const { resolveVariables } = useEnvironmentStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [url, setUrl] = useState('https://countries.trevorblades.com/graphql');
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [variables, setVariables] = useState(SAMPLE_VARIABLES);
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
  ]);

  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeMs, setTimeMs] = useState<number | null>(null);

  // Schema Introspection
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [isIntrospecting, setIsIntrospecting] = useState(false);
  const [schemaData, setSchemaData] = useState<any>(null);

  const handleSend = async () => {
    if (!url.trim()) {
      toast.error('Please specify a GraphQL endpoint URL');
      return;
    }

    if (!query.trim()) {
      toast.error('GraphQL query cannot be empty');
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setTimeMs(null);

    try {
      let parsedVariables = {};
      if (variables.trim()) {
        try {
          parsedVariables = JSON.parse(resolveVariables(variables));
        } catch {
          toast.error('Invalid JSON format in Query Variables');
          setIsLoading(false);
          return;
        }
      }

      const headersObject: Record<string, string> = {};
      headers
        .filter((h) => h.enabled && h.key.trim())
        .forEach((h) => {
          headersObject[resolveVariables(h.key.trim())] = resolveVariables(h.value);
        });

      const payload = {
        query: resolveVariables(query),
        variables: Object.keys(parsedVariables).length > 0 ? parsedVariables : undefined,
      };

      const resolvedUrl = resolveVariables(url.trim());

      const res = await api.post('/workspace/proxy', {
        url: resolvedUrl,
        method: 'POST',
        headers: headersObject,
        body: JSON.stringify(payload),
      });

      setResponse(res.data.data);
      setTimeMs(res.data.timeMs || 0);

      if (res.data.data?.errors) {
        toast.warning('GraphQL returned query errors');
      } else {
        toast.success(`Query executed (${res.data.status} ${res.data.statusText || 'OK'})`);
      }
    } catch (err: unknown) {
      let errorMsg = 'GraphQL request failed';
      if (err && typeof err === 'object' && 'response' in err) {
        const resData = (err as { response?: { data?: { error?: string } } }).response?.data;
        if (resData?.error) errorMsg = resData.error;
      }
      toast.error(errorMsg);
      setResponse({ error: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntrospect = async () => {
    if (!url.trim()) {
      toast.error('Please enter a valid GraphQL endpoint URL');
      return;
    }

    setIsIntrospecting(true);
    try {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            subscriptionType { name }
            types {
              name
              kind
              description
            }
          }
        }
      `;

      const resolvedUrl = resolveVariables(url.trim());
      const res = await api.post('/workspace/proxy', {
        url: resolvedUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: introspectionQuery }),
      });

      if (res.data?.data?.data?.__schema) {
        setSchemaData(res.data.data.data.__schema);
        setSchemaModalOpen(true);
        toast.success('Schema introspection successful');
      } else {
        toast.error('Target endpoint does not allow schema introspection');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Introspection query failed';
      toast.error(msg);
    } finally {
      setIsIntrospecting(false);
    }
  };

  const addHeader = () => {
    setHeaders((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), key: '', value: '', enabled: true },
    ]);
  };

  const updateHeader = (id: string, updates: Partial<HeaderItem>) => {
    setHeaders((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  const removeHeader = (id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  };

  const handleCopyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    toast.success('Response JSON copied to clipboard');
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">GraphQL Workspace</h1>
            <p className="text-xs text-muted-foreground">Test GraphQL queries, inspect variables, and explore schemas.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleIntrospect}
            disabled={isIntrospecting}
            className="text-xs gap-1.5 shadow-sm"
          >
            {isIntrospecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5 text-pink-500" />}
            Introspect Schema
          </Button>
        </div>
      </div>

      {/* URL BAR & SEND ACTION */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1 flex items-center bg-muted/20 border rounded-lg overflow-hidden h-11 shadow-sm focus-within:ring-2 focus-within:ring-pink-500/30">
          <span className="px-3.5 text-xs font-mono font-bold text-pink-500 bg-muted/30 border-r h-full flex items-center">
            POST
          </span>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/graphql"
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-xs px-3.5 h-full"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={isLoading}
          className="h-11 px-6 font-semibold shrink-0 bg-pink-600 hover:bg-pink-700 text-white"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Execute Query
        </Button>
      </div>

      {/* MAIN BODY: SPLIT QUERY & RESPONSE VIEW */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border shadow-sm">
          
          {/* QUERY & VARIABLES EDITOR */}
          <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col bg-background min-h-0">
            <Tabs defaultValue="query" className="flex flex-col h-full min-h-0">
              <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
                <TabsList className="h-7 bg-muted/50 p-0.5">
                  <TabsTrigger value="query" className="text-xs h-6 px-3">Query</TabsTrigger>
                  <TabsTrigger value="variables" className="text-xs h-6 px-3">Variables</TabsTrigger>
                  <TabsTrigger value="headers" className="text-xs h-6 px-3">Headers ({headers.filter(h => h.enabled && h.key).length})</TabsTrigger>
                </TabsList>
                <div className="flex items-center space-x-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setQuery(SAMPLE_QUERY);
                      toast.success('Loaded Country Query template');
                    }}
                  >
                    Sample Template
                  </Button>
                </div>
              </div>

              <TabsContent value="query" className="flex-1 p-0 m-0 min-h-0 relative">
                <Editor
                  height="100%"
                  language="graphql"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={query}
                  onChange={(val) => setQuery(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    lineNumbersMinChars: 3,
                  }}
                  className="absolute inset-0"
                />
              </TabsContent>

              <TabsContent value="variables" className="flex-1 p-0 m-0 min-h-0 relative">
                <Editor
                  height="100%"
                  language="json"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={variables}
                  onChange={(val) => setVariables(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    lineNumbersMinChars: 3,
                  }}
                  className="absolute inset-0"
                />
              </TabsContent>

              <TabsContent value="headers" className="flex-1 p-4 m-0 overflow-y-auto space-y-2 mac-scrollbar">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HTTP Headers</span>
                  <Button size="sm" variant="outline" onClick={addHeader} className="h-7 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Header
                  </Button>
                </div>
                {headers.map((h) => (
                  <div key={h.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => updateHeader(h.id, { enabled: e.target.checked })}
                      className="rounded border-muted-foreground/30 text-primary h-4 w-4"
                    />
                    <Input
                      placeholder="Header Name"
                      value={h.key}
                      onChange={(e) => updateHeader(h.id, { key: e.target.value })}
                      className="h-8 font-mono text-xs flex-1"
                    />
                    <Input
                      placeholder="Header Value"
                      value={h.value}
                      onChange={(e) => updateHeader(h.id, { value: e.target.value })}
                      className="h-8 font-mono text-xs flex-1"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeHeader(h.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle />

          {/* RESPONSE VIEWER */}
          <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Response</span>
                {timeMs !== null && (
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {timeMs} ms
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={!response}
                onClick={handleCopyResponse}
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy JSON
              </Button>
            </div>

            <div className="flex-1 min-h-0 relative">
              {isLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                  <span className="text-xs">Executing GraphQL Query...</span>
                </div>
              ) : response ? (
                <Editor
                  height="100%"
                  language="json"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={JSON.stringify(response, null, 2)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    lineNumbersMinChars: 3,
                  }}
                  className="absolute inset-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                  <FileCode className="w-8 h-8 stroke-[1.5]" />
                  <span className="text-xs">Execute a query to inspect response</span>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* SCHEMA INTROSPECTION MODAL */}
      <Dialog open={schemaModalOpen} onOpenChange={setSchemaModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-4 h-4 text-pink-500" /> Schema Types & Directives
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 mac-scrollbar text-xs font-mono">
            {schemaData?.types ? (
              schemaData.types
                .filter((t: any) => !t.name.startsWith('__'))
                .map((t: any) => (
                  <div key={t.name} className="p-3 border rounded-lg bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{t.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{t.kind}</Badge>
                    </div>
                    {t.description && <p className="text-muted-foreground text-[11px] font-sans">{t.description}</p>}
                  </div>
                ))
            ) : (
              <p className="text-muted-foreground">No schema types available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
