import { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Trash2, FileJson } from 'lucide-react';

export function JsonDiff() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [original, setOriginal] = useState('{\n  "version": "1.0",\n  "status": "active"\n}');
  const [modified, setModified] = useState('{\n  "version": "1.1",\n  "status": "active",\n  "newField": true\n}');

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

  const formatBoth = () => {
    try {
      if (original) setOriginal(JSON.stringify(JSON.parse(original), null, 2));
      if (modified) setModified(JSON.stringify(JSON.parse(modified), null, 2));
    } catch (e) {
      // ignore parse errors for formatting
    }
  };

  const clear = () => {
    setOriginal('');
    setModified('');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/5 h-14">
        <div className="flex items-center space-x-2">
          <Button onClick={formatBoth} size="sm" className="h-8 shadow-sm">
            <FileJson className="w-3.5 h-3.5 mr-1.5" /> Format Both
          </Button>
          <Button onClick={clear} variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
          </Button>
        </div>
        <div className="text-[12px] font-medium text-muted-foreground">
          <span className="text-red-400 mr-2">- Removed</span>
          <span className="text-green-400">+ Added</span>
        </div>
      </div>

      {/* DIFF VIEWER */}
      <div className="flex-1 min-h-0 bg-background relative">
        <div className="absolute top-2 left-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Original</div>
        <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Modified</div>
        <DiffEditor
          height="100%"
          language="json"
          theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
          original={original}
          modified={modified}
          beforeMount={handleEditorWillMount}
          options={{
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            padding: { top: 32, bottom: 16 }
          }}
          onMount={(editor) => {
            editor.getOriginalEditor().onDidChangeModelContent(() => {
              setOriginal(editor.getOriginalEditor().getValue());
            });
            editor.getModifiedEditor().onDidChangeModelContent(() => {
              setModified(editor.getModifiedEditor().getValue());
            });
          }}
        />
      </div>
    </div>
  );
}
