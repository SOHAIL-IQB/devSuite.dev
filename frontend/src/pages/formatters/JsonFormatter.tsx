import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Play, Minimize2, Copy, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function JsonFormatter() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const formatJson = () => {
    if (!editorRef.current) return;
    const inputVal = editorRef.current.getValue();
    if (!inputVal.trim()) {
      setError(null);
      setIsValid(false);
      return;
    }

    try {
      const parsed = JSON.parse(inputVal);
      executeFormat(JSON.stringify(parsed, null, 2));
      setError(null);
      setIsValid(true);
    } catch (e: any) {
      setError(e.message);
      setIsValid(false);
    }
  };

  const minifyJson = () => {
    if (!editorRef.current) return;
    const inputVal = editorRef.current.getValue();
    if (!inputVal.trim()) {
      setError(null);
      setIsValid(false);
      return;
    }

    try {
      const parsed = JSON.parse(inputVal);
      executeFormat(JSON.stringify(parsed));
      setError(null);
      setIsValid(true);
    } catch (e: any) {
      setError(e.message);
      setIsValid(false);
    }
  };

  const clear = () => {
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
    setError(null);
    setIsValid(false);
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
          <Button onClick={formatJson} size="sm" className="h-8 shadow-sm">
            <Play className="w-3.5 h-3.5 mr-1.5" /> Format In-Place
          </Button>
          <Button onClick={minifyJson} variant="outline" size="sm" className="h-8 shadow-sm">
            <Minimize2 className="w-3.5 h-3.5 mr-1.5" /> Minify
          </Button>
          <Button onClick={clear} variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          {error ? (
            <div className="flex items-center text-[13px] text-red-500 font-medium bg-red-500/10 px-2 py-1 rounded">
              <AlertCircle className="w-4 h-4 mr-1.5" /> Invalid JSON
            </div>
          ) : isValid && (
            <div className="flex items-center text-[13px] text-green-500 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Valid JSON
            </div>
          )}
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
            language="json"
            theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
            defaultValue={'{\n  "status": "ready",\n  "message": "Paste your JSON here..."\n}'}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorMount}
            onChange={() => {
              if (error) setError(null);
            }}
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
