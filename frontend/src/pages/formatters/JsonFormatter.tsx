import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Play, Minimize2, Copy, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from 'sonner';

export function JsonFormatter() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEditorWillMount = (monacoInstance: any) => {
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

  const formatJson = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const minifyJson = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const clear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/5 h-14">
        <div className="flex items-center space-x-2">
          <Button onClick={formatJson} size="sm" className="h-8 shadow-sm">
            <Play className="w-3.5 h-3.5 mr-1.5" /> Format
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
          ) : output && (
            <div className="flex items-center text-[13px] text-green-500 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Valid JSON
            </div>
          )}
          <Button onClick={copyToClipboard} variant="outline" size="sm" className="h-8 shadow-sm" disabled={!output}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
        </div>
      </div>

      {/* SPLIT PANE */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} className="flex flex-col relative">
          <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Input</div>
          <Editor
            height="100%"
            language="json"
            theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
            value={input}
            onChange={(val) => setInput(val || '')}
            beforeMount={handleEditorWillMount}
            options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 32, bottom: 16 } }}
          />
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={50} className="flex flex-col relative bg-muted/5 border-l">
          <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Output</div>
          <Editor
            height="100%"
            language="json"
            theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
            value={output}
            beforeMount={handleEditorWillMount}
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, padding: { top: 32, bottom: 16 } }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
