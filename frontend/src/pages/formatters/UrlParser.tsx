import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Copy, AlertCircle, Plus, Trash2, ShieldCheck, FileKey } from 'lucide-react';
import { toast } from 'sonner';

interface QueryParam {
  id: string;
  key: string;
  value: string;
}

export function UrlParser() {
  const [url, setUrl] = useState('https://devsuite.app:8080/api/v1/users?role=admin&active=true#section-2');
  const [error, setError] = useState('');
  
  // Parsed Components
  const [protocol, setProtocol] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [path, setPath] = useState('');
  const [hash, setHash] = useState('');
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);

  const resetComponents = () => {
    setProtocol('');
    setHost('');
    setPort('');
    setPath('');
    setHash('');
    setQueryParams([]);
    setError('');
  };

  // Parse logic
  useEffect(() => {
    try {
      if (!url.trim()) {
        resetComponents();
        return;
      }
      
      const parsedUrl = new URL(url.includes('://') ? url : `http://${url}`);
      
      setProtocol(parsedUrl.protocol.replace(':', ''));
      setHost(parsedUrl.hostname);
      setPort(parsedUrl.port);
      setPath(parsedUrl.pathname);
      setHash(parsedUrl.hash.replace('#', ''));
      
      const params: QueryParam[] = [];
      parsedUrl.searchParams.forEach((val, key) => {
        params.push({ id: Math.random().toString(36).substr(2, 9), key, value: val });
      });
      setQueryParams(params);
      setError('');
    } catch {
      setError('Invalid URL format');
    }
  }, [url]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  const encodeUrl = () => {
    try {
      setUrl(encodeURI(url));
    } catch (e) {
      toast.error('Failed to encode URL');
    }
  };

  const decodeUrl = () => {
    try {
      setUrl(decodeURI(url));
    } catch (e) {
      toast.error('Failed to decode URL');
    }
  };

  const encodeParams = () => {
    try {
      const parsedUrl = new URL(url.includes('://') ? url : `http://${url}`);
      const newParams = new URLSearchParams();
      queryParams.forEach(p => newParams.append(encodeURIComponent(p.key), encodeURIComponent(p.value)));
      parsedUrl.search = newParams.toString();
      setUrl(parsedUrl.toString());
    } catch (e) {}
  };

  const decodeParams = () => {
    try {
      const parsedUrl = new URL(url.includes('://') ? url : `http://${url}`);
      const newParams = new URLSearchParams();
      queryParams.forEach(p => newParams.append(decodeURIComponent(p.key), decodeURIComponent(p.value)));
      parsedUrl.search = newParams.toString();
      setUrl(parsedUrl.toString());
    } catch (e) {}
  };

  const rebuildUrl = (newParams: QueryParam[]) => {
    try {
      const parsedUrl = new URL(url.includes('://') ? url : `http://${url}`);
      const searchParams = new URLSearchParams();
      newParams.forEach(p => {
        if (p.key.trim()) searchParams.append(p.key, p.value);
      });
      parsedUrl.search = searchParams.toString();
      setUrl(parsedUrl.toString());
    } catch (e) {}
  };

  const handleParamChange = (id: string, field: 'key' | 'value', val: string) => {
    const updated = queryParams.map(p => p.id === id ? { ...p, [field]: val } : p);
    setQueryParams(updated);
    rebuildUrl(updated);
  };

  const addParam = () => {
    const newParam = { id: Math.random().toString(36).substr(2, 9), key: '', value: '' };
    const updated = [...queryParams, newParam];
    setQueryParams(updated);
  };

  const removeParam = (id: string) => {
    const updated = queryParams.filter(p => p.id !== id);
    setQueryParams(updated);
    rebuildUrl(updated);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="w-8 h-8 text-blue-500" />
            URL Parser & Builder
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Deconstruct, edit, and safely encode URLs and query parameters.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={encodeUrl} className="text-xs">
            Encode URI
          </Button>
          <Button variant="outline" size="sm" onClick={decodeUrl} className="text-xs">
            Decode URI
          </Button>
        </div>
      </div>

      <Card className="border-blue-500/10 shadow-sm">
        <CardContent className="p-4 flex gap-2">
          <div className="flex-1 relative">
            <Input 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={`font-mono text-base py-6 pr-10 ${error ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'focus-visible:ring-blue-500/20'}`}
              placeholder="https://example.com/api?q=search"
              spellCheck={false}
            />
            {error && (
              <AlertCircle className="w-5 h-5 text-red-500 absolute right-3 top-3.5" />
            )}
          </div>
          <Button size="icon" className="h-12 w-12 shrink-0 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleCopy(url, 'Full URL')}>
            <Copy className="w-5 h-5" />
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Base Components */}
        <Card className="border-blue-500/5 shadow-sm h-full flex flex-col">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              Base Components
            </CardTitle>
            <CardDescription>The core structural elements of the URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 flex-1">
            <ComponentRow label="Protocol" value={protocol} onCopy={() => handleCopy(protocol, 'Protocol')} />
            <ComponentRow label="Host" value={host} onCopy={() => handleCopy(host, 'Host')} />
            <ComponentRow label="Port" value={port || '(default)'} onCopy={() => handleCopy(port, 'Port')} />
            <ComponentRow label="Path" value={path} onCopy={() => handleCopy(path, 'Path')} />
            <ComponentRow label="Hash" value={hash} onCopy={() => handleCopy(hash, 'Hash')} />
          </CardContent>
        </Card>

        {/* Query Params Builder */}
        <Card className="border-blue-500/5 shadow-sm h-full flex flex-col">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileKey className="w-5 h-5 text-blue-500" />
                  Query Parameters
                </CardTitle>
                <CardDescription className="mt-1">Live editable key-value pairs.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={encodeParams} className="text-[10px] uppercase h-7">Encode All</Button>
                <Button variant="ghost" size="sm" onClick={decodeParams} className="text-[10px] uppercase h-7">Decode All</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col">
            
            {queryParams.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-sm">No query parameters found.</p>
                <Button variant="link" onClick={addParam} className="text-blue-500">Add Parameter</Button>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {queryParams.map((param) => (
                  <div key={param.id} className="flex gap-2 items-center group">
                    <Input 
                      value={param.key} 
                      onChange={(e) => handleParamChange(param.id, 'key', e.target.value)}
                      className="font-mono text-sm bg-muted/30"
                      placeholder="Key"
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input 
                      value={param.value} 
                      onChange={(e) => handleParamChange(param.id, 'value', e.target.value)}
                      className="font-mono text-sm bg-muted/30"
                      placeholder="Value"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeParam(param.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" className="w-full mt-4 border-dashed" onClick={addParam}>
              <Plus className="w-4 h-4 mr-2" /> Add Query Parameter
            </Button>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function ComponentRow({ label, value, onCopy }: { label: string, value: string, onCopy: () => void }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b last:border-0 group hover:bg-muted/30 px-2 -mx-2 rounded transition-colors">
      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-24">{label}</span>
      <div className="flex items-center gap-3 text-right flex-1 justify-end truncate">
        <span className={`text-sm font-mono truncate ${!value || value === '(default)' ? 'text-muted-foreground/50' : 'text-foreground'}`}>
          {value || '-'}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={onCopy}>
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
