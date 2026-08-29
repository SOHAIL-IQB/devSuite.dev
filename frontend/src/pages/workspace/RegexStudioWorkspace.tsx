import { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  explainRegex,
  testRegex,
  REGEX_LIBRARY,
  type RegexSnippet,
} from '@/lib/regex_visualizer.utils';
import {
  Regex as RegexIcon,
  Copy,
  CheckCircle2,
  XCircle,
  Sparkles,
  BookOpen,
  ArrowRightLeft
} from 'lucide-react';

export function RegexStudioWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [pattern, setPattern] = useState('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})');
  const [flags, setFlags] = useState('gm');
  const [testText, setTestText] = useState(
    `Contact our engineering team:\n` +
    `- Support: support@devsuite.dev\n` +
    `- Security: security.team@corp.example.com\n` +
    `- Admin: admin_101@infra-node.io`
  );
  const [replacePattern, setReplacePattern] = useState('USER: $1 [DOMAIN: $2]');

  const tokens = useMemo(() => explainRegex(pattern), [pattern]);
  const testResult = useMemo(() => testRegex(pattern, flags, testText, replacePattern), [pattern, flags, testText, replacePattern]);

  const handleCopy = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${label} copied to clipboard`);
  };

  const applySnippet = (snippet: RegexSnippet) => {
    setPattern(snippet.pattern);
    setFlags(snippet.flags || 'g');
    toast.success(`Loaded pattern: ${snippet.title}`);
  };

  const toggleFlag = (flagChar: string) => {
    setFlags((prev) => (prev.includes(flagChar) ? prev.replace(flagChar, '') : prev + flagChar));
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
            <RegexIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">RegEx Visualizer & Pattern Studio</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-pink-500 border-pink-500/30">
                AST Inspector
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Deep regex AST token analysis, real-time match & capture group inspector, and substitution engine.
            </p>
          </div>
        </div>

        {/* Snippet Picker */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
            <BookOpen className="w-3.5 h-3.5" /> Presets:
          </div>
          <div className="flex flex-wrap gap-1.5 max-w-xl">
            {REGEX_LIBRARY.slice(0, 5).map((snippet) => (
              <Button
                key={snippet.title}
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2"
                onClick={() => applySnippet(snippet)}
              >
                {snippet.title.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* PATTERN INPUT & FLAGS */}
      <div className="p-3 border rounded-lg bg-background flex flex-col md:flex-row items-center gap-3 shrink-0">
        <div className="flex-1 flex items-center gap-2 w-full">
          <span className="font-mono text-sm text-muted-foreground font-bold">/</span>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regular expression..."
            className="font-mono text-xs h-9 flex-1"
          />
          <span className="font-mono text-sm text-muted-foreground font-bold">/</span>
          <Input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="flags"
            className="font-mono text-xs h-9 w-16 text-center"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {['g', 'i', 'm', 's'].map((f) => (
            <label
              key={f}
              className={`px-2 py-1 rounded border cursor-pointer font-mono text-xs transition-colors ${
                flags.includes(f) ? 'bg-pink-500 text-white border-pink-500' : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <input
                type="checkbox"
                checked={flags.includes(f)}
                onChange={() => toggleFlag(f)}
                className="sr-only"
              />
              {f}
            </label>
          ))}
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: AST EXPLANATION & MATCHES (5 COLS) */}
        <div className="md:col-span-5 flex flex-col gap-3 min-h-0">
          
          {/* AST Explainer */}
          <div className="flex-1 border rounded-lg bg-background p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 border-b shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Pattern Breakdown & AST
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {tokens.length} tokens
              </Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto pt-2 space-y-1.5 mac-scrollbar">
              {tokens.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-3 text-center">No pattern entered</div>
              ) : (
                tokens.map((tok, i) => (
                  <div key={i} className="p-2 rounded border bg-muted/10 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono bg-background px-1.5 py-0.5 rounded border text-pink-500 font-semibold text-[11px]">
                        {tok.raw}
                      </span>
                      <span className="text-foreground">{tok.description}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono shrink-0">
                      {tok.type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Match Results Table */}
          <div className="h-44 border rounded-lg bg-background p-3 flex flex-col shrink-0 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b shrink-0">
              <div className="flex items-center space-x-2">
                {testResult.matched ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs font-bold">Matches Found ({testResult.matchCount})</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-2 space-y-1 mac-scrollbar">
              {testResult.matches.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-2 text-center">No matches in test string</div>
              ) : (
                testResult.matches.map((m, idx) => (
                  <div key={idx} className="p-1.5 border rounded bg-muted/10 text-xs font-mono flex items-center justify-between">
                    <span className="text-pink-500 truncate mr-2 font-semibold">#{idx + 1}: &quot;{m.text}&quot;</span>
                    <span className="text-muted-foreground text-[10px] shrink-0">index {m.index}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TEST STRING & SUBSTITUTION PLAYGROUND (7 COLS) */}
        <div className="md:col-span-7 flex flex-col gap-3 min-h-0">
          
          {/* Test String Input */}
          <div className="flex-1 border rounded-lg bg-background flex flex-col min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-10">
              <span className="text-xs font-mono font-semibold text-muted-foreground">Test Text</span>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="plaintext"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={testText}
                onChange={(val) => setTestText(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  padding: { top: 10, bottom: 10 },
                }}
                className="absolute inset-0"
              />
            </div>
          </div>

          {/* Substitution Playground */}
          <div className="h-52 border rounded-lg bg-background p-3 flex flex-col shrink-0 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-pink-500" /> Substitution & Replace Engine
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px]"
                onClick={() => handleCopy(testResult.replacedText || '', 'Transformed text')}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy Output
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 flex-1 min-h-0">
              <div className="space-y-1 flex flex-col">
                <Label className="text-[11px] text-muted-foreground">Replacement Template (e.g. $1, $2)</Label>
                <Input
                  value={replacePattern}
                  onChange={(e) => setReplacePattern(e.target.value)}
                  placeholder="$1 - $2"
                  className="font-mono text-xs h-7"
                />
              </div>

              <div className="space-y-1 flex flex-col">
                <Label className="text-[11px] text-muted-foreground">Transformed Result</Label>
                <Textarea
                  readOnly
                  value={testResult.replacedText || ''}
                  className="font-mono text-xs flex-1 resize-none bg-muted/20 mac-scrollbar"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
