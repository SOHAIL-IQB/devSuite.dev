import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Play, Copy, Trash2, Download, AlertCircle } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from 'sonner';

export function JsonToCsv() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [input, setInput] = useState('[\n  { "id": 1, "name": "Alice", "role": "Admin" },\n  { "id": 2, "name": "Bob", "role": "User" }\n]');
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

  const convertToCsv = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      
      if (!Array.isArray(parsed)) {
        throw new Error("Input must be an array of JSON objects.");
      }
      if (parsed.length === 0) {
        setOutput('');
        return;
      }

      const headers = Array.from(new Set(parsed.flatMap(Object.keys)));
      const csvRows = [];
      
      // Add Headers
      csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

      // Add Rows
      for (const row of parsed) {
        const values = headers.map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          const str = String(val);
          // Escape quotes and wrap in quotes
          return `"${str.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      setOutput(csvRows.join('\n'));
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
    toast.success('Copied CSV to clipboard');
  };

  const downloadCsv = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/csv' });
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
    <div className="flex flex-col h-full bg-background">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/5 h-14">
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
          <Button onClick={copyToClipboard} variant="outline" size="sm" className="h-8 shadow-sm" disabled={!output}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
          <Button onClick={downloadCsv} variant="outline" size="sm" className="h-8 shadow-sm" disabled={!output}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
          </Button>
        </div>
      </div>

      {/* SPLIT PANE */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} className="flex flex-col relative">
          <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">JSON Array Input</div>
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
          <div className="absolute top-2 right-4 z-10 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">CSV Output</div>
          <Editor
            height="100%"
            language="csv"
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
