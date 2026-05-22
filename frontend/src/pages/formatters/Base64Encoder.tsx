import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  Hash, 
  ArrowRightLeft, 
  Copy, 
  Trash2, 
  Download, 
  ClipboardPaste,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface Diagnostic {
  type: 'error' | 'warning' | 'info';
  message: string;
}

export function Base64Encoder() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  
  // Debounce timeout ref
  const [isProcessing, setIsProcessing] = useState(false);

  // Safe UTF-8 Base64 Encoding
  const encodeBase64 = (str: string): { result: string, errors: Diagnostic[] } => {
    try {
      const bytes = new TextEncoder().encode(str);
      const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
      return { result: btoa(binString), errors: [] };
    } catch (err: any) {
      return { result: '', errors: [{ type: 'error', message: `Encoding failed: ${err.message}` }] };
    }
  };

  // Safe UTF-8 Base64 Decoding
  const decodeBase64 = (b64: string): { result: string, errors: Diagnostic[] } => {
    const errors: Diagnostic[] = [];
    let cleanB64 = b64.replace(/\s+/g, '');
    
    if (cleanB64.length === 0) return { result: '', errors };

    // Check basic padding/format warnings
    if (cleanB64.length % 4 !== 0) {
      errors.push({ type: 'warning', message: 'Input length is not a multiple of 4. Missing padding character "=" ?' });
      // Try to auto-pad for decoding attempt
      while (cleanB64.length % 4 !== 0) cleanB64 += '=';
    }

    if (!/^[A-Za-z0-9+/=_-]+$/.test(cleanB64)) {
      errors.push({ type: 'error', message: 'Input contains characters outside the standard Base64 alphabet.' });
    }

    try {
      // Handle URL-safe base64 too
      const standardB64 = cleanB64.replace(/-/g, '+').replace(/_/g, '/');
      const binString = atob(standardB64);
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { result: decoded, errors };
    } catch (err: any) {
      if (err instanceof DOMException) {
        errors.push({ type: 'error', message: 'String is not correctly encoded in Base64.' });
      } else if (err instanceof TypeError) {
        errors.push({ type: 'error', message: 'Malformed UTF-8 sequence detected in decoded string.' });
      } else {
        errors.push({ type: 'error', message: `Decoding failed: ${err.message}` });
      }
      return { result: '', errors };
    }
  };

  // Process pipeline
  useEffect(() => {
    if (!input) {
      setOutput('');
      setDiagnostics([]);
      return;
    }

    setIsProcessing(true);
    
    // Simple debounce logic for large payloads
    const timer = setTimeout(() => {
      if (mode === 'encode') {
        const { result, errors } = encodeBase64(input);
        setOutput(result);
        setDiagnostics(errors);
      } else {
        const { result, errors } = decodeBase64(input);
        setOutput(result);
        setDiagnostics(errors);
      }
      setIsProcessing(false);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [input, mode]);

  // Actions
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handlePaste = async () => {
    try {
      // Check permissions if supported (Chrome/Edge)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
          if (result.state === 'denied') {
            toast.error('Clipboard access denied. Please allow clipboard permissions in your browser settings.');
            return;
          }
        } catch (e) {
          // Safari/Firefox might not support querying 'clipboard-read'
        }
      }

      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error('Clipboard API is not supported in this browser or context (requires HTTPS).');
        return;
      }

      const text = await navigator.clipboard.readText();
      if (text !== undefined && text !== null) {
        setInput(text);
        toast.success('Pasted from clipboard');
      } else {
        toast.info('Clipboard is empty');
      }
    } catch (err: any) {
      // Handle NotAllowedError (user denied permission or browser blocked it)
      if (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('denied')) {
        toast.error('Clipboard permission denied. Please use Ctrl/Cmd+V to paste or update site settings.');
      } else {
        toast.error(`Failed to read clipboard: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setDiagnostics([]);
  };

  const handleSwap = () => {
    const currentOutput = output;
    
    // Only swap output to input if output exists and there are no fatal errors
    if (currentOutput || !diagnostics.some(d => d.type === 'error')) {
      setInput(currentOutput);
    }
    setMode(mode === 'encode' ? 'decode' : 'encode');
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base64_${mode}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  // Stats
  const inputBytes = new TextEncoder().encode(input).length;
  const outputBytes = new TextEncoder().encode(output).length;

  const hasErrors = diagnostics.some(d => d.type === 'error');
  const isValid = input.length > 0 && !hasErrors;

  return (
    <div className="h-full bg-background flex flex-col min-h-0">
      {/* Top Header & Status Bar */}
      <div className="border-b bg-card shrink-0 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <Hash className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Base64 Utility</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {!input ? (
                <Badge variant="outline" className="text-[10px] font-medium h-5">Waiting for input</Badge>
              ) : isValid ? (
                <Badge variant="outline" className="text-[10px] font-medium h-5 bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-medium h-5 bg-red-500/10 text-red-600 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" /> Invalid
                </Badge>
              )}
              {isProcessing && <span className="text-[10px] text-muted-foreground animate-pulse">Processing...</span>}
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-muted/50 p-1 rounded-lg border">
          <Button 
            variant={mode === 'encode' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={`h-7 px-4 text-xs ${mode === 'encode' ? 'shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setMode('encode')}
          >
            Encode
          </Button>
          <Button 
            variant={mode === 'decode' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={`h-7 px-4 text-xs ${mode === 'decode' ? 'shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setMode('decode')}
          >
            Decode
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-4 bg-muted/10">
        
        {/* INPUT PANE */}
        <div className="flex-1 flex flex-col min-h-[250px] bg-card border rounded-lg shadow-sm overflow-hidden">
          <div className="h-10 border-b bg-muted/20 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Input</Badge>
              <span className="text-xs text-muted-foreground">{mode === 'encode' ? 'Raw Text' : 'Base64'}</span>
            </div>
            
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePaste}>
                      <ClipboardPaste className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Paste</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Clear All</p></TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
          
          <Textarea 
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Type or paste raw text here...' : 'Paste Base64 string here...'}
            className="flex-1 resize-none border-0 focus-visible:ring-0 rounded-none p-4 font-mono text-sm leading-relaxed"
          />
          
          <div className="h-7 border-t bg-muted/10 px-3 flex items-center justify-between shrink-0 text-[10px] text-muted-foreground">
            <span>{input.length} chars</span>
            <span>{inputBytes} bytes</span>
          </div>
        </div>

        {/* MIDDLE SWAP */}
        <div className="flex items-center justify-center shrink-0 py-2 md:py-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full shadow-sm"
                  onClick={handleSwap}
                >
                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground md:rotate-0 rotate-90" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Swap & Flip Mode</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* OUTPUT PANE */}
        <div className={`flex-1 flex flex-col min-h-[250px] bg-card border rounded-lg shadow-sm overflow-hidden transition-all ${hasErrors ? 'border-red-500/50 ring-1 ring-red-500/20' : ''}`}>
          <div className="h-10 border-b bg-muted/20 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px] uppercase tracking-wider bg-primary/90">Output</Badge>
              <span className="text-xs text-muted-foreground">{mode === 'encode' ? 'Base64' : 'Raw Text'}</span>
            </div>
            
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(output, 'Output')} disabled={!output}>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Copy Output</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} disabled={!output}>
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Download Output</p></TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
          
          <Textarea 
            value={output}
            readOnly
            placeholder={hasErrors ? 'Waiting for valid input...' : 'Transformation will appear here...'}
            className={`flex-1 resize-none border-0 focus-visible:ring-0 rounded-none p-4 font-mono text-sm leading-relaxed ${hasErrors ? 'text-red-500/60' : ''}`}
          />
          
          <div className="h-7 border-t bg-muted/10 px-3 flex items-center justify-between shrink-0 text-[10px] text-muted-foreground">
            <span>{output.length} chars</span>
            <span>{outputBytes} bytes</span>
          </div>
        </div>

      </div>

      {/* BOTTOM DIAGNOSTICS PANEL */}
      <div className="border-t bg-card shrink-0 min-h-[120px] max-h-[200px] flex flex-col">
        <div className="h-9 border-b bg-muted/20 px-4 flex items-center gap-4 text-xs font-medium shrink-0">
          <div className="flex items-center gap-2 border-b-2 border-primary h-full px-1 text-foreground">
            Problems
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-muted-foreground/10">{diagnostics.length}</Badge>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {diagnostics.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
              <Info className="w-5 h-5 mb-2 opacity-20" />
              <p className="text-xs">No issues detected in the current payload.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {diagnostics.map((diag, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2 rounded hover:bg-muted/50 text-xs font-mono">
                  {diag.type === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  )}
                  <span className="text-muted-foreground leading-relaxed">
                    {diag.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

    </div>
  );
}
