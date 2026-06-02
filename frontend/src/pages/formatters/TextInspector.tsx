import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, Copy, Type, CaseSensitive } from 'lucide-react';
import { toast } from 'sonner';
import { 
  camelCase, 
  snakeCase, 
  pascalCase, 
  kebabCase, 
  constantCase, 
  capitalCase, 
  noCase 
} from 'change-case';

export function TextInspector() {
  const [text, setText] = useState('Hello world! This is a test string for the DevSuite Text Inspector. Check out the case conversion below.');

  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const bytes = new Blob([text]).size;
    const lines = text ? text.split('\n').length : 0;
    const readingTime = Math.ceil(words / 200); // 200 wpm

    return { chars, words, bytes, lines, readingTime };
  }, [text]);

  const handleCopy = (content: string, label: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast.success(`Copied ${label}`);
  };

  const handleClear = () => setText('');
  
  const stripHtml = () => {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    setText(doc.body.textContent || "");
  };

  const removeExtraSpaces = () => {
    setText(text.replace(/\s+/g, ' ').trim());
  };

  const urlEncode = () => {
    setText(encodeURIComponent(text));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-orange-500" />
            Text Inspector & Case Converter
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Analyze raw text statistics and instantly convert across standard programming cases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Editor & Stats Panel */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-orange-500/20 shadow-sm flex flex-col h-full">
            <CardHeader className="bg-muted/10 border-b pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Type className="w-5 h-5 text-orange-500" />
                  Source Text
                </CardTitle>
                <CardDescription className="mt-1">Paste your raw text or string here.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                Clear
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1">
              <Textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 min-h-[250px] border-0 focus-visible:ring-0 resize-none font-mono text-sm p-6 bg-transparent"
                placeholder="Type or paste text here..."
                spellCheck={false}
              />
              
              {/* Toolbar */}
              <div className="border-t bg-muted/20 p-2 flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={removeExtraSpaces}>
                  Trim Spaces
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={stripHtml}>
                  Strip HTML
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={urlEncode}>
                  URL Encode
                </Button>
              </div>

              {/* Live Statistics */}
              <div className="border-t bg-card grid grid-cols-5 divide-x">
                <StatBox label="Words" value={stats.words} />
                <StatBox label="Chars" value={stats.chars} />
                <StatBox label="Bytes" value={stats.bytes} />
                <StatBox label="Lines" value={stats.lines} />
                <StatBox label="Read Time" value={`${stats.readingTime}m`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Casing Panel */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border shadow-sm h-full flex flex-col">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CaseSensitive className="w-5 h-5 text-orange-500" />
                Case Conversions
              </CardTitle>
              <CardDescription>Instantly transformed programmatic cases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 pt-6 flex-1 overflow-y-auto max-h-[500px] mac-scrollbar">
              
              <CaseRow label="camelCase" value={camelCase(text)} onCopy={() => handleCopy(camelCase(text), 'camelCase')} />
              <CaseRow label="PascalCase" value={pascalCase(text)} onCopy={() => handleCopy(pascalCase(text), 'PascalCase')} />
              <CaseRow label="snake_case" value={snakeCase(text)} onCopy={() => handleCopy(snakeCase(text), 'snake_case')} />
              <CaseRow label="kebab-case" value={kebabCase(text)} onCopy={() => handleCopy(kebabCase(text), 'kebab-case')} />
              <CaseRow label="CONSTANT_CASE" value={constantCase(text)} onCopy={() => handleCopy(constantCase(text), 'CONSTANT_CASE')} />
              <CaseRow label="Title Case" value={capitalCase(text)} onCopy={() => handleCopy(capitalCase(text), 'Title Case')} />
              <CaseRow label="lower case" value={noCase(text)} onCopy={() => handleCopy(noCase(text), 'lower case')} />

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="p-3 flex flex-col items-center justify-center">
      <span className="text-xl font-bold text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">{label}</span>
    </div>
  );
}

function CaseRow({ label, value, onCopy }: { label: string, value: string, onCopy: () => void }) {
  return (
    <div className="flex flex-col py-3 border-b last:border-0 group hover:bg-muted/30 px-3 -mx-3 rounded transition-colors relative">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
      <div className="font-mono text-sm text-foreground pr-8 break-all max-h-20 overflow-y-auto mac-scrollbar">
        {value || <span className="text-muted-foreground/30 italic">Empty</span>}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 bg-background shadow-sm border" 
        onClick={onCopy}
      >
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
