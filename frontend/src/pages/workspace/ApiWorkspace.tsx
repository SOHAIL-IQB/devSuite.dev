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
import { Loader2, Save, Trash2, Plus, Send } from 'lucide-react';


export function ApiWorkspace() {
  const { theme } = useThemeStore();
  const { activeRequest, setActiveRequest, updateHeader, addHeader, removeHeader } = useWorkspaceStore();
  
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleEditorWillMount = (monacoInstance: any) => {
    monacoInstance.editor.defineTheme('devworkspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#09090b', // Tailwind background
        'editor.lineHighlightBackground': '#18181b', // Tailwind muted
        'editorLineNumber.foreground': '#52525b', // Tailwind muted-foreground
        'editorIndentGuide.background': '#27272a', // Tailwind border
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
    <div className="h-full w-full bg-muted/10 p-2">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">

      {/* MAIN CONTENT */}
      <ResizablePanel defaultSize={100} className="flex flex-col h-full overflow-hidden bg-background rounded-lg border shadow-sm">
        
        {/* URL BAR - POSTMAN STYLE */}
        <div className="flex items-center p-3 border-b bg-background">
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
              </SelectContent>
            </Select>
            <div className="w-px h-6 bg-border mx-1"></div>
            <Input 
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-[13px] px-3 h-full placeholder:text-muted-foreground/50" 
              placeholder="https://api.example.com/v1/users" 
              value={activeRequest.url}
              onChange={(e) => setActiveRequest({ url: e.target.value })}
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
          
          <Button variant="outline" size="icon" className="ml-3 shadow-sm h-11 w-11 rounded-lg">
            <Save className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* EDITOR & RESPONSE SPLIT */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          
          {/* REQUEST EDITOR */}
          <ResizablePanel defaultSize={50} className="flex flex-col bg-background">
            <Tabs defaultValue="body" className="flex-1 flex flex-col">
              <div className="px-4 border-b bg-muted/5">
                <TabsList className="bg-transparent h-10 gap-6 p-0 w-full justify-start">
                  <TabsTrigger value="params" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all">Params</TabsTrigger>
                  <TabsTrigger value="headers" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all">Headers</TabsTrigger>
                  <TabsTrigger value="auth" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all">Auth</TabsTrigger>
                  <TabsTrigger value="body" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 font-medium text-[13px] text-muted-foreground data-[state=active]:text-foreground transition-all">Body</TabsTrigger>
                </TabsList>
              </div>

              {/* BODY TAB */}
              <TabsContent value="body" className="flex-1 mt-0 data-[state=active]:flex flex-col h-full bg-background">
                <div className="p-2.5 border-b text-[12px] text-muted-foreground flex items-center bg-background">
                  <span className="font-medium tracking-wide">Raw (JSON)</span>
                </div>
                <div className="flex-1 min-h-0 bg-background relative">
                  <Editor
                    height="100%"
                    language="json"
                    theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
                    value={activeRequest.body}
                    onChange={(val) => setActiveRequest({ body: val || '' })}
                    beforeMount={handleEditorWillMount}
                    options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, lineNumbersMinChars: 4, padding: { top: 16, bottom: 16 }, scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 } }}
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

          <ResizableHandle />

          {/* RESPONSE VIEWER */}
          <ResizablePanel defaultSize={50} className="flex flex-col bg-background">
            <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/5">
              <span className="font-semibold text-[11px] tracking-widest uppercase text-muted-foreground">Response</span>
              {response && (
                <div className="flex items-center space-x-3 text-[12px] font-medium">
                  <div className="flex items-center space-x-1.5 bg-muted/30 px-2 py-0.5 rounded-md border">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={`${getStatusColor(response.status)} px-1.5 py-0 rounded-[4px] shadow-none h-4 text-[10px]`}>{response.status || 'ERROR'} {response.statusText}</Badge>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-muted/30 px-2 py-0.5 rounded-md border">
                    <span className="text-muted-foreground">Time</span>
                    <span className="text-green-500 font-mono tracking-tight">{response.timeMs}ms</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 relative bg-background">
              {isLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground space-y-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                  <span className="text-[13px] font-medium tracking-wide">Sending Request...</span>
                </div>
              ) : response ? (
                <Editor
                  height="100%"
                  language="json"
                  theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
                  value={JSON.stringify(response.data || response.error, null, 2)}
                  beforeMount={handleEditorWillMount}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, lineNumbersMinChars: 4, padding: { top: 16, bottom: 16 }, scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 } }}
                  className="absolute inset-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50 space-y-3">
                  <Send className="w-8 h-8 stroke-[1.5]" />
                  <span className="text-[13px] font-medium tracking-wide">Enter a URL and hit Send</span>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
    </div>
  );
}
