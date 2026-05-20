import { useRef, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Trash2, FileJson } from 'lucide-react';

const INITIAL_ORIGINAL = '{\n  "version": "1.0",\n  "status": "active"\n}';
const INITIAL_MODIFIED = '{\n  "version": "1.1",\n  "status": "active",\n  "newField": true\n}';

export function JsonDiff() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);

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

  const handleEditorMount = (editorInstance: editor.IStandaloneDiffEditor) => {
    diffEditorRef.current = editorInstance;
  };

  const formatBoth = () => {
    if (!diffEditorRef.current) return;
    
    const originalEditor = diffEditorRef.current.getOriginalEditor();
    const modifiedEditor = diffEditorRef.current.getModifiedEditor();
    
    const originalVal = originalEditor.getValue();
    const modifiedVal = modifiedEditor.getValue();

    try {
      if (originalVal.trim()) {
        originalEditor.setValue(JSON.stringify(JSON.parse(originalVal), null, 2));
      }
    } catch (e) {
      // ignore parse errors
    }

    try {
      if (modifiedVal.trim()) {
        modifiedEditor.setValue(JSON.stringify(JSON.parse(modifiedVal), null, 2));
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  const clear = () => {
    if (!diffEditorRef.current) return;
    diffEditorRef.current.getOriginalEditor().setValue('');
    diffEditorRef.current.getModifiedEditor().setValue('');
  };

  useEffect(() => {
    return () => {
      // Cleanup to prevent memory leaks if component unmounts
      if (diffEditorRef.current) {
        diffEditorRef.current.dispose();
      }
    };
  }, []);

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
        <div className="absolute top-2 left-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase pointer-events-none">Original</div>
        <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase pointer-events-none">Modified</div>
        <DiffEditor
          height="100%"
          language="json"
          theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
          original={INITIAL_ORIGINAL}
          modified={INITIAL_MODIFIED}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorMount}
          options={{
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            padding: { top: 32, bottom: 16 }
          }}
        />
      </div>
    </div>
  );
}
