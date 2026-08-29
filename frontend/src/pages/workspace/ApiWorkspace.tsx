import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { api } from '@/lib/api';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Loader2, 
  Save, 
  Trash2, 
  Plus, 
  Send, 
  Folder, 
  FileCode, 
  Copy, 
  Lock, 
  Key, 
  User, 
  SlidersHorizontal,
  Upload,
  Download
} from 'lucide-react';
import { generateCurl, parseCurl } from '@/lib/curl.utils';
import { parseOpenApi, parsePostmanCollection, exportToOpenApi } from '@/lib/openapi.utils';

export function ApiWorkspace() {
  const { theme } = useThemeStore();
  const { 
    activeRequest, 
    savedRequests,
    isLoadingWorkspaces,
    setActiveRequest, 
    setUrl,
    updateHeader, 
    addHeader, 
    removeHeader,
    updateQueryParam,
    addQueryParam,
    removeQueryParam,
    setAuth,
    fetchWorkspaces,
    saveRequestToDb,
    deleteRequestFromDb,
    loadSavedRequest,
    createNewRequest
  } = useWorkspaceStore();
  
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Dialogs
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState(activeRequest.name || 'My Request');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'curl' | 'openapi' | 'postman'>('curl');
  const [importInput, setImportInput] = useState('');

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleEditorWillMount = (monacoInstance: any) => {
    monacoInstance.editor.defineTheme('devworkspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#09090b',
        'editor.lineHighlightBackground': '#18181b',
        'editorLineNumber.foreground': '#52525b',
        'editorIndentGuide.background': '#27272a',
        'editorSuggestWidget.background': '#09090b',
        'editorSuggestWidget.border': '#27272a',
      },
    });
    monacoInstance.editor.defineTheme('devworkspace-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f4f4f5',
        'editorLineNumber.foreground': '#a1a1aa',
        'editorIndentGuide.background': '#e4e4e7',
      },
    });
  };

  const handleSend = async () => {
    if (!activeRequest.url || !activeRequest.url.trim()) {
      toast.error('Please enter a request URL');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      // 1. Build Headers including Auth headers
      const headersObject: Record<string, string> = {};

      activeRequest.headers
        .filter(h => h.enabled && h.key.trim())
        .forEach(h => {
          headersObject[h.key.trim()] = h.value;
        });

      // Inject Auth into headers if configured
      if (activeRequest.auth) {
        if (activeRequest.auth.type === 'bearer' && activeRequest.auth.bearerToken.trim()) {
          headersObject['Authorization'] = `Bearer ${activeRequest.auth.bearerToken.trim()}`;
        } else if (activeRequest.auth.type === 'basic' && (activeRequest.auth.basicUsername || activeRequest.auth.basicPassword)) {
          const credentials = btoa(`${activeRequest.auth.basicUsername}:${activeRequest.auth.basicPassword}`);
          headersObject['Authorization'] = `Basic ${credentials}`;
        } else if (activeRequest.auth.type === 'apiKey' && activeRequest.auth.apiKeyAddTo === 'header' && activeRequest.auth.apiKeyName.trim()) {
          headersObject[activeRequest.auth.apiKeyName.trim()] = activeRequest.auth.apiKeyValue;
        }
      }

      const res = await api.post('/workspace/proxy', {
        url: activeRequest.url,
        method: activeRequest.method,
        headers: Object.keys(headersObject).length > 0 ? headersObject : undefined,
        body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(activeRequest.method) ? (activeRequest.body || undefined) : undefined,
      });

      setResponse(res.data);
      toast.success(`Request completed (${res.data.status} ${res.data.statusText || 'OK'})`);
    } catch (err: unknown) {
      let errorMsg = 'Proxy request failed';
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as { response?: { data?: { error?: string } } }).response?.data;
        if (responseData?.error) {
          errorMsg = responseData.error;
        }
      }
      toast.error(errorMsg);
      setResponse({
        status: 500,
        statusText: 'Error',
        data: { error: errorMsg },
        headers: {},
        timeMs: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = () => {
    setSaveName(activeRequest.name || 'Untitled Request');
    setSaveModalOpen(true);
  };

  const handleSaveConfirm = async () => {
    try {
      await saveRequestToDb(saveName);
      toast.success('Request saved to workspace');
      setSaveModalOpen(false);
    } catch {
      toast.error('Failed to save request');
    }
  };

  const handleDeleteRequest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved request?')) return;
    const ok = await deleteRequestFromDb(id);
    if (ok) {
      toast.success('Request deleted');
    } else {
      toast.error('Failed to delete request');
    }
  };

  const handleCopyCurl = () => {
    const curl = generateCurl(activeRequest);
    navigator.clipboard.writeText(curl);
    toast.success('cURL command copied to clipboard');
  };

  const handleExecuteImport = async () => {
    if (!importInput.trim()) {
      toast.error('Please enter specification or snippet to import');
      return;
    }

    try {
      if (importTab === 'curl') {
        const parsed = parseCurl(importInput);
        if (!parsed) {
          toast.error('Invalid cURL command format');
          return;
        }
        setActiveRequest(parsed);
        toast.success('cURL command imported');
      } else if (importTab === 'openapi') {
        const endpoints = parseOpenApi(importInput);
        if (endpoints.length === 0) {
          toast.error('No endpoints found in OpenAPI specification');
          return;
        }
        // Load the first endpoint into active request
        setActiveRequest(endpoints[0]);
        // Save all endpoints to collection
        for (const ep of endpoints) {
          await api.post('/workspace/request', {
            name: ep.name,
            method: ep.method,
            url: ep.url,
            headers: ep.headers,
            queryParams: ep.queryParams,
            body: ep.body,
          });
        }
        await fetchWorkspaces();
        toast.success(`Imported ${endpoints.length} endpoints from OpenAPI specification`);
      } else if (importTab === 'postman') {
        const endpoints = parsePostmanCollection(importInput);
        if (endpoints.length === 0) {
          toast.error('No requests found in Postman Collection');
          return;
        }
        setActiveRequest(endpoints[0]);
        for (const ep of endpoints) {
          await api.post('/workspace/request', {
            name: ep.name,
            method: ep.method,
            url: ep.url,
            headers: ep.headers,
            queryParams: ep.queryParams,
            body: ep.body,
          });
        }
        await fetchWorkspaces();
        toast.success(`Imported ${endpoints.length} requests from Postman Collection`);
      }

      setImportModalOpen(false);
      setImportInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      toast.error(msg);
    }
  };

  const handleExportOpenApi = () => {
    const listToExport = savedRequests.length > 0 ? savedRequests : [activeRequest];
    const openApiJson = exportToOpenApi(listToExport);
    const blob = new Blob([openApiJson], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `openapi-collection-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(href);
    toast.success('OpenAPI specification exported');
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-500 hover:bg-green-600';
    if (status >= 300 && status < 400) return 'bg-yellow-500 hover:bg-yellow-600';
    if (status >= 400 && status < 500) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'POST': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'PUT': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'PATCH': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'DELETE': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    }
  };

  return (
    <div className="h-full w-full bg-muted/10 p-2 overflow-hidden flex flex-col min-h-0">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
        
        {/* SAVED REQUESTS SIDEBAR */}
        {showSidebar && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col bg-background rounded-lg border shadow-sm mr-2 overflow-hidden min-h-0">
              <div className="p-3 border-b bg-muted/5 flex items-center justify-between shrink-0 h-14">
                <div className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Collections</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={createNewRequest} title="New Request">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 mac-scrollbar">
                {isLoadingWorkspaces ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading collections...
                  </div>
                ) : savedRequests.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-10 px-4">
                    <FileCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No saved requests</p>
                    <p className="text-[11px] opacity-70 mt-1">Configure an API request and click Save to store it here.</p>
                  </div>
                ) : (
                  savedRequests.map((req) => {
                    const isSelected = activeRequest.id === req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => loadSavedRequest(req)}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getMethodBadgeColor(req.method)}`}>
                            {req.method}
                          </span>
                          <span className="text-xs truncate">{req.name || 'Untitled'}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                          onClick={(e) => handleDeleteRequest(req.id, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
          </>
        )}

        {/* MAIN WORKSPACE CONTENT */}
        <ResizablePanel defaultSize={showSidebar ? 80 : 100} className="flex flex-col h-full overflow-hidden bg-background rounded-lg border shadow-sm min-h-0">
          
          {/* URL BAR - POSTMAN STYLE */}
          <div className="flex items-center p-3 border-b bg-background gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 text-muted-foreground"
              onClick={() => setShowSidebar(!showSidebar)}
              title="Toggle Collections Sidebar"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>

            <div className="flex flex-1 items-center bg-muted/20 border rounded-lg focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all shadow-sm overflow-hidden h-11">
              <Select 
                value={activeRequest.method} 
                onValueChange={(val) => setActiveRequest({ method: val })}
              >
                <SelectTrigger className="w-[110px] border-0 bg-transparent shadow-none focus:ring-0 text-[13px] font-bold tracking-wide h-full rounded-none hover:bg-muted/50 transition-colors">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET" className="text-blue-500 font-bold text-[13px]">GET</SelectItem>
                  <SelectItem value="POST" className="text-green-500 font-bold text-[13px]">POST</SelectItem>
                  <SelectItem value="PUT" className="text-orange-500 font-bold text-[13px]">PUT</SelectItem>
                  <SelectItem value="PATCH" className="text-yellow-500 font-bold text-[13px]">PATCH</SelectItem>
                  <SelectItem value="DELETE" className="text-red-500 font-bold text-[13px]">DELETE</SelectItem>
                  <SelectItem value="HEAD" className="text-purple-500 font-bold text-[13px]">HEAD</SelectItem>
                  <SelectItem value="OPTIONS" className="text-indigo-500 font-bold text-[13px]">OPTIONS</SelectItem>
                </SelectContent>
              </Select>
              <div className="w-px h-6 bg-border mx-1" />
              <Input 
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-[13px] px-3 h-full placeholder:text-muted-foreground/50" 
                placeholder="https://api.example.com/v1/users" 
                value={activeRequest.url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button 
                onClick={handleSend} 
                disabled={isLoading} 
                className="h-full rounded-none px-6 font-semibold tracking-wide border-l bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send</>}
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-11 w-11 rounded-lg shrink-0 shadow-sm text-muted-foreground hover:text-foreground"
              onClick={handleSaveClick}
              title="Save Request"
            >
              <Save className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-11 px-3 rounded-lg shrink-0 text-xs font-mono hidden sm:flex items-center gap-1.5 shadow-sm"
              onClick={handleCopyCurl}
              title="Copy as cURL command"
            >
              <Copy className="w-3.5 h-3.5" /> cURL
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-11 px-3 rounded-lg shrink-0 text-xs font-medium hidden sm:flex items-center gap-1.5 shadow-sm"
              onClick={() => setImportModalOpen(true)}
              title="Import cURL, OpenAPI, or Postman"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-11 px-3 rounded-lg shrink-0 text-xs font-medium hidden sm:flex items-center gap-1.5 shadow-sm"
              onClick={handleExportOpenApi}
              title="Export Collection as OpenAPI 3.0"
            >
              <Download className="w-3.5 h-3.5" /> Export OpenAPI
            </Button>
          </div>

          {/* EDITOR & RESPONSE SPLIT */}
          <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
            
            {/* REQUEST EDITOR */}
            <ResizablePanel defaultSize={50} minSize={25} className="flex flex-col bg-background min-h-0">
              <Tabs defaultValue="params" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 border-b bg-muted/5 shrink-0 flex items-center justify-between">
                  <TabsList className="bg-transparent h-10 gap-6 p-0 justify-start">
                    <TabsTrigger value="params" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all flex items-center gap-1.5">
                      Params {activeRequest.queryParams.filter(q => q.enabled && q.key).length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </TabsTrigger>
                    <TabsTrigger value="headers" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all flex items-center gap-1.5">
                      Headers {activeRequest.headers.filter(h => h.enabled && h.key).length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </TabsTrigger>
                    <TabsTrigger value="auth" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all flex items-center gap-1.5">
                      Auth {activeRequest.auth && activeRequest.auth.type !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </TabsTrigger>
                    <TabsTrigger value="body" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all">
                      Body
                    </TabsTrigger>
                  </TabsList>
                  <span className="text-[11px] font-mono text-muted-foreground/60">{activeRequest.name || 'Untitled Request'}</span>
                </div>

                {/* PARAMS TAB */}
                <TabsContent value="params" className="flex-1 mt-0 p-4 overflow-y-auto mac-scrollbar min-h-0">
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Query Parameters</span>
                      <span>{activeRequest.queryParams.filter(q => q.enabled && q.key).length} active</span>
                    </div>

                    {activeRequest.queryParams.length === 0 ? (
                      <div className="text-xs text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                        No query parameters configured.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeRequest.queryParams.map((q) => (
                          <div key={q.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={q.enabled}
                              onChange={(e) => updateQueryParam(q.id, 'enabled', e.target.checked)}
                              className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                            />
                            <Input 
                              placeholder="Key" 
                              value={q.key} 
                              onChange={(e) => updateQueryParam(q.id, 'key', e.target.value)} 
                              className="w-1/3 font-mono text-xs"
                            />
                            <Input 
                              placeholder="Value" 
                              value={q.value} 
                              onChange={(e) => updateQueryParam(q.id, 'value', e.target.value)} 
                              className="flex-1 font-mono text-xs"
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeQueryParam(q.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button variant="outline" size="sm" onClick={addQueryParam} className="text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Parameter
                    </Button>
                  </div>
                </TabsContent>

                {/* HEADERS TAB */}
                <TabsContent value="headers" className="flex-1 mt-0 p-4 overflow-y-auto mac-scrollbar min-h-0">
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>HTTP Headers</span>
                      <span>{activeRequest.headers.filter(h => h.enabled && h.key).length} active</span>
                    </div>

                    <div className="space-y-2">
                      {activeRequest.headers.map((h) => (
                        <div key={h.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={h.enabled}
                            onChange={(e) => updateHeader(h.id, 'enabled', e.target.checked)}
                            className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                          />
                          <Input 
                            placeholder="Header Key (e.g. Accept)" 
                            value={h.key} 
                            onChange={(e) => updateHeader(h.id, 'key', e.target.value)} 
                            className="w-1/3 font-mono text-xs"
                          />
                          <Input 
                            placeholder="Header Value" 
                            value={h.value} 
                            onChange={(e) => updateHeader(h.id, 'value', e.target.value)} 
                            className="flex-1 font-mono text-xs"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeHeader(h.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={addHeader} className="text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Header
                    </Button>
                  </div>
                </TabsContent>

                {/* AUTH TAB */}
                <TabsContent value="auth" className="flex-1 mt-0 p-6 overflow-y-auto mac-scrollbar min-h-0">
                  <div className="max-w-2xl space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-semibold text-muted-foreground">Authentication Type</Label>
                      <Select 
                        value={activeRequest.auth?.type || 'none'} 
                        onValueChange={(val: any) => setAuth({ type: val })}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select Auth Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Auth</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="apiKey">API Key</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {activeRequest.auth?.type === 'bearer' && (
                      <div className="space-y-3 bg-muted/20 border p-4 rounded-lg">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-primary" /> Bearer Token
                        </Label>
                        <Input 
                          placeholder="eyJhbGciOi..." 
                          value={activeRequest.auth.bearerToken || ''}
                          onChange={(e) => setAuth({ bearerToken: e.target.value })}
                          className="font-mono text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">Appends `Authorization: Bearer &lt;token&gt;` header automatically.</p>
                      </div>
                    )}

                    {activeRequest.auth?.type === 'basic' && (
                      <div className="space-y-4 bg-muted/20 border p-4 rounded-lg">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" /> Username
                          </Label>
                          <Input 
                            placeholder="Username" 
                            value={activeRequest.auth.basicUsername || ''}
                            onChange={(e) => setAuth({ basicUsername: e.target.value })}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-primary" /> Password
                          </Label>
                          <Input 
                            type="password"
                            placeholder="Password" 
                            value={activeRequest.auth.basicPassword || ''}
                            onChange={(e) => setAuth({ basicPassword: e.target.value })}
                            className="text-xs"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">Appends `Authorization: Basic &lt;base64&gt;` header automatically.</p>
                      </div>
                    )}

                    {activeRequest.auth?.type === 'apiKey' && (
                      <div className="space-y-4 bg-muted/20 border p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Key Name</Label>
                            <Input 
                              placeholder="X-API-Key" 
                              value={activeRequest.auth.apiKeyName || ''}
                              onChange={(e) => setAuth({ apiKeyName: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Key Value</Label>
                            <Input 
                              placeholder="Secret API Value" 
                              value={activeRequest.auth.apiKeyValue || ''}
                              onChange={(e) => setAuth({ apiKeyValue: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Add To</Label>
                          <Select 
                            value={activeRequest.auth.apiKeyAddTo || 'header'} 
                            onValueChange={(val: any) => setAuth({ apiKeyAddTo: val })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Add to" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="header">Header</SelectItem>
                              <SelectItem value="query">Query Params</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* BODY TAB */}
                <TabsContent value="body" className="flex-1 mt-0 data-[state=active]:flex flex-col h-full bg-background min-h-0">
                  <div className="p-2.5 border-b text-[12px] text-muted-foreground flex items-center justify-between bg-background shrink-0">
                    <span className="font-medium tracking-wide">Raw JSON Payload</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[11px]"
                      onClick={() => {
                        try {
                          const formatted = JSON.stringify(JSON.parse(activeRequest.body || '{}'), null, 2);
                          setActiveRequest({ body: formatted });
                        } catch {
                          toast.error('Invalid JSON');
                        }
                      }}
                    >
                      Beautify JSON
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 bg-background relative">
                    <Editor
                      height="100%"
                      language="json"
                      theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
                      value={activeRequest.body}
                      onChange={(val) => setActiveRequest({ body: val || '' })}
                      beforeMount={handleEditorWillMount}
                      options={{ 
                        minimap: { enabled: false }, 
                        fontSize: 13, 
                        scrollBeyondLastLine: false, 
                        lineNumbersMinChars: 4, 
                        padding: { top: 16, bottom: 16 }, 
                        scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 } 
                      }}
                      className="absolute inset-0"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </ResizablePanel>

            <ResizableHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />

            {/* RESPONSE VIEWER */}
            <ResizablePanel defaultSize={50} minSize={25} className="flex flex-col bg-background min-h-0">
              <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/5 shrink-0">
                <span className="font-semibold text-[11px] tracking-widest uppercase text-muted-foreground">Response</span>
                {response && (
                  <div className="flex items-center space-x-3 text-[12px] font-medium">
                    {response.status ? (
                      <div className="flex items-center space-x-1.5 bg-muted/30 px-2 py-0.5 rounded-md border">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={`${getStatusColor(response.status)} px-1.5 py-0 rounded-[4px] shadow-none h-4 text-[10px]`}>
                          {response.status} {response.statusText}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] h-5">ERROR</Badge>
                    )}
                    {response.timeMs !== undefined && (
                      <div className="flex items-center space-x-1.5 bg-muted/30 px-2 py-0.5 rounded-md border">
                        <span className="text-muted-foreground">Time</span>
                        <span className="text-green-500 font-mono tracking-tight">{response.timeMs}ms</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 relative bg-background">
                {isLoading ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground space-y-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                    <span className="text-[13px] font-medium tracking-wide">Sending Request via Secure Proxy...</span>
                  </div>
                ) : response ? (
                  <Editor
                    height="100%"
                    language={typeof response.data === 'object' ? 'json' : 'plaintext'}
                    theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
                    value={
                      response.data 
                        ? (typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data))
                        : JSON.stringify(response, null, 2)
                    }
                    beforeMount={handleEditorWillMount}
                    options={{ 
                      readOnly: true, 
                      minimap: { enabled: false }, 
                      fontSize: 13, 
                      scrollBeyondLastLine: false, 
                      lineNumbersMinChars: 4, 
                      padding: { top: 16, bottom: 16 }, 
                      scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 } 
                    }}
                    className="absolute inset-0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50 space-y-3">
                    <Send className="w-8 h-8 stroke-[1.5]" />
                    <span className="text-[13px] font-medium tracking-wide">Enter a URL and click Send to inspect response</span>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* SAVE REQUEST MODAL */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Request to Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Request Name</Label>
              <Input 
                value={saveName} 
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Get User Profile" 
                autoFocus
              />
            </div>
            <div className="text-xs font-mono text-muted-foreground bg-muted/40 p-2.5 rounded border">
              <span className="font-bold text-primary mr-2">{activeRequest.method}</span>
              <span>{activeRequest.url}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfirm}>Save to Collections</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNIFIED MULTI-FORMAT IMPORT MODAL */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Import API Request / Collection
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <Tabs value={importTab} onValueChange={(val: any) => setImportTab(val)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="curl">cURL Command</TabsTrigger>
                <TabsTrigger value="openapi">OpenAPI 3.0 / Swagger</TabsTrigger>
                <TabsTrigger value="postman">Postman Collection</TabsTrigger>
              </TabsList>
            </Tabs>

            <p className="text-xs text-muted-foreground">
              {importTab === 'curl' && 'Paste a raw cURL command to populate method, URL, headers, and request body.'}
              {importTab === 'openapi' && 'Paste an OpenAPI 3.0 or Swagger 2.0 JSON / YAML specification to import all endpoints into your collection.'}
              {importTab === 'postman' && 'Paste a Postman Collection v2.1 JSON to import all collection requests.'}
            </p>

            <Textarea 
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder={
                importTab === 'curl'
                  ? "curl -X POST https://api.example.com/v1 -H 'Authorization: Bearer 123' -d '{...}'"
                  : importTab === 'openapi'
                  ? '{\n  "openapi": "3.0.0",\n  "info": { "title": "API", "version": "1.0.0" },\n  "paths": { ... }\n}'
                  : '{\n  "info": { "name": "Collection" },\n  "item": [ ... ]\n}'
              }
              className="font-mono text-xs h-44 resize-none mac-scrollbar"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExecuteImport} disabled={!importInput.trim()}>
              Import {importTab === 'curl' ? 'cURL' : importTab === 'openapi' ? 'OpenAPI' : 'Postman'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
