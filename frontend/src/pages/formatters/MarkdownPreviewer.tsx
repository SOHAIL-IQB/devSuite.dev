import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileCode2, Eye, Download, Code2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const DEFAULT_MARKDOWN = "# DevSuite Markdown Editor\n\nWelcome to the **SaaS-grade** markdown previewer.\n\n## Features\n- GitHub Flavored Markdown (GFM)\n- Tables and Task Lists\n- Code Syntax Highlighting\n- Natively rendered Mermaid diagrams\n\n### Example Code Block\n```javascript\nfunction greet(name) {\n  return 'Hello, ' + name + '!';\n}\nconsole.log(greet('Developer'));\n```\n\n### Example Mermaid Diagram\n```mermaid\ngraph TD;\n    A[Client]-->B[Nginx Proxy];\n    B-->C[Node.js API];\n    C-->D[(PostgreSQL)];\n    C-->E[(Redis Cache)];\n```\n\n- [x] Check this box\n- [ ] Unchecked box\n";

// Dynamic Mermaid Component
function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    const renderChart = async () => {
      try {
        if (ref.current) {
          const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
          const { svg } = await mermaid.render(id, chart);
          ref.current.innerHTML = svg;
        }
      } catch (e: any) {
        if (ref.current) {
          ref.current.innerHTML = '<pre class="text-xs text-red-500 bg-red-500/10 p-4 rounded">' + (e.message || 'Invalid Mermaid Syntax') + '</pre>';
        }
      }
    };
    renderChart();
  }, [chart]);

  return <div ref={ref} className="mermaid flex justify-center py-4 overflow-x-auto mac-scrollbar" />;
}

export function MarkdownPreviewer() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);

  const downloadRaw = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devsuite-document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] max-w-[1600px] mx-auto flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileCode2 className="w-8 h-8 text-emerald-500" />
            Markdown & Mermaid Previewer
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Write markdown and visualize architecture diagrams instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadRaw}>
            <Download className="w-4 h-4 mr-2" /> Download .md
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Editor Side */}
        <Card className="border-emerald-500/20 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="bg-muted/10 border-b pb-3 pt-4 shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-500" />
              Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <Textarea 
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-full border-0 focus-visible:ring-0 resize-none font-mono text-sm p-6 bg-transparent mac-scrollbar"
              placeholder="Write your markdown here..."
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* Preview Side */}
        <Card className="border-border shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="bg-muted/10 border-b pb-3 pt-4 shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-500" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 overflow-y-auto mac-scrollbar prose prose-emerald dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, inline, className, children, ...props}: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  
                  // Render Mermaid
                  if (!inline && match && match[1] === 'mermaid') {
                    return <Mermaid chart={String(children).replace(/\n$/, '')} />
                  }
                  
                  // Render Syntax Highlighted Code
                  return !inline && match ? (
                    <div className="rounded-md overflow-hidden my-4 border text-sm">
                      <div className="bg-muted/50 px-3 py-1.5 border-b text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex justify-between items-center">
                        {match[1]}
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    // Inline code
                    <code className="bg-muted/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[0.875em] font-mono before:content-none after:content-none" {...props}>
                      {children}
                    </code>
                  )
                },
                // Custom styles for markdown elements to match our SaaS look
                table({node, ...props}: any) {
                  return <div className="overflow-x-auto"><table className="min-w-full border-collapse" {...props} /></div>
                },
                a({node, ...props}: any) {
                  return <a className="text-emerald-500 hover:text-emerald-600 underline underline-offset-4" {...props} />
                }
              }}
            >
              {markdown}
            </ReactMarkdown>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
