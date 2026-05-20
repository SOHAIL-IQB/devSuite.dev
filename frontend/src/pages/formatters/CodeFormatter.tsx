import { useState, useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Play, Minimize2, Copy, Trash2, CheckCircle2, Code2, Loader2, XCircle, AlertTriangle } from 'lucide-react';
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
  const monaco = useMonaco();

  const [activeLang, setActiveLang] = useState<FormatterType>('json');
  const [markers, setMarkers] = useState<editor.IMarkerData[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [content, setContent] = useState('');

  const debouncedContent = useDebounce(content, 500);
  const strategy = formatters[activeLang];

  // Enable Monaco Native TypeScript Semantic Validation
  useEffect(() => {
    if (monaco) {
      const ts = (monaco.languages as any).typescript;
      if (ts && ts.typescriptDefaults) {
        ts.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });
        ts.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });
      }
    }
  }, [monaco]);

  // Sync Monaco Markers
  useEffect(() => {
    if (!editorRef.current || !monaco) return;
    const disposable = editorRef.current.onDidChangeModelDecorations(() => {
      const model = editorRef.current?.getModel();
      if (model) {
        const allMarkers = monaco.editor.getModelMarkers({ resource: model.uri });
        setMarkers(allMarkers);
        const hasErrors = allMarkers.some(m => m.severity === monaco.MarkerSeverity.Error);
        setIsValid(model.getValue().trim() ? !hasErrors : null);
      }
    });
    return () => disposable.dispose();
  }, [monaco]);

  // Custom Background Validation
  useEffect(() => {
    if (!editorRef.current || !monaco) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const validate = async () => {
      if (!debouncedContent.trim()) {
        monaco.editor.setModelMarkers(model, 'devworkspace', []);
        return;
      }
      
      const customDiagnostics = await strategy.validate(debouncedContent);
      const monacoMarkers: editor.IMarkerData[] = customDiagnostics.map(d => ({
        severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        message: d.message,
        startLineNumber: d.startLineNumber,
        startColumn: d.startColumn,
        endLineNumber: d.endLineNumber,
        endColumn: d.endColumn,
      }));
      
      // Inject custom markers alongside native ones
      monaco.editor.setModelMarkers(model, 'devworkspace', monacoMarkers);
    };
    validate();
  }, [debouncedContent, strategy, monaco]);


  const handleEditorWillMount = (monacoInstance: typeof monaco) => {
    if (!monacoInstance) return;
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
    if (!inputVal.trim()) return;

    setIsFormatting(true);
    const result = await strategy.format(inputVal);
    
    if (result.isValid) {
      executeFormat(result.formatted);
      toast.success(`${strategy.name} Formatted`);
    } else {
      toast.error('Formatting Failed');
    }
    setIsFormatting(false);
  };

  const minifyCode = async () => {
    if (!editorRef.current || !strategy.minify) return;
    const inputVal = editorRef.current.getValue();
    if (!inputVal.trim()) return;

    setIsFormatting(true);
    const result = await strategy.minify(inputVal);
    
    if (result.isValid) {
      executeFormat(result.formatted);
      toast.success(`${strategy.name} Minified`);
    } else {
      toast.error('Minification Failed');
    }
    setIsFormatting(false);
  };

  const onLanguageChange = (val: FormatterType) => {
    setActiveLang(val);
    if (editorRef.current) {
      editorRef.current.setValue(DEFAULT_CONTENT[val]);
    }
  };

  const clear = () => {
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  };

  const copyToClipboard = () => {
    if (!editorRef.current) return;
    const outputVal = editorRef.current.getValue();
    if (!outputVal) return;
    navigator.clipboard.writeText(outputVal);
    toast.success('Copied to clipboard');
  };

  const jumpToMarker = (marker: editor.IMarkerData) => {
    if (!editorRef.current) return;
    editorRef.current.setPosition({ lineNumber: marker.startLineNumber, column: marker.startColumn });
    editorRef.current.revealLineInCenter(marker.startLineNumber);
    editorRef.current.focus();
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
          {isValid === true ? (
            <div className="flex items-center text-[13px] text-green-500 font-medium bg-green-500/10 px-2 py-1 rounded">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Valid {strategy.name}
            </div>
          ) : isValid === false ? (
            <div className="flex items-center text-[13px] text-red-500 font-medium bg-red-500/10 px-2 py-1 rounded">
              <XCircle className="w-4 h-4 mr-1.5" /> {markers.length} {markers.length === 1 ? 'Error' : 'Errors'}
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

      {/* PROBLEMS PANEL */}
      <div className="h-[200px] border-t bg-background flex flex-col shrink-0">
        <div className="flex items-center px-4 py-2 border-b bg-muted/5 shrink-0">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center">
            Problems
            <span className="ml-2 bg-muted-foreground/20 text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
              {markers.length}
            </span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {markers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
              No problems detected.
            </div>
          ) : (
            markers.map((marker, idx) => (
              <div 
                key={idx} 
                className="flex items-start p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                onClick={() => jumpToMarker(marker)}
              >
                {marker.severity === monaco?.MarkerSeverity.Error ? (
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 mr-3 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 mr-3 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-[13px] text-foreground font-medium break-words leading-snug">
                    {marker.message}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    [Line {marker.startLineNumber}, Col {marker.startColumn}]
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
