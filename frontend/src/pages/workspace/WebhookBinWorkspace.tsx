import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Radio,
  Copy,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  Send,
  Loader2,
  FileCode,
  Globe,
  Plus
} from 'lucide-react';

interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  path: string;
  queryParams: Record<string, any>;
  headers: Record<string, any>;
  body: any;
  rawBody: string;
  clientIp: string;
  size: number;
  timestamp: string;
}

interface BinConfig {
  statusCode: number;
  contentType: string;
  responseBody: string;
}

export function WebhookBinWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [binId, setBinId] = useState<string>(() => {
    return localStorage.getItem('devsuite_active_bin_id') || 'bin_' + Math.random().toString(36).substr(2, 9);
  });

  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [binConfig, setBinConfig] = useState<BinConfig>({
    statusCode: 200,
    contentType: 'application/json',
    responseBody: JSON.stringify({ success: true, message: 'Webhook received by DevSuite' }, null, 2),
  });

  // Base webhook URL
  const webhookUrl = `${window.location.protocol}//${window.location.hostname}:3000/api/bin/catch/${binId}`;

  const fetchBinRequests = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await api.get(`/bin/${binId}`);
      if (res.data?.bin) {
        const fetched = res.data.bin.requests || [];
        setRequests(fetched);
        if (res.data.bin.config) {
          setBinConfig(res.data.bin.config);
        }
        if (fetched.length > 0 && !selectedReqId) {
          setSelectedReqId(fetched[0].id);
        }
      }
    } catch {
      // Quiet fail on auto-refresh
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [binId, selectedReqId]);

  // Initial fetch and interval poll
  useEffect(() => {
    localStorage.setItem('devsuite_active_bin_id', binId);
    fetchBinRequests();
  }, [binId, fetchBinRequests]);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (autoRefresh) {
      pollRef.current = setInterval(() => {
        fetchBinRequests(true);
      }, 2000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [autoRefresh, binId, fetchBinRequests]);

  const handleCreateNewBin = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/bin/new');
      if (res.data?.bin) {
        setBinId(res.data.bin.id);
        setRequests([]);
        setSelectedReqId(null);
        toast.success('New Webhook Bin created');
      }
    } catch {
      toast.error('Failed to create new bin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearRequests = async () => {
    try {
      await api.delete(`/bin/${binId}/requests`);
      setRequests([]);
      setSelectedReqId(null);
      toast.success('Captured requests cleared');
    } catch {
      toast.error('Failed to clear requests');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await api.put(`/bin/${binId}/config`, binConfig);
      toast.success('Mock response configuration saved');
      setConfigModalOpen(false);
    } catch {
      toast.error('Failed to update response configuration');
    }
  };

  const handleSendTestWebhook = async () => {
    try {
      const testPayload = {
        event: 'order.completed',
        orderId: 'ord_' + Math.random().toString(36).substr(2, 6),
        amount: 89.99,
        currency: 'USD',
        customer: {
          name: 'Alex Mercer',
          email: 'alex.mercer@example.com',
        },
        timestamp: new Date().toISOString(),
      };

      await fetch(webhookUrl + '/test-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DevSuite-Source': 'Test-Emitter',
        },
        body: JSON.stringify(testPayload),
      });

      toast.success('Test webhook dispatched to bin!');
      fetchBinRequests(true);
    } catch {
      toast.error('Failed to send test webhook');
    }
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  const selectedRequest = requests.find((r) => r.id === selectedReqId) || requests[0];

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'GET':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'PUT':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER & URL BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">Webhook Bin & Request Catcher</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-emerald-500 border-emerald-500/30">
                Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Capture, inspect, and mock real-time HTTP webhooks and payloads.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNewBin}
            disabled={isLoading}
            className="text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> New Bin
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigModalOpen(true)}
            className="text-xs gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Configure Response
          </Button>

          <Button
            size="sm"
            onClick={handleSendTestWebhook}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Send className="w-3.5 h-3.5" /> Send Test Webhook
          </Button>
        </div>
      </div>

      {/* WEBHOOK URL DISPLAY & ACTIONS */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1 flex items-center bg-muted/20 border rounded-lg overflow-hidden h-11 shadow-sm">
          <span className="px-3 text-xs font-mono font-bold text-muted-foreground bg-muted/30 border-r h-full flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Webhook URL
          </span>
          <Input
            readOnly
            value={webhookUrl}
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-xs px-3 h-full select-all"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyWebhookUrl}
            className="h-full px-4 text-xs font-medium border-l rounded-none hover:bg-muted/50"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy URL
          </Button>
        </div>

        <Button
          variant={autoRefresh ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`h-11 px-4 text-xs shrink-0 ${autoRefresh ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${autoRefresh ? 'animate-spin' : ''}`} />
          {autoRefresh ? 'Auto (2s)' : 'Paused'}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleClearRequests}
          disabled={requests.length === 0}
          title="Clear all requests"
          className="h-11 w-11 rounded-lg shrink-0 text-muted-foreground hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* SPLIT PANEL: REQUEST LIST & INSPECTOR */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border shadow-sm">
          
          {/* REQUEST LIST */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="flex flex-col bg-background min-h-0">
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Captured Requests ({requests.length})
              </span>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 mac-scrollbar">
              {requests.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-3 opacity-60">
                  <Radio className="w-8 h-8 animate-pulse text-emerald-500" />
                  <div>
                    <p className="text-xs font-semibold">Waiting for incoming webhooks</p>
                    <p className="text-[11px] mt-0.5">Send a POST/GET request to your Webhook URL or click &quot;Send Test Webhook&quot;.</p>
                  </div>
                </div>
              ) : (
                requests.map((req) => {
                  const isSelected = selectedReqId === req.id;
                  const dateStr = new Date(req.timestamp).toLocaleTimeString();
                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedReqId(req.id)}
                      className={`p-2.5 rounded-md cursor-pointer border transition-all text-xs flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 shadow-xs'
                          : 'bg-muted/10 border-border/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono ${getMethodBadge(req.method)}`}>
                            {req.method}
                          </span>
                          <span className="font-mono text-xs font-medium truncate max-w-[140px]">
                            {req.path || '/'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{dateStr}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-mono">{req.clientIp}</span>
                        <span>{req.size} bytes</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* REQUEST INSPECTOR */}
          <ResizablePanel defaultSize={65} minSize={40} className="flex flex-col bg-background min-h-0">
            {selectedRequest ? (
              <Tabs defaultValue="body" className="flex flex-col h-full min-h-0">
                <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
                  <TabsList className="h-7 bg-muted/50 p-0.5">
                    <TabsTrigger value="body" className="text-xs h-6 px-3">JSON Body</TabsTrigger>
                    <TabsTrigger value="headers" className="text-xs h-6 px-3">
                      Headers ({Object.keys(selectedRequest.headers || {}).length})
                    </TabsTrigger>
                    <TabsTrigger value="query" className="text-xs h-6 px-3">
                      Query Params ({Object.keys(selectedRequest.queryParams || {}).length})
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="text-xs h-6 px-3">Raw Payload</TabsTrigger>
                  </TabsList>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        typeof selectedRequest.body === 'object'
                          ? JSON.stringify(selectedRequest.body, null, 2)
                          : selectedRequest.rawBody
                      );
                      toast.success('Payload copied to clipboard');
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Body
                  </Button>
                </div>

                <TabsContent value="body" className="flex-1 p-0 m-0 min-h-0 relative">
                  <Editor
                    height="100%"
                    language="json"
                    theme={isDark ? 'vs-dark' : 'vs'}
                    value={
                      typeof selectedRequest.body === 'object'
                        ? JSON.stringify(selectedRequest.body, null, 2)
                        : selectedRequest.rawBody || '{}'
                    }
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
                </TabsContent>

                <TabsContent value="headers" className="flex-1 p-4 m-0 overflow-y-auto space-y-2 mac-scrollbar">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b font-mono uppercase text-[10px] text-muted-foreground">
                        <tr>
                          <th className="p-2.5">Header</th>
                          <th className="p-2.5">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono">
                        {Object.entries(selectedRequest.headers || {}).map(([key, value]) => (
                          <tr key={key} className="hover:bg-muted/20">
                            <td className="p-2.5 font-bold text-primary max-w-[200px] truncate">{key}</td>
                            <td className="p-2.5 text-muted-foreground break-all">{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="query" className="flex-1 p-4 m-0 overflow-y-auto space-y-2 mac-scrollbar">
                  {Object.keys(selectedRequest.queryParams || {}).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No URL query parameters present.</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b font-mono uppercase text-[10px] text-muted-foreground">
                          <tr>
                            <th className="p-2.5">Parameter</th>
                            <th className="p-2.5">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {Object.entries(selectedRequest.queryParams || {}).map(([key, value]) => (
                            <tr key={key} className="hover:bg-muted/20">
                              <td className="p-2.5 font-bold text-primary">{key}</td>
                              <td className="p-2.5 text-muted-foreground">{String(value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="raw" className="flex-1 p-4 m-0 overflow-y-auto mac-scrollbar">
                  <pre className="text-xs font-mono bg-muted/20 p-3 rounded-lg border whitespace-pre-wrap break-all">
                    {selectedRequest.rawBody || '(Empty Body)'}
                  </pre>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                <FileCode className="w-8 h-8 stroke-[1.5]" />
                <span className="text-xs">Select a request from the list to inspect</span>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* CONFIGURE MOCK RESPONSE MODAL */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" /> Configure Mock Response
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">HTTP Status Code</Label>
                <Input
                  type="number"
                  value={binConfig.statusCode}
                  onChange={(e) => setBinConfig({ ...binConfig, statusCode: parseInt(e.target.value) || 200 })}
                  className="font-mono text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Content-Type</Label>
                <Input
                  value={binConfig.contentType}
                  onChange={(e) => setBinConfig({ ...binConfig, contentType: e.target.value })}
                  className="font-mono text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Response Body</Label>
              <Textarea
                value={binConfig.responseBody}
                onChange={(e) => setBinConfig({ ...binConfig, responseBody: e.target.value })}
                className="font-mono text-xs h-36 resize-none mac-scrollbar"
                placeholder='{"success": true}'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
