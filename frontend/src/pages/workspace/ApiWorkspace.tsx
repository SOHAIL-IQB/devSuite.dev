import { useState } from 'react';
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
import { Play, Loader2, Save, Trash2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ApiWorkspace() {
  const { theme } = useThemeStore();
  const { activeRequest, setActiveRequest, updateHeader, addHeader, removeHeader } = useWorkspaceStore();
  
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);
    try {
      const headersObject = activeRequest.headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

      const res = await api.post('/workspace/proxy', {
        url: activeRequest.url,
        method: activeRequest.method,
        headers: headersObject,
        body: activeRequest.body || undefined,
      });
      setResponse(res.data);
    } catch (err: any) {
      setResponse(err.response?.data || { error: 'Failed to connect to proxy' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-500 hover:bg-green-600';
    if (status >= 300 && status < 400) return 'bg-yellow-500 hover:bg-yellow-600';
    if (status >= 400 && status < 500) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border bg-background">
      {/* LEFT SIDEBAR: History / Saved */}
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-sm">Collections</span>
          <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="w-4 h-4" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 text-sm text-muted-foreground">
            No saved requests yet.
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* MAIN CONTENT */}
      <ResizablePanel defaultSize={80} className="flex flex-col h-full overflow-hidden">
        
        {/* URL BAR */}
        <div className="flex items-center space-x-2 p-3 border-b bg-card">
          <Select 
            value={activeRequest.method} 
            onValueChange={(val) => setActiveRequest({ method: val })}
          >
            <SelectTrigger className="w-[120px] font-semibold">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET" className="text-blue-500 font-semibold">GET</SelectItem>
              <SelectItem value="POST" className="text-green-500 font-semibold">POST</SelectItem>
              <SelectItem value="PUT" className="text-orange-500 font-semibold">PUT</SelectItem>
              <SelectItem value="PATCH" className="text-yellow-500 font-semibold">PATCH</SelectItem>
              <SelectItem value="DELETE" className="text-red-500 font-semibold">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            className="flex-1 font-mono text-sm" 
            placeholder="Enter Request URL" 
            value={activeRequest.url}
            onChange={(e) => setActiveRequest({ url: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={isLoading} className="w-24">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Send</>}
          </Button>
          <Button variant="outline" size="icon">
            <Save className="w-4 h-4" />
          </Button>
        </div>

        {/* EDITOR & RESPONSE SPLIT */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          
          {/* REQUEST EDITOR */}
          <ResizablePanel defaultSize={50} className="flex flex-col">
            <Tabs defaultValue="body" className="flex-1 flex flex-col">
              <div className="px-3 border-b flex items-center justify-between">
                <TabsList className="bg-transparent h-12 gap-2">
                  <TabsTrigger value="params" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Params</TabsTrigger>
                  <TabsTrigger value="headers" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Headers</TabsTrigger>
                  <TabsTrigger value="auth" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Auth</TabsTrigger>
                  <TabsTrigger value="body" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Body</TabsTrigger>
                </TabsList>
              </div>

              {/* BODY TAB */}
              <TabsContent value="body" className="flex-1 mt-0 data-[state=active]:flex flex-col">
                <div className="p-2 border-b text-xs text-muted-foreground flex items-center space-x-2">
                  <span>Raw (JSON)</span>
                </div>
                <div className="flex-1 min-h-[200px]">
                  <Editor
                    height="100%"
                    language="json"
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    value={activeRequest.body}
                    onChange={(val) => setActiveRequest({ body: val || '' })}
                    options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                  />
                </div>
              </TabsContent>

              {/* HEADERS TAB */}
              <TabsContent value="headers" className="flex-1 mt-0 p-4">
                <div className="space-y-2">
                  {activeRequest.headers.map((h) => (
                    <div key={h.id} className="flex items-center space-x-2">
                      <Input 
                        placeholder="Key" 
                        value={h.key} 
                        onChange={(e) => updateHeader(h.id, 'key', e.target.value)} 
                        className="w-1/3"
                      />
                      <Input 
                        placeholder="Value" 
                        value={h.value} 
                        onChange={(e) => updateHeader(h.id, 'value', e.target.value)} 
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeHeader(h.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addHeader} className="mt-2">
                    <Plus className="w-4 h-4 mr-2" /> Add Header
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="params" className="flex-1 mt-0 p-4 text-muted-foreground text-sm">
                Query parameters implementation here.
              </TabsContent>
              <TabsContent value="auth" className="flex-1 mt-0 p-4 text-muted-foreground text-sm">
                Authentication (Bearer, Basic) implementation here.
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RESPONSE VIEWER */}
          <ResizablePanel defaultSize={50} className="flex flex-col bg-muted/10">
            <div className="h-12 border-b flex items-center justify-between px-4 bg-muted/20">
              <span className="font-semibold text-sm">Response</span>
              {response && (
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(response.status)}>{response.status || 'ERROR'} {response.statusText}</Badge>
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-mono text-green-500">{response.timeMs} ms</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-[200px]">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : response ? (
                <Editor
                  height="100%"
                  language="json"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={JSON.stringify(response.data || response.error, null, 2)}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  Hit Send to get a response
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
