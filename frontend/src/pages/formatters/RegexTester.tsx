import { useState, useEffect, useRef } from 'react';
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
  List
} from 'lucide-react';

export function RegexTester() {
  const [regexStr, setRegexStr] = useState('[A-Za-z]+');
  const [flags, setFlags] = useState('g');
  const [targetText, setTargetText] = useState('Hello 123 Regex Tester!');
  
  const [matches, setMatches] = useState<RegExpMatchArray[]>([]);
  const [error, setError] = useState('');
  const [execTime, setExecTime] = useState(0);

  const targetRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and highlight div
  const handleScroll = () => {
    if (targetRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = targetRef.current.scrollTop;
      highlightRef.current.scrollLeft = targetRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    if (!regexStr) {
      setMatches([]);
      setError('');
      return;
    }

    const start = performance.now();
    try {
      const re = new RegExp(regexStr, flags);
      setError('');

      if (!targetText) {
        setMatches([]);
      } else {
        if (flags.includes('g')) {
          const allMatches = Array.from(targetText.matchAll(re));
          setMatches(allMatches);
        } else {
          const match = targetText.match(re);
          setMatches(match ? [match as RegExpMatchArray] : []);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setMatches([]);
    }
    const end = performance.now();
    setExecTime(Math.round((end - start) * 100) / 100);
  }, [regexStr, flags, targetText]);

  // Actions

  const handlePasteTarget = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error('Clipboard API is not supported in this browser or requires HTTPS.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setTargetText(text);
        toast.success('Pasted target text');
      } else {
        toast.info('Clipboard is empty');
      }
    } catch (err: any) {
      toast.error('Clipboard permission denied or failed.');
    }
  };

  const handleClear = () => {
    setRegexStr('');
    setTargetText('');
    setMatches([]);
    setError('');
  };

  const getHighlightedElements = () => {
    if (!regexStr || error || matches.length === 0 || !targetText) return <>{targetText}</>;

    const elements = [];
    let lastIndex = 0;

    // To prevent infinite loops or massive DOM slow downs on bad regex
    const maxHighlights = 2000;
    const safeMatches = matches.slice(0, maxHighlights);

    safeMatches.forEach((match, i) => {
      const start = match.index!;
      const text = match[0];
      
      // If match is empty string, we can't highlight it normally, skip rendering to avoid infinite 0-width spans
      if (text.length === 0) return;

      if (start > lastIndex) {
        elements.push(<span key={`text-${i}`}>{targetText.slice(lastIndex, start)}</span>);
      }
      
      // Alternating colors for adjacent matches (optional, but good for UX)
      const isEven = i % 2 === 0;
      elements.push(
        <mark 
          key={`match-${i}`} 
          className={`rounded-sm px-[1px] text-transparent ${isEven ? 'bg-blue-500/30' : 'bg-cyan-500/30'}`}
        >
          {text}
        </mark>
      );
      lastIndex = start + text.length;
    });

    if (lastIndex < targetText.length) {
      elements.push(<span key="text-end">{targetText.slice(lastIndex)}</span>);
    }

    if (matches.length > maxHighlights) {
      elements.push(<span key="warning" className="text-red-500">... (Too many matches, truncating highlights)</span>);
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
                  <XCircle className="w-3 h-3 mr-1" /> Invalid Regex
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-medium h-5 bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
                </Badge>
              )}
              {execTime > 0 && !error && (
                <span className="text-[10px] text-muted-foreground">{execTime}ms</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4 bg-muted/10">
        
        {/* REGEX INPUT SECTION */}
        <div className="shrink-0 flex flex-col bg-card border rounded-lg shadow-sm overflow-hidden">
          <div className="h-9 border-b bg-muted/20 px-3 flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Expression</Badge>
          </div>
          <div className="p-4 flex gap-2 items-center">
            <span className="text-2xl text-muted-foreground font-mono font-light">/</span>
            <Input 
              value={regexStr}
              onChange={(e) => setRegexStr(e.target.value)}
              placeholder="Enter regular expression..."
              className="flex-1 font-mono text-base border-muted-foreground/20 focus-visible:ring-primary/20"
              autoFocus
            />
            <span className="text-2xl text-muted-foreground font-mono font-light">/</span>
            <Input 
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              placeholder="g, i, m..."
              className="w-20 font-mono text-base border-muted-foreground/20 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        {/* TARGET TEXT SECTION */}
        <div className="flex-1 flex flex-col min-h-[200px] bg-card border rounded-lg shadow-sm overflow-hidden relative">
          <div className="h-10 border-b bg-muted/20 px-3 flex items-center justify-between shrink-0 z-20 relative bg-card">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Test String</Badge>
              {!error && matches.length > 0 && (
                <span className="text-xs text-blue-500 font-medium">{matches.length} match{matches.length !== 1 && 'es'}</span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePasteTarget} title="Paste Target Text">
                <ClipboardPaste className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear} title="Clear All">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden bg-background">
            {/* Highlights Layer (Behind) */}
            <div 
              ref={highlightRef}
              className="absolute inset-0 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words overflow-auto pointer-events-none z-0"
              aria-hidden="true"
            >
              {getHighlightedElements()}
            </div>
            
            {/* Input Layer (Front, transparent background) */}
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

      </div>

      {/* BOTTOM MATCHES & DIAGNOSTICS PANEL */}
      <div className="border-t bg-card shrink-0 h-[250px] flex flex-col">
        <div className="h-9 border-b bg-muted/20 px-4 flex items-center gap-4 text-xs font-medium shrink-0">
          <div className="flex items-center gap-2 border-b-2 border-primary h-full px-1 text-foreground">
            <List className="w-3.5 h-3.5" />
            Match Information
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {error ? (
            <div className="p-4 flex items-start gap-3 text-red-500">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Invalid Regular Expression</p>
                <p className="text-xs text-red-500/80 mt-1 font-mono">{error}</p>
              </div>
            </div>
          ) : !regexStr ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
              <Info className="w-5 h-5 mb-2 opacity-20" />
              <p className="text-xs">Enter a regular expression to see matches.</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="w-4 h-4" />
              No matches found in the target string.
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {matches.slice(0, 100).map((match, idx) => (
                <div key={idx} className="bg-muted/30 border rounded overflow-hidden">
                  <div className="bg-muted/50 px-3 py-1.5 flex items-center justify-between border-b text-xs">
                    <span className="font-semibold text-muted-foreground">Match {idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Index: {match.index}</span>
                  </div>
                  <div className="p-3 font-mono text-sm break-all text-blue-500/90 bg-blue-500/5">
                    {match[0]}
                  </div>
                  {match.length > 1 && (
                    <div className="px-3 pb-3 space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 mt-2">Captured Groups</div>
                      {Array.from(match).slice(1).map((group, gIdx) => (
                        <div key={gIdx} className="text-xs font-mono flex items-start gap-2">
                          <span className="text-muted-foreground w-4">#{gIdx + 1}</span>
                          <span className="text-foreground break-all">{group !== undefined ? group : <span className="text-muted-foreground/50 italic">undefined</span>}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {matches.length > 100 && (
                <div className="p-3 text-center text-xs text-muted-foreground border border-dashed rounded">
                  Showing first 100 of {matches.length} matches.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

    </div>
  );
}
