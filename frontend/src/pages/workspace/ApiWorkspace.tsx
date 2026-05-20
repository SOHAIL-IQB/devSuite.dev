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
import { Loader2, Save, Trash2, Plus, FolderOpen, Send } from 'lucide-react';
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
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Collections</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-muted"><Plus className="w-4 h-4 text-foreground" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground opacity-70 h-32">
            <FolderOpen className="w-8 h-8 mb-2 stroke-[1.5]" />
            <p>No collections yet</p>
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* MAIN CONTENT */}
      <ResizablePanel defaultSize={80} className="flex flex-col h-full overflow-hidden">
        
        {/* URL BAR */}
        <div className="flex items-center space-x-3 p-4 border-b bg-background">
          <div className="flex flex-1 items-center bg-muted/30 border rounded-lg focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all shadow-sm overflow-hidden">
            <Select 
              value={activeRequest.method} 
              onValueChange={(val) => setActiveRequest({ method: val })}
            >
              <SelectTrigger className="w-[110px] border-0 bg-transparent shadow-none focus:ring-0 font-semibold tracking-wide">
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
            <div className="w-px h-6 bg-border/60 mx-1"></div>
            <Input 
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-sm px-3 placeholder:text-muted-foreground/50" 
              placeholder="https://api.example.com/v1/users" 
              value={activeRequest.url}
              onChange={(e) => setActiveRequest({ url: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>
          
          <Button onClick={handleSend} disabled={isLoading} className="w-24 shadow-sm font-medium tracking-wide">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send</>}
          </Button>
          <Button variant="outline" size="icon" className="shadow-sm">
            <Save className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* EDITOR & RESPONSE SPLIT */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          
          {/* REQUEST EDITOR */}
          <ResizablePanel defaultSize={50} className="flex flex-col">
            <Tabs defaultValue="body" className="flex-1 flex flex-col">
              <div className="px-4 border-b flex items-center justify-between bg-muted/10">
                <TabsList className="bg-transparent h-11 gap-4 p-0">
                  <TabsTrigger value="params" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-1 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all">Params</TabsTrigger>
                  <TabsTrigger value="headers" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-1 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all">Headers</TabsTrigger>
                  <TabsTrigger value="auth" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-1 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all">Auth</TabsTrigger>
                  <TabsTrigger value="body" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-1 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all">Body</TabsTrigger>
                </TabsList>
              </div>

              {/* BODY TAB */}
              <TabsContent value="body" className="flex-1 mt-0 data-[state=active]:flex flex-col h-full">
                <div className="p-3 border-b text-xs text-muted-foreground flex items-center bg-background">
                  <span className="font-medium tracking-wide">Raw (JSON)</span>
                </div>
                <div className="flex-1 min-h-0 bg-background relative">
                  <Editor
                    height="100%"
                    language="json"
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    value={activeRequest.body}
                    onChange={(val) => setActiveRequest({ body: val || '' })}
                    options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, lineNumbersMinChars: 3, padding: { top: 12, bottom: 12 } }}
                    className="absolute inset-0"
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
          <ResizablePanel defaultSize={50} className="flex flex-col bg-background">
            <div className="h-12 border-b flex items-center justify-between px-5 bg-muted/5">
              <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Response</span>
              {response && (
                <div className="flex items-center space-x-4 text-xs font-medium">
                  <span className="flex items-center space-x-2 text-muted-foreground">
                    <span>Status:</span>
                    <Badge className={`${getStatusColor(response.status)} px-2 py-0.5 rounded shadow-sm`}>{response.status || 'ERROR'} {response.statusText}</Badge>
                  </span>
                  <span className="flex items-center space-x-1.5 text-muted-foreground">
                    <span>Time:</span>
                    <span className="text-green-500 font-mono tracking-tight">{response.timeMs}ms</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 relative">
              {isLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                  <span className="text-sm font-medium tracking-wide">Sending Request...</span>
                </div>
              ) : response ? (
                <Editor
                  height="100%"
                  language="json"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={JSON.stringify(response.data || response.error, null, 2)}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, lineNumbersMinChars: 3, padding: { top: 12, bottom: 12 } }}
                  className="absolute inset-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-60 space-y-3">
                  <Send className="w-10 h-10 stroke-[1.5]" />
                  <span className="text-sm font-medium tracking-wide">Enter a URL and hit Send to get a response</span>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
