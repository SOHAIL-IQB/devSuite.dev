import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Regex, 
  Trash2, 
  ClipboardPaste,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  List,
  Library,
  Copy,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';
import type { RegexWorkerMessage, RegexWorkerResponse, SerializedMatch } from '@/workers/regex.worker';

const REGEX_LIBRARY = [
  { name: 'Email Address', pattern: '([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,4})', flags: 'g' },
  { name: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)', flags: 'g' },
  { name: 'IPv4 Address', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g' },
  { name: 'UUID', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', flags: 'g' },
  { name: 'Hex Color', pattern: '#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})', flags: 'g' }
];

const FLAGS_MAP = [
  { id: 'g', label: 'Global', tooltip: 'Don\'t return after first match' },
  { id: 'i', label: 'Case Insensitive', tooltip: 'Case insensitive match' },
  { id: 'm', label: 'Multiline', tooltip: '^ and $ match start/end of line' },
  { id: 's', label: 'DotAll', tooltip: 'Dot (.) matches newline' },
  { id: 'u', label: 'Unicode', tooltip: 'Match with full unicode' },
  { id: 'y', label: 'Sticky', tooltip: 'Match exactly at lastIndex' },
];

export function RegexTester() {
  const [mode, setMode] = useState<'match' | 'replace'>('match');
  const [regexStr, setRegexStr] = useState('[A-Za-z]+');
  const [flags, setFlags] = useState('g');
  const [targetText, setTargetText] = useState('Hello 123 Regex Tester!');
  const [replacementStr, setReplacementStr] = useState('');
  
  const [matches, setMatches] = useState<SerializedMatch[]>([]);
  const [replacedOutput, setReplacedOutput] = useState('');
  const [error, setError] = useState('');
  const [execTime, setExecTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const targetRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const handleScroll = () => {
    if (targetRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = targetRef.current.scrollTop;
      highlightRef.current.scrollLeft = targetRef.current.scrollLeft;
    }
  };

  const toggleFlag = (flag: string) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ''));
    } else {
      setFlags(flags + flag);
    }
  };

  const loadLibraryRegex = (pattern: string, newFlags: string) => {
    setRegexStr(pattern);
    setFlags(newFlags);
  };

  const executeRegex = useCallback(async () => {
    if (!regexStr) {
      setMatches([]);
      setReplacedOutput('');
      setError('');
      return;
    }

    setIsProcessing(true);
    const start = performance.now();

    try {
      // Validate regex instantly before sending to worker
      new RegExp(regexStr, flags);
      setError('');
    } catch (e: any) {
      setError(e.message);
      setMatches([]);
      setIsProcessing(false);
      return;
    }

    if (workerRef.current) workerRef.current.terminate();
    workerRef.current = new Worker(new URL('../../workers/regex.worker.ts', import.meta.url), { type: 'module' });

    const payload: Omit<RegexWorkerMessage, 'id'> = {
      type: mode,
      regexStr,
      flags,
      targetText,
      replacementStr
    };

    const id = Date.now().toString();

    let isFinished = false;
    
    // Worker Promise wrapper
    const workerPromise = new Promise<RegexWorkerResponse>((resolve) => {
      workerRef.current!.onmessage = (e: MessageEvent<RegexWorkerResponse>) => {
        if (e.data.id === id) {
          isFinished = true;
          resolve(e.data);
        }
      };
      workerRef.current!.postMessage({ id, ...payload });
    });

    // Timeout Race (500ms limit for Catastrophic Backtracking)
    const timeoutPromise = new Promise<RegexWorkerResponse>((resolve) => {
      setTimeout(() => {
        if (!isFinished) {
          workerRef.current?.terminate();
          resolve({ id, error: 'Execution Timeout: Catastrophic Backtracking Detected (>500ms). Please refine your pattern.' });
        }
      }, 500);
    });

    const response = await Promise.race([workerPromise, timeoutPromise]);

    const end = performance.now();
    setExecTime(Math.round((end - start) * 100) / 100);
    setIsProcessing(false);

    if (response.error) {
      setError(response.error);
      setMatches([]);
      setReplacedOutput('');
    } else {
      if (mode === 'match' && response.matches) {
        setMatches(response.matches);
      } else if (mode === 'replace' && response.replacedText !== undefined) {
        setReplacedOutput(response.replacedText);
        // Also run a match pass to show what was targeted
        const matchPayload: Omit<RegexWorkerMessage, 'id'> = { type: 'match', regexStr, flags, targetText };
        workerRef.current = new Worker(new URL('../../workers/regex.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current.onmessage = (e: MessageEvent<RegexWorkerResponse>) => {
          if (e.data.matches) setMatches(e.data.matches);
        };
        workerRef.current.postMessage({ id: 'match_pass', ...matchPayload });
      }
    }
  }, [regexStr, flags, targetText, replacementStr, mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      executeRegex();
    }, 150); // Debounce
    return () => clearTimeout(timer);
  }, [executeRegex]);

  const handlePaste = async (e: React.MouseEvent, setter: (val: string) => void) => {
    e.preventDefault();
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error('Clipboard API is not supported.'); return;
      }
      const text = await navigator.clipboard.readText();
      if (text) setter(text);
    } catch (err) {
      toast.error('Failed to read clipboard.');
    }
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.preventDefault();
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getHighlightedElements = () => {
    if (!regexStr || error || matches.length === 0 || !targetText) return <>{targetText}</>;

    const elements = [];
    let lastIndex = 0;
    const safeMatches = matches.slice(0, 2000); // Visual limit

    safeMatches.forEach((match, i) => {
      const start = match.index;
      const text = match.fullMatch;
      
      if (text.length === 0) return;

      if (start > lastIndex) {
        elements.push(<span key={`text-${i}`}>{targetText.slice(lastIndex, start)}</span>);
      }
      
      elements.push(
        <mark 
          key={`match-${i}`} 
          className={`rounded-sm px-[1px] text-transparent ${i % 2 === 0 ? 'bg-blue-500/30' : 'bg-cyan-500/30'}`}
        >
          {text}
        </mark>
      );
      lastIndex = start + text.length;
    });

    if (lastIndex < targetText.length) {
      elements.push(<span key="text-end">{targetText.slice(lastIndex)}</span>);
    }

    if (matches.length > 2000) {
      elements.push(<span key="warning" className="text-red-500">... (Truncated highlights)</span>);
    }

    return elements;
  };

  return (
    <div className="h-full bg-background flex flex-col min-h-0">
      
      {/* Top Header */}
      <div className="border-b bg-card shrink-0 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Regex className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Regex Tester</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {!regexStr ? (
                <Badge variant="outline" className="text-[10px] font-medium h-5">No Pattern</Badge>
              ) : error ? (
                <Badge variant="outline" className="text-[10px] font-medium h-5 bg-red-500/10 text-red-600 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" /> Error
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-medium h-5 bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
                </Badge>
              )}
              {isProcessing && (
                <Badge variant="outline" className="text-[10px] font-medium h-5">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing...
                </Badge>
              )}
              {execTime > 0 && !error && !isProcessing && (
                <span className="text-[10px] text-muted-foreground">{execTime}ms execution time</span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-muted/50 p-1 rounded-lg border">
          <Button 
            variant={mode === 'match' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={`h-7 px-4 text-xs ${mode === 'match' ? 'shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setMode('match')}
          >
            Match
          </Button>
          <Button 
            variant={mode === 'replace' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={`h-7 px-4 text-xs ${mode === 'replace' ? 'shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setMode('replace')}
          >
            Replace
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4 bg-muted/10">
        
        {/* REGEX EXPRESSION & FLAGS */}
        <div className="shrink-0 flex flex-col bg-card border rounded-lg shadow-sm overflow-hidden">
          <div className="h-9 border-b bg-muted/20 px-3 flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Regular Expression</Badge>
            <div className="flex gap-1 overflow-x-auto hide-scrollbar">
              {REGEX_LIBRARY.map((lib, i) => (
                <Button 
                  key={i} 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => loadLibraryRegex(lib.pattern, lib.flags)}
                >
                  <Library className="w-3 h-3 mr-1" /> {lib.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <span className="text-2xl text-muted-foreground font-mono font-light">/</span>
              <Input 
                value={regexStr}
                onChange={(e) => setRegexStr(e.target.value)}
                placeholder="Enter regular expression pattern..."
                className="flex-1 font-mono text-base border-muted-foreground/20 focus-visible:ring-primary/20"
                autoFocus
              />
              <span className="text-2xl text-muted-foreground font-mono font-light">/</span>
              <div className="flex gap-1 ml-2">
                {FLAGS_MAP.map(f => (
                  <Button
                    key={f.id}
                    variant={flags.includes(f.id) ? "default" : "outline"}
                    size="icon"
                    className={`h-9 w-9 font-mono text-sm ${flags.includes(f.id) ? 'bg-blue-500 hover:bg-blue-600' : 'text-muted-foreground'}`}
                    onClick={() => toggleFlag(f.id)}
                    title={f.label}
                  >
                    {f.id}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* REPLACE INPUT IF MODE IS REPLACE */}
            {mode === 'replace' && (
              <div className="flex gap-2 items-center pt-2 border-t mt-1">
                <ArrowRightLeft className="w-5 h-5 text-muted-foreground/50 mx-2" />
                <Input 
                  value={replacementStr}
                  onChange={(e) => setReplacementStr(e.target.value)}
                  placeholder="Replacement string (e.g. $1-$2)"
                  className="flex-1 font-mono text-sm border-muted-foreground/20"
                />
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE AREA (Target + Optional Preview) */}
        <div className={`flex-1 flex flex-col ${mode === 'replace' ? 'md:flex-row' : ''} gap-4 min-h-[200px]`}>
          
          {/* TARGET TEXT */}
          <div className="flex-1 flex flex-col bg-card border rounded-lg shadow-sm overflow-hidden relative">
            <div className="h-10 border-b bg-muted/20 px-3 flex items-center justify-between shrink-0 z-20 relative bg-card">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Test String</Badge>
                {!error && matches.length > 0 && (
                  <span className="text-xs text-blue-500 font-medium">{matches.length} match{matches.length !== 1 && 'es'}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handlePaste(e, setTargetText)} title="Paste Test String">
                  <ClipboardPaste className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTargetText('')} title="Clear">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 relative overflow-hidden bg-background">
              <div 
                ref={highlightRef}
                className="absolute inset-0 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words overflow-auto pointer-events-none z-0"
                aria-hidden="true"
              >
                {getHighlightedElements()}
              </div>
              <Textarea 
                ref={targetRef}
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
                placeholder="Enter text to test your regex against..."
                className="absolute inset-0 resize-none border-0 focus-visible:ring-0 rounded-none p-4 font-mono text-sm leading-relaxed bg-transparent z-10 m-0 w-full h-full text-foreground/90 caret-foreground"
              />
            </div>
          </div>

          {/* REPLACEMENT PREVIEW */}
          {mode === 'replace' && (
            <div className="flex-1 flex flex-col bg-card border rounded-lg shadow-sm overflow-hidden">
              <div className="h-10 border-b bg-muted/20 px-3 flex items-center justify-between shrink-0">
                <Badge variant="default" className="text-[10px] uppercase tracking-wider bg-purple-500/10 text-purple-600 border-purple-500/20">Replacement Preview</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleCopy(e, replacedOutput)} title="Copy Result">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
              <Textarea 
                value={replacedOutput}
                readOnly
                placeholder="Replacement output will appear here..."
                className="flex-1 resize-none border-0 focus-visible:ring-0 rounded-none p-4 font-mono text-sm leading-relaxed"
              />
            </div>
          )}

        </div>
      </div>

      {/* BOTTOM DIAGNOSTICS & MATCHES PANEL */}
      <div className="border-t bg-card shrink-0 min-h-[150px] max-h-[300px] flex flex-col">
        <div className="h-9 border-b bg-muted/20 px-4 flex items-center gap-4 text-xs font-medium shrink-0">
          <div className="flex items-center gap-2 border-b-2 border-primary h-full px-1 text-foreground">
            <List className="w-3.5 h-3.5" />
            Diagnostics & Match Information
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {error ? (
            <div className="p-4 flex items-start gap-3 text-red-500">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Regex Execution Error</p>
                <p className="text-xs text-red-500/80 mt-1 font-mono whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          ) : !regexStr ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
              <Info className="w-6 h-6 mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">Waiting for Pattern</p>
              <p className="text-xs max-w-[300px] leading-relaxed opacity-70">
                Enter a regular expression and test string above to see real-time match analytics, capture groups, and performance metrics.
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="p-6 flex items-center gap-2 text-muted-foreground text-sm justify-center">
              <AlertTriangle className="w-4 h-4" />
              No matches found.
            </div>
          ) : (
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matches.slice(0, 100).map((match, idx) => (
                <div key={idx} className="bg-muted/30 border border-muted-foreground/10 rounded-md overflow-hidden flex flex-col text-sm">
                  <div className="bg-muted/50 px-3 py-2 flex items-center justify-between border-b border-muted-foreground/10 text-xs">
                    <span className="font-semibold text-foreground/80">Match {idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Index: {match.index} | L: {match.fullMatch.length}</span>
                  </div>
                  
                  <div className="p-3 font-mono text-xs break-all text-blue-500 bg-blue-500/5 leading-relaxed">
                    {match.fullMatch}
                  </div>
                  
                  {match.groups.length > 0 && (
                    <div className="px-3 pb-3 space-y-1.5 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-2">Capture Groups</div>
                      {match.groups.map((group, gIdx) => (
                        <div key={gIdx} className="text-xs font-mono flex items-start gap-2 bg-background p-1.5 rounded border">
                          <span className="text-muted-foreground w-4 shrink-0 mt-0.5">#{gIdx + 1}</span>
                          <span className="text-foreground break-all leading-snug">
                            {group !== undefined ? group : <span className="text-muted-foreground/40 italic">undefined</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {matches.length > 100 && (
                <div className="p-4 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md col-span-full">
                  Showing first 100 of {matches.length} matches to preserve performance.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

    </div>
  );
}
