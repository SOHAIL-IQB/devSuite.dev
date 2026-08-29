import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '@/lib/api';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import {
  Server,
  Plus,
  Play,
  Copy,
  Trash2,
  Edit2,
  Clock,
  Loader2,
  Code2
} from 'lucide-react';

interface MockRoute {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  delayMs: number;
  headers: Record<string, string>;
  responseBody: string;
}

interface MockServer {
  id: string;
  name: string;
  routes: MockRoute[];
}

export function MockServerWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [servers, setServers] = useState<MockServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Route editor modal state
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState({
    method: 'GET',
    path: '/users',
    statusCode: 200,
    delayMs: 100,
    headers: '{\n  "Content-Type": "application/json"\n}',
    responseBody: '{\n  "success": true\n}',
  });

  // Test execution state
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fetchServers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/mock/servers');
      if (res.data?.servers) {
        setServers(res.data.servers);
        if (res.data.servers.length > 0 && !selectedServerId) {
          setSelectedServerId(res.data.servers[0].id);
          if (res.data.servers[0].routes.length > 0) {
            setSelectedRouteId(res.data.servers[0].routes[0].id);
          }
        }
      }
    } catch {
      toast.error('Failed to load mock servers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedServerId]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const activeServer = servers.find((s) => s.id === selectedServerId) || servers[0];
  const activeRoute = activeServer?.routes.find((r) => r.id === selectedRouteId) || activeServer?.routes[0];

  const handleCreateServer = async () => {
    try {
      const res = await api.post('/mock/servers', { name: 'Custom REST API' });
      if (res.data?.server) {
        setServers([...servers, res.data.server]);
        setSelectedServerId(res.data.server.id);
        toast.success('Mock server created');
      }
    } catch {
      toast.error('Failed to create server');
    }
  };

  const handleOpenRouteModal = (route?: MockRoute) => {
    if (route) {
      setEditingRouteId(route.id);
      setRouteForm({
        method: route.method,
        path: route.path,
        statusCode: route.statusCode,
        delayMs: route.delayMs,
        headers: JSON.stringify(route.headers || {}, null, 2),
        responseBody: route.responseBody,
      });
    } else {
      setEditingRouteId(null);
      setRouteForm({
        method: 'GET',
        path: '/items',
        statusCode: 200,
        delayMs: 150,
        headers: '{\n  "Content-Type": "application/json"\n}',
        responseBody: '{\n  "items": []\n}',
      });
    }
    setRouteModalOpen(true);
  };

  const handleSaveRoute = async () => {
    if (!activeServer) return;
    try {
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(routeForm.headers);
      } catch {
        toast.error('Invalid JSON headers');
        return;
      }

      if (editingRouteId) {
        await api.put(`/mock/servers/${activeServer.id}/routes/${editingRouteId}`, {
          method: routeForm.method,
          path: routeForm.path,
          statusCode: routeForm.statusCode,
          delayMs: routeForm.delayMs,
          headers: parsedHeaders,
          responseBody: routeForm.responseBody,
        });
        toast.success('Mock route updated');
      } else {
        await api.post(`/mock/servers/${activeServer.id}/routes`, {
          method: routeForm.method,
          path: routeForm.path,
          statusCode: routeForm.statusCode,
          delayMs: routeForm.delayMs,
          headers: parsedHeaders,
          responseBody: routeForm.responseBody,
        });
        toast.success('Mock route added');
      }
      setRouteModalOpen(false);
      fetchServers();
    } catch {
      toast.error('Failed to save route');
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!activeServer) return;
    try {
      await api.delete(`/mock/servers/${activeServer.id}/routes/${routeId}`);
      toast.success('Mock route deleted');
      fetchServers();
    } catch {
      toast.error('Failed to delete route');
    }
  };

  const handleExecuteTest = async () => {
    if (!activeServer || !activeRoute) return;
    setIsTesting(true);
    const start = performance.now();
    const endpointUrl = `${window.location.protocol}//${window.location.hostname}:3000/api/mock/serve/${activeServer.id}${activeRoute.path}`;

    try {
      const res = await fetch(endpointUrl, {
        method: activeRoute.method,
      });
      const latency = Math.round(performance.now() - start);
      setTestLatency(latency);
      setTestStatus(res.status);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        setTestResponse(await res.json());
      } else {
        setTestResponse(await res.text());
      }
      toast.success(`Mock response received in ${latency}ms`);
    } catch {
      toast.error('Failed to fetch mock response');
    } finally {
      setIsTesting(false);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'POST': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PUT': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'DELETE': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">Dynamic Mock REST API Sandbox</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-teal-500 border-teal-500/30">
                Live Simulator
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Define simulated endpoints, inject custom JSON schemas, and emulate network latency for frontend testing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Server Selector */}
          <Select value={selectedServerId} onValueChange={setSelectedServerId}>
            <SelectTrigger className="w-48 h-8 text-xs font-medium">
              <SelectValue placeholder="Select Server" />
            </SelectTrigger>
            <SelectContent>
              {servers.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name} ({s.routes.length} routes)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateServer}
            className="h-8 text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> New Server
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenRouteModal()}
            className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Mock Route
          </Button>
        </div>
      </div>

      {/* MAIN SPLIT: ROUTE LIST & TEST EXECUTION */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border shadow-sm">
          
          {/* LEFT: ROUTE LIST */}
          <ResizablePanel defaultSize={40} minSize={30} className="flex flex-col bg-background min-h-0">
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configured Endpoints ({activeServer?.routes.length || 0})
              </span>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 mac-scrollbar">
              {activeServer?.routes.map((route) => {
                const isSelected = selectedRouteId === route.id;
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`p-3 rounded-md cursor-pointer border transition-all text-xs flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 shadow-xs'
                        : 'bg-muted/10 border-border/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono ${getMethodBadge(route.method)}`}>
                          {route.method}
                        </span>
                        <span className="font-mono font-medium text-xs truncate max-w-[180px]">
                          {route.path}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {route.statusCode}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {route.delayMs}ms delay
                      </span>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRouteModal(route);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoute(route.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* RIGHT: INSPECTOR & RUNNER */}
          <ResizablePanel defaultSize={60} minSize={40} className="flex flex-col bg-background min-h-0">
            {activeRoute ? (
              <div className="flex flex-col h-full min-h-0">
                
                {/* ACTION BAR */}
                <div className="p-3 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${getMethodBadge(activeRoute.method)}`}>
                      {activeRoute.method}
                    </span>
                    <span className="font-mono text-xs font-semibold">{activeRoute.path}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={handleExecuteTest}
                      disabled={isTesting}
                      className="h-7 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Test Route
                    </Button>
                  </div>
                </div>

                {/* SPLIT SCHEMA & RESPONSE */}
                <div className="flex-1 grid grid-cols-2 divide-x min-h-0">
                  
                  {/* CONFIGURED SCHEMA */}
                  <div className="flex flex-col min-h-0">
                    <div className="p-2 border-b bg-muted/20 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                      <span>Mock Response Body</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          navigator.clipboard.writeText(activeRoute.responseBody);
                          toast.success('Schema copied');
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                      <Editor
                        height="100%"
                        language="json"
                        theme={isDark ? 'vs-dark' : 'vs'}
                        value={activeRoute.responseBody}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          scrollBeyondLastLine: false,
                        }}
                        className="absolute inset-0"
                      />
                    </div>
                  </div>

                  {/* LIVE TEST RESPONSE */}
                  <div className="flex flex-col min-h-0">
                    <div className="p-2 border-b bg-muted/20 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                      <span>Live Response Output</span>
                      {testStatus && (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30">
                            {testStatus} OK
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {testLatency}ms
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 relative">
                      <Editor
                        height="100%"
                        language="json"
                        theme={isDark ? 'vs-dark' : 'vs'}
                        value={
                          testResponse
                            ? typeof testResponse === 'object'
                              ? JSON.stringify(testResponse, null, 2)
                              : String(testResponse)
                            : '// Click "Test Route" to execute simulated request'
                        }
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          scrollBeyondLastLine: false,
                        }}
                        className="absolute inset-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                <Server className="w-8 h-8 stroke-[1.5]" />
                <span className="text-xs">Select or create a mock route to configure</span>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* CREATE / EDIT ROUTE MODAL */}
      <Dialog open={routeModalOpen} onOpenChange={setRouteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Code2 className="w-4 h-4 text-teal-500" />
              {editingRouteId ? 'Edit Mock Route' : 'Add Mock Route'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={routeForm.method} onValueChange={(val) => setRouteForm({ ...routeForm, method: val })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Route Path (supports :id)</Label>
                <Input
                  value={routeForm.path}
                  onChange={(e) => setRouteForm({ ...routeForm, path: e.target.value })}
                  className="font-mono text-xs h-8"
                  placeholder="/users/:id"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Status Code</Label>
                <Input
                  type="number"
                  value={routeForm.statusCode}
                  onChange={(e) => setRouteForm({ ...routeForm, statusCode: parseInt(e.target.value) || 200 })}
                  className="font-mono text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Simulated Delay (ms)</Label>
                <Input
                  type="number"
                  value={routeForm.delayMs}
                  onChange={(e) => setRouteForm({ ...routeForm, delayMs: parseInt(e.target.value) || 0 })}
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mock Response Body (JSON/Text)</Label>
              <Textarea
                value={routeForm.responseBody}
                onChange={(e) => setRouteForm({ ...routeForm, responseBody: e.target.value })}
                className="font-mono text-xs h-32 resize-none mac-scrollbar"
                placeholder='{"id": 1, "name": "Alice"}'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRouteModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveRoute} className="bg-teal-600 hover:bg-teal-700 text-white">Save Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
