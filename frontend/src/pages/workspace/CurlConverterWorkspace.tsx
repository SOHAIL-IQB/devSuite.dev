import { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  parseCurlCommand,
  generateFetch,
  generateAxios,
  generatePythonRequests,
  generateGoHttp,
  generateRustReqwest,
} from '@/lib/curl_converter.utils';
import {
  Terminal,
  Code2,
  Copy,
  ExternalLink,
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info
} from 'lucide-react';

const SAMPLE_CURL_GET = `curl -X GET "https://api.github.com/users/octocat" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "User-Agent: DevSuite-Client"`;

const SAMPLE_CURL_POST = `curl -X POST "https://api.example.com/v1/orders" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer devsuite_sec_token_9921" \\
  -d '{"product_id": "prod_100", "quantity": 2, "express_shipping": true}'`;

const HTTP_STATUS_LIST = [
  { code: 200, name: 'OK', desc: 'The request has succeeded.', category: '2xx' },
  { code: 201, name: 'Created', desc: 'The request has succeeded and a new resource has been created.', category: '2xx' },
  { code: 202, name: 'Accepted', desc: 'The request has been accepted for processing, but processing is not complete.', category: '2xx' },
  { code: 204, name: 'No Content', desc: 'There is no content to send for this request, but headers may be useful.', category: '2xx' },
  { code: 301, name: 'Moved Permanently', desc: 'The URI of requested resource has been changed permanently.', category: '3xx' },
  { code: 302, name: 'Found (Temporary Redirect)', desc: 'The URI of requested resource has been changed temporarily.', category: '3xx' },
  { code: 304, name: 'Not Modified', desc: 'Tells the client that response has not been modified; use cached copy.', category: '3xx' },
  { code: 400, name: 'Bad Request', desc: 'The server cannot or will not process the request due to perceived client error.', category: '4xx' },
  { code: 401, name: 'Unauthorized', desc: 'Authentication is required and has failed or has not yet been provided.', category: '4xx' },
  { code: 403, name: 'Forbidden', desc: 'The client does not have access rights to the content.', category: '4xx' },
  { code: 404, name: 'Not Found', desc: 'The server cannot find the requested resource.', category: '4xx' },
  { code: 405, name: 'Method Not Allowed', desc: 'The request method is known by the server but is not supported by target resource.', category: '4xx' },
  { code: 409, name: 'Conflict', desc: 'Request conflict with current state of the target resource (e.g. duplicate email).', category: '4xx' },
  { code: 422, name: 'Unprocessable Entity', desc: 'Request was well-formed but was unable to be followed due to semantic errors.', category: '4xx' },
  { code: 429, name: 'Too Many Requests', desc: 'The user has sent too many requests in a given amount of time (rate limit exceeded).', category: '4xx' },
  { code: 500, name: 'Internal Server Error', desc: 'The server encountered an unexpected condition that prevented it from fulfilling the request.', category: '5xx' },
  { code: 502, name: 'Bad Gateway', desc: 'The server, while acting as a gateway or proxy, received an invalid response from inbound server.', category: '5xx' },
  { code: 503, name: 'Service Unavailable', desc: 'The server is not ready to handle the request (overloaded or down for maintenance).', category: '5xx' },
  { code: 504, name: 'Gateway Timeout', desc: 'The server, while acting as a gateway or proxy, did not get a response in time.', category: '5xx' },
];

export function CurlConverterWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const navigate = useNavigate();

  const [curl, setCurl] = useState(SAMPLE_CURL_POST);
  const [targetLang, setTargetLang] = useState<'fetch' | 'axios' | 'python' | 'go' | 'rust'>('fetch');
  const [statusSearch, setStatusSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const parsed = useMemo(() => parseCurlCommand(curl), [curl]);

  const generatedCode = useMemo(() => {
    switch (targetLang) {
      case 'fetch':
        return generateFetch(parsed);
      case 'axios':
        return generateAxios(parsed);
      case 'python':
        return generatePythonRequests(parsed);
      case 'go':
        return generateGoHttp(parsed);
      case 'rust':
        return generateRustReqwest(parsed);
      default:
        return generateFetch(parsed);
    }
  }, [parsed, targetLang]);

  const monacoLanguage = useMemo(() => {
    switch (targetLang) {
      case 'fetch':
      case 'axios':
        return 'javascript';
      case 'python':
        return 'python';
      case 'go':
        return 'go';
      case 'rust':
        return 'rust';
      default:
        return 'javascript';
    }
  }, [targetLang]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Generated code copied to clipboard');
  };

  const handleOpenInApiWorkspace = () => {
    // Save into localStorage for API workspace pickup
    localStorage.setItem('devsuite_import_curl', curl);
    navigate('/api');
    toast.success('Opening parsed cURL in API Workspace');
  };

  const filteredStatuses = useMemo(() => {
    return HTTP_STATUS_LIST.filter((s) => {
      const matchesSearch =
        String(s.code).includes(statusSearch) ||
        s.name.toLowerCase().includes(statusSearch.toLowerCase()) ||
        s.desc.toLowerCase().includes(statusSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [statusSearch, selectedCategory]);

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">cURL Converter & Code Generator</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-orange-500 border-orange-500/30">
                Multi-Lang
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Transform raw cURL commands into production-ready client code across JavaScript, Python, Go, and Rust.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sample Preset */}
          <Select
            onValueChange={(val) => {
              if (val === 'get') setCurl(SAMPLE_CURL_GET);
              if (val === 'post') setCurl(SAMPLE_CURL_POST);
              toast.success('Loaded sample cURL command');
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Sample cURL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="get" className="text-xs">GitHub User (GET)</SelectItem>
              <SelectItem value="post" className="text-xs">Create Order (POST)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={handleOpenInApiWorkspace}
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open in API Workspace
          </Button>
        </div>
      </div>

      {/* TABS: CONVERTER & HTTP ENCYCLOPEDIA */}
      <Tabs defaultValue="converter" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between pb-2">
          <TabsList className="h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="converter" className="text-xs h-7 px-3 gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> Code Generator
            </TabsTrigger>
            <TabsTrigger value="reference" className="text-xs h-7 px-3 gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> HTTP Status & Headers Reference
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: CODE GENERATOR */}
        <TabsContent value="converter" className="flex-1 m-0 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border shadow-sm">
            
            {/* LEFT: CURL INPUT */}
            <ResizablePanel defaultSize={45} minSize={30} className="flex flex-col bg-background min-h-0">
              <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">cURL Command</span>
                <span className="text-[10px] font-mono text-muted-foreground">Paste cURL here</span>
              </div>

              <div className="flex-1 min-h-0 relative">
                <Editor
                  height="100%"
                  language="shell"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={curl}
                  onChange={(val) => setCurl(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    lineNumbersMinChars: 3,
                  }}
                  className="absolute inset-0"
                />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* RIGHT: GENERATED CODE */}
            <ResizablePanel defaultSize={55} minSize={35} className="flex flex-col bg-background min-h-0">
              <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Language:</span>
                  <Select value={targetLang} onValueChange={(val: any) => setTargetLang(val)}>
                    <SelectTrigger className="w-44 h-7 text-xs font-medium">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fetch" className="text-xs">JavaScript (Fetch)</SelectItem>
                      <SelectItem value="axios" className="text-xs">JavaScript (Axios)</SelectItem>
                      <SelectItem value="python" className="text-xs">Python (Requests)</SelectItem>
                      <SelectItem value="go" className="text-xs">Go (net/http)</SelectItem>
                      <SelectItem value="rust" className="text-xs">Rust (Reqwest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shadow-xs"
                  onClick={handleCopyCode}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Code
                </Button>
              </div>

              <div className="flex-1 min-h-0 relative">
                <Editor
                  height="100%"
                  language={monacoLanguage}
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={generatedCode}
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
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        {/* TAB 2: HTTP REFERENCE ENCYCLOPEDIA */}
        <TabsContent value="reference" className="flex-1 m-0 min-h-0 flex flex-col bg-background border rounded-lg p-4 overflow-y-auto space-y-4 mac-scrollbar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search status code or keyword..."
                value={statusSearch}
                onChange={(e) => setStatusSearch(e.target.value)}
                className="pl-9 h-9 text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {['all', '2xx', '3xx', '4xx', '5xx'].map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="h-8 text-xs uppercase"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStatuses.map((s) => {
              let icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
              let badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';

              if (s.category === '3xx') {
                icon = <Info className="w-4 h-4 text-blue-500" />;
                badgeColor = 'bg-blue-500/10 text-blue-500 border-blue-500/30';
              } else if (s.category === '4xx') {
                icon = <AlertTriangle className="w-4 h-4 text-orange-500" />;
                badgeColor = 'bg-orange-500/10 text-orange-500 border-orange-500/30';
              } else if (s.category === '5xx') {
                icon = <XCircle className="w-4 h-4 text-red-500" />;
                badgeColor = 'bg-red-500/10 text-red-500 border-red-500/30';
              }

              return (
                <div key={s.code} className="p-3 border rounded-lg bg-muted/10 flex flex-col gap-1.5 shadow-xs hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {icon}
                      <span className="font-mono font-bold text-sm">{s.code}</span>
                      <span className="text-xs font-semibold truncate max-w-[140px]">{s.name}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-mono ${badgeColor}`}>
                      {s.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
