import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Play, Copy, Trash2, Download, AlertCircle } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from 'sonner';

// Recursive flatten function for deeply nested objects
const flattenObject = (ob: any): Record<string, any> => {
  const toReturn: Record<string, any> = {};

  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      const flatObject = flattenObject(ob[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
};

export function JsonToCsv() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const inputEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const outputEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const [hasOutput, setHasOutput] = useState(false);
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

  const convertToCsv = () => {
    if (!inputEditorRef.current || !outputEditorRef.current) return;
    
    const inputVal = inputEditorRef.current.getValue();
    if (!inputVal.trim()) {
      outputEditorRef.current.setValue('');
      setHasOutput(false);
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(inputVal);
      
      if (!Array.isArray(parsed)) {
        throw new Error("Input must be an array of JSON objects.");
      }
      if (parsed.length === 0) {
        outputEditorRef.current.setValue('');
        setHasOutput(false);
        setError(null);
        return;
      }

      // Flatten each object in the array to support nested objects safely
      const flattenedArray = parsed.map(item => typeof item === 'object' && item !== null ? flattenObject(item) : item);

      // Extract all unique headers across all flattened objects
      const headers = Array.from(new Set(flattenedArray.flatMap(obj => typeof obj === 'object' ? Object.keys(obj) : [])));
      const csvRows = [];
      
      // Add Headers
      csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

      // Add Rows
      for (const row of flattenedArray) {
        if (typeof row !== 'object' || row === null) {
          csvRows.push(`"${String(row).replace(/"/g, '""')}"`);
          continue;
        }

        const values = headers.map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val); // Stringify arrays or strange objects left over
          return `"${str.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      outputEditorRef.current.setValue(csvRows.join('\n'));
      setError(null);
      setHasOutput(true);
    } catch (e: any) {
      setError(e.message);
      setHasOutput(false);
    }
  };

  const clear = () => {
    if (inputEditorRef.current) inputEditorRef.current.setValue('');
    if (outputEditorRef.current) outputEditorRef.current.setValue('');
    setError(null);
    setHasOutput(false);
  };

  const copyToClipboard = () => {
    if (!outputEditorRef.current || !hasOutput) return;
    const outputVal = outputEditorRef.current.getValue();
    if (!outputVal) return;
    navigator.clipboard.writeText(outputVal);
    toast.success('Copied CSV to clipboard');
  };

  const downloadCsv = () => {
    if (!outputEditorRef.current || !hasOutput) return;
    const outputVal = outputEditorRef.current.getValue();
    if (!outputVal) return;
    
    const blob = new Blob([outputVal], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded CSV');
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden min-h-0">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/5 h-14 shrink-0">
        <div className="flex items-center space-x-2">
          <Button onClick={convertToCsv} size="sm" className="h-8 shadow-sm">
            <Play className="w-3.5 h-3.5 mr-1.5" /> Convert to CSV
          </Button>
          <Button onClick={clear} variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          {error && (
            <div className="flex items-center text-[13px] text-red-500 font-medium bg-red-500/10 px-2 py-1 rounded">
              <AlertCircle className="w-4 h-4 mr-1.5" /> {error}
            </div>
          )}
          <Button onClick={copyToClipboard} variant="outline" size="sm" className="h-8 shadow-sm" disabled={!hasOutput}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
          <Button onClick={downloadCsv} variant="outline" size="sm" className="h-8 shadow-sm" disabled={!hasOutput}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
          </Button>
        </div>
      </div>

      {/* SPLIT PANE */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanel defaultSize={50} className="flex flex-col relative overflow-hidden min-h-0">
          <div className="absolute inset-0">
            <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase pointer-events-none">JSON Array Input</div>
            <Editor
              height="100%"
              language="json"
              theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
              defaultValue={'[\n  { "id": 1, "name": "Alice", "role": "Admin", "address": { "city": "NY" } },\n  { "id": 2, "name": "Bob", "role": "User" }\n]'}
              onMount={(editor) => inputEditorRef.current = editor}
              beforeMount={handleEditorWillMount}
              options={{ 
                minimap: { enabled: false }, 
                fontSize: 13, 
                padding: { top: 32, bottom: 16 },
                fixedOverflowWidgets: true,
                automaticLayout: true,
                scrollBeyondLastLine: false
              }}
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={50} className="flex flex-col relative bg-muted/5 border-l overflow-hidden min-h-0">
          <div className="absolute inset-0">
            <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase pointer-events-none">CSV Output</div>
            <Editor
              height="100%"
              language="csv"
              theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
              defaultValue=""
              onMount={(editor) => outputEditorRef.current = editor}
              beforeMount={handleEditorWillMount}
              options={{ 
                readOnly: true, 
                minimap: { enabled: false }, 
                fontSize: 13, 
                padding: { top: 32, bottom: 16 },
                fixedOverflowWidgets: true,
                automaticLayout: true,
                scrollBeyondLastLine: false
              }}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
