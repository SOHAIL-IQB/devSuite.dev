import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Radio, 
  Send, 
  Power, 
  Trash2, 
  Copy, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info, 
  FileCode,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface WsMessage {
  id: string;
  type: 'sent' | 'received' | 'system';
  data: string;
  timestamp: Date;
  size: number;
}

export function WebSocketWorkspace() {
  const [url, setUrl] = useState('wss://echo.websocket.org');
  const [protocol, setProtocol] = useState('');
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('{\n  "event": "ping",\n  "timestamp": ' + Date.now() + '\n}');
  const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'system'>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addLog = (type: 'sent' | 'received' | 'system', data: string) => {
    const newMsg: WsMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: new Date(),
      size: new Blob([data]).size,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleConnect = () => {
    if (!url.trim() || (!url.startsWith('ws://') && !url.startsWith('wss://'))) {
      toast.error('URL must start with ws:// or wss://');
      return;
    }

    try {
      setStatus('connecting');
      addLog('system', `Connecting to ${url}...`);

      const ws = protocol.trim() ? new WebSocket(url, protocol.trim()) : new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        addLog('system', `Successfully connected to ${url}`);
        toast.success('WebSocket Connected');
      };

      ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        addLog('received', data);
      };

      ws.onerror = () => {
        setStatus('error');
        addLog('system', 'WebSocket encountered a connection error');
        toast.error('WebSocket Error');
      };

      ws.onclose = (event) => {
        setStatus('disconnected');
        addLog('system', `Disconnected (Code: ${event.code}${event.reason ? `, Reason: ${event.reason}` : ''})`);
        wsRef.current = null;
      };
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Connection failed';
      addLog('system', `Connection failed: ${msg}`);
      toast.error(msg);
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      setStatus('disconnected');
      toast.info('Disconnected from WebSocket');
    }
  };

  const handleSendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('WebSocket is not connected');
      return;
    }

    if (!inputMessage.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      wsRef.current.send(inputMessage);
      addLog('sent', inputMessage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(msg);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(inputMessage);
      setInputMessage(JSON.stringify(parsed, null, 2));
      toast.success('JSON formatted');
    } catch {
      toast.error('Invalid JSON');
    }
  };

  const handleClearLogs = () => {
    setMessages([]);
    toast.success('Logs cleared');
  };

  const handleExportLogs = () => {
    if (messages.length === 0) return;
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `ws-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === 'all') return true;
    return m.type === filter;
  });

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 hover:bg-green-600 font-mono text-[11px] gap-1"><Radio className="w-3 h-3 animate-pulse" /> CONNECTED</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 font-mono text-[11px]">CONNECTING...</Badge>;
      case 'error':
        return <Badge variant="destructive" className="font-mono text-[11px]">ERROR</Badge>;
      default:
        return <Badge variant="secondary" className="font-mono text-[11px]">DISCONNECTED</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* CONNECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Real-Time WebSocket Client</h1>
            <p className="text-xs text-muted-foreground">Test full-duplex WebSocket connections and live event streams.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* URL BAR & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
        <div className="flex-1 flex items-center bg-muted/20 border rounded-lg overflow-hidden h-11 w-full shadow-sm">
          <span className="px-3 text-xs font-mono font-semibold text-muted-foreground bg-muted/30 border-r h-full flex items-center">
            URL
          </span>
          <Input 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            placeholder="wss://echo.websocket.org"
            disabled={status === 'connected' || status === 'connecting'}
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-xs px-3 h-full"
          />
          <Input 
            value={protocol} 
            onChange={(e) => setProtocol(e.target.value)} 
            placeholder="Protocols (optional)"
            disabled={status === 'connected' || status === 'connecting'}
            className="w-44 border-0 border-l bg-transparent shadow-none focus-visible:ring-0 font-mono text-xs px-3 h-full hidden md:block"
          />
        </div>

        {status === 'connected' ? (
          <Button onClick={handleDisconnect} variant="destructive" className="h-11 px-5 shrink-0">
            <Power className="w-4 h-4 mr-2" /> Disconnect
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={status === 'connecting'} className="h-11 px-6 shrink-0 font-semibold">
            <Power className="w-4 h-4 mr-2" /> Connect
          </Button>
        )}
      </div>

      {/* MAIN BODY: SPLIT VIEW */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* MESSAGE COMPOSER */}
        <div className="lg:col-span-5 flex flex-col bg-muted/10 border rounded-lg overflow-hidden min-h-0 shadow-sm">
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between shrink-0 h-11">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-primary" /> Message Composer
            </span>
            <Button variant="ghost" size="sm" onClick={handleFormatJson} className="h-7 text-xs">
              Beautify JSON
            </Button>
          </div>

          <div className="flex-1 p-3 flex flex-col min-h-0 bg-background">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Enter text or JSON payload to send..."
              className="flex-1 font-mono text-xs resize-none p-3 mac-scrollbar border rounded-md"
            />
          </div>

          <div className="p-3 border-t bg-muted/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => setInputMessage('{\n  "type": "ping",\n  "time": ' + Date.now() + '\n}')}
              >
                Ping Template
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={status !== 'connected'}
              className="h-8 px-4 font-semibold text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Send Message
            </Button>
          </div>
        </div>

        {/* LIVE MESSAGE & EVENT STREAM */}
        <div className="lg:col-span-7 flex flex-col bg-muted/10 border rounded-lg overflow-hidden min-h-0 shadow-sm">
          <div className="p-2.5 border-b bg-muted/20 flex items-center justify-between shrink-0 h-11">
            <Tabs value={filter} onValueChange={(val: any) => setFilter(val)}>
              <TabsList className="h-7 bg-muted/50 p-0.5">
                <TabsTrigger value="all" className="text-[11px] h-6 px-2.5">All ({messages.length})</TabsTrigger>
                <TabsTrigger value="received" className="text-[11px] h-6 px-2.5">Received ({messages.filter(m => m.type === 'received').length})</TabsTrigger>
                <TabsTrigger value="sent" className="text-[11px] h-6 px-2.5">Sent ({messages.filter(m => m.type === 'sent').length})</TabsTrigger>
                <TabsTrigger value="system" className="text-[11px] h-6 px-2.5">System</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setAutoScroll(!autoScroll)}
                title={autoScroll ? 'Disable Auto-Scroll' : 'Enable Auto-Scroll'}
              >
                <div className={`w-2 h-2 rounded-full ${autoScroll ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleExportLogs}
                disabled={messages.length === 0}
                title="Export Logs as JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                onClick={handleClearLogs}
                disabled={messages.length === 0}
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 mac-scrollbar bg-background min-h-0">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                <Radio className="w-8 h-8 stroke-[1.5]" />
                <span className="text-xs">No WebSocket events recorded</span>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSent = msg.type === 'sent';
                const isReceived = msg.type === 'received';

                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                      isReceived
                        ? 'bg-blue-500/5 border-blue-500/20 text-foreground'
                        : isSent
                        ? 'bg-green-500/5 border-green-500/20 text-foreground'
                        : 'bg-muted/30 border-muted text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 opacity-80 text-[10px]">
                      <div className="flex items-center space-x-1.5 font-sans font-semibold">
                        {isReceived ? (
                          <span className="text-blue-500 flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3" /> RECEIVED
                          </span>
                        ) : isSent ? (
                          <span className="text-green-500 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> SENT
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Info className="w-3 h-3" /> SYSTEM
                          </span>
                        )}
                        <span>•</span>
                        <span>{format(msg.timestamp, 'HH:mm:ss.SSS')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {msg.type !== 'system' && <span>{msg.size} bytes</span>}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.data);
                            toast.success('Payload copied');
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap break-all leading-relaxed">{msg.data}</pre>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
