import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Play, Minimize2, Copy, Trash2, CheckCircle2, AlertCircle, Code2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatters } from '@/lib/formatters';
import type { FormatterType } from '@/lib/formatters';
import { useDebounce } from '@/hooks/useDebounce';

const DEFAULT_CONTENT: Record<FormatterType, string> = {
  json: '{\n  "status": "ready",\n  "message": "Paste your JSON here..."\n}',
  xml: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <status>ready</status>\n  <message>Paste your XML here...</message>\n</root>',
  yaml: 'status: ready\nmessage: Paste your YAML here...',
  sql: 'SELECT status, message FROM app_state WHERE id = 1;',
  html: '<div class="app">\n  <h1>Status: Ready</h1>\n  <p>Paste your HTML here...</p>\n</div>',
  css: '.app {\n  color: #333;\n  background: #fff;\n}',
  javascript: 'const state = {\n  status: "ready",\n  message: "Paste your JS here..."\n};\nconsole.log(state);',
  typescript: 'interface State {\n  status: string;\n  message: string;\n}\nconst state: State = {\n  status: "ready",\n  message: "Paste your TS here..."\n};',
  markdown: '# Ready\n\nPaste your Markdown here...',
};

export function CodeFormatter() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const [activeLang, setActiveLang] = useState<FormatterType>('json');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [content, setContent] = useState('');

  const debouncedContent = useDebounce(content, 500);
  const strategy = formatters[activeLang];

  const handleEditorWillMount = (monacoInstance: Monaco) => {
    monacoInstance.editor.defineTheme('devworkspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#09090b',
        'editor.lineHighlightBackground': '#18181b',
        'editorLineNumber.foreground': '#52525b',
        'editorIndentGuide.background': '#27272a',
      },
    });
    monacoInstance.editor.defineTheme('devworkspace-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
      },
    });
  };

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance;
    // Set initial content based on language
    editorInstance.setValue(DEFAULT_CONTENT[activeLang]);
  };

  const executeFormat = (formattedText: string) => {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    
    editorRef.current.pushUndoStop();
    editorRef.current.executeEdits("formatter", [{
      range: model.getFullModelRange(),
      text: formattedText
    }]);
    editorRef.current.pushUndoStop();
  };

  const formatCode = async () => {
    if (!editorRef.current) return;
    const inputVal = editorRef.current.getValue();
    if (!inputVal.trim()) {
      setError(null);
      setIsValid(null);
      return;
    }

    setIsFormatting(true);
    const result = await strategy.format(inputVal);
    
    if (result.isValid) {
      executeFormat(result.formatted);
      setError(null);
      setIsValid(true);
      toast.success(`${strategy.name} Formatted`);
    } else {
      setError(result.error || 'Unknown format error');
      setIsValid(false);
      toast.error('Formatting Failed');
    }
    setIsFormatting(false);
  };

  const minifyCode = async () => {
    if (!editorRef.current || !strategy.minify) return;
    const inputVal = editorRef.current.getValue();
    if (!inputVal.trim()) {
      setError(null);
      setIsValid(null);
      return;
    }

    setIsFormatting(true);
    const result = await strategy.minify(inputVal);
    
    if (result.isValid) {
      executeFormat(result.formatted);
      setError(null);
      setIsValid(true);
      toast.success(`${strategy.name} Minified`);
    } else {
      setError(result.error || 'Unknown format error');
      setIsValid(false);
      toast.error('Minification Failed');
    }
    setIsFormatting(false);
  };

  // Background Validation
  useEffect(() => {
    const validate = async () => {
      if (!debouncedContent.trim()) {
        setIsValid(null);
        setError(null);
        return;
      }
      
      const result = await strategy.format(debouncedContent);
      if (result.isValid) {
        setIsValid(true);
        setError(null);
      } else {
        setIsValid(false);
        // Only show first line of error to keep UI clean
        const shortError = result.error?.split('\n')[0] || 'Invalid syntax';
        setError(shortError);
      }
    };
    validate();
  }, [debouncedContent, strategy]);

  const onLanguageChange = (val: FormatterType) => {
    setActiveLang(val);
    setIsValid(null);
    setError(null);
    if (editorRef.current) {
      editorRef.current.setValue(DEFAULT_CONTENT[val]);
    }
  };

  const clear = () => {
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
    setError(null);
    setIsValid(null);
  };

  const copyToClipboard = () => {
    if (!editorRef.current) return;
    const outputVal = editorRef.current.getValue();
    if (!outputVal) return;
    navigator.clipboard.writeText(outputVal);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden min-h-0">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/5 h-14 shrink-0">
        <div className="flex items-center space-x-2">
          
          <Select value={activeLang} onValueChange={onLanguageChange as any}>
            <SelectTrigger className="w-[140px] h-8 text-[13px] shadow-sm">
              <Code2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(formatters).map(([key, strat]) => (
                <SelectItem key={key} value={key} className="text-[13px]">
                  {strat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-px h-4 bg-border mx-1" />

          <Button onClick={formatCode} disabled={isFormatting} size="sm" className="h-8 shadow-sm transition-all">
            {isFormatting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />} 
            Format In-Place
          </Button>
          
          {strategy.minify && (
            <Button onClick={minifyCode} disabled={isFormatting} variant="outline" size="sm" className="h-8 shadow-sm">
              <Minimize2 className="w-3.5 h-3.5 mr-1.5" /> Minify
            </Button>
          )}

          <Button onClick={clear} variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          {error ? (
            <div className="flex items-center text-[13px] text-red-500 font-medium bg-red-500/10 px-2 py-1 rounded max-w-[400px] truncate">
              <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" /> <span className="truncate">{error}</span>
            </div>
          ) : isValid === true ? (
            <div className="flex items-center text-[13px] text-green-500 font-medium bg-green-500/10 px-2 py-1 rounded">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Valid {strategy.name}
            </div>
          ) : null}
          <Button onClick={copyToClipboard} variant="outline" size="sm" className="h-8 shadow-sm">
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
        </div>
      </div>

      {/* SINGLE PANE EDITOR */}
      <div className="flex-1 min-h-0 relative bg-background overflow-hidden">
        <div className="absolute inset-0">
          <Editor
            height="100%"
            language={strategy.monacoLanguage}
            theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
            defaultValue={DEFAULT_CONTENT[activeLang]}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorMount}
            onChange={(val) => setContent(val || '')}
            options={{ 
              minimap: { enabled: false }, 
              fontSize: 13, 
              padding: { top: 24, bottom: 24 },
              fixedOverflowWidgets: true,
              automaticLayout: true,
              scrollBeyondLastLine: false
            }}
          />
        </div>
      </div>
    </div>
  );
}
