import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  parseSqlDdl,
  generateMermaidErDiagram,
  generateTypeScriptInterfaces,
  generateMockJson,
  type ParsedSchema
} from '@/lib/sql_parser.utils';
import {
  Database,
  Code2,
  FileCode,
  Copy,
  Sparkles,
  Layers,
  Table,
  Check
} from 'lucide-react';

const SAMPLE_ECOMMERCE_DDL = `-- E-Commerce Database Schema
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  category_id INT REFERENCES categories(id),
  title VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INT DEFAULT 0
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);
`;

const SAMPLE_SAAS_DDL = `-- SaaS Multi-Tenant Database Schema
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member'
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT false
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  key_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP
);
`;

export function SqlStudioWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [sql, setSql] = useState(SAMPLE_ECOMMERCE_DDL);
  const [dialect, setDialect] = useState<'postgresql' | 'mysql' | 'sqlite' | 'sql'>('postgresql');
  const [schema, setSchema] = useState<ParsedSchema>(() => parseSqlDdl(SAMPLE_ECOMMERCE_DDL));
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');

  const mermaidContainerRef = useRef<HTMLDivElement>(null);

  // Initialize and render Mermaid ER Diagram
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
    });
  }, [isDark]);

  useEffect(() => {
    const parsed = parseSqlDdl(sql);
    setSchema(parsed);
    if (parsed.tables.length > 0 && (!selectedTable || !parsed.tables.some((t) => t.name === selectedTable))) {
      setSelectedTable(parsed.tables[0].name);
    }

    const mermaidSyntax = generateMermaidErDiagram(parsed);
    const renderDiagram = async () => {
      try {
        const id = 'mermaid-er-' + Math.random().toString(36).substr(2, 6);
        const { svg } = await mermaid.render(id, mermaidSyntax);
        setMermaidSvg(svg);
      } catch {
        setMermaidSvg('<div class="text-xs text-muted-foreground p-4">Unable to render ER diagram. Verify SQL DDL syntax.</div>');
      }
    };

    renderDiagram();
  }, [sql, isDark, selectedTable]);

  const handleFormatSql = async () => {
    if (!sql.trim()) return;
    setIsFormatting(true);
    try {
      const { format } = await import('sql-formatter');
      const formatted = format(sql, {
        language: dialect,
        keywordCase: 'upper',
      });
      setSql(formatted);
      toast.success('SQL formatted successfully');
    } catch {
      toast.error('Failed to format SQL syntax');
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCopy = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${label} copied to clipboard`);
  };

  const tsInterfaces = generateTypeScriptInterfaces(schema);
  const mockJson = generateMockJson(schema);

  const generateCrudQueries = (tableName: string) => {
    const table = schema.tables.find((t) => t.name === tableName);
    if (!table) return '';

    const cols = table.columns.map((c) => c.name).join(', ');
    const insertCols = table.columns.filter((c) => !c.isPrimary).map((c) => c.name).join(', ');
    const insertVals = table.columns.filter((c) => !c.isPrimary).map((_, i) => `$${i + 1}`).join(', ');
    const updateSets = table.columns.filter((c) => !c.isPrimary).map((c, i) => `${c.name} = $${i + 1}`).join(', ');
    const pkCol = table.primaryKeys[0] || table.columns[0]?.name || 'id';

    return `-- SELECT All
SELECT ${cols}
FROM ${table.name}
LIMIT 100;

-- SELECT By ID
SELECT ${cols}
FROM ${table.name}
WHERE ${pkCol} = $1;

-- INSERT Record
INSERT INTO ${table.name} (${insertCols})
VALUES (${insertVals})
RETURNING *;

-- UPDATE Record
UPDATE ${table.name}
SET ${updateSets}
WHERE ${pkCol} = $${table.columns.length};

-- DELETE Record
DELETE FROM ${table.name}
WHERE ${pkCol} = $1;
`;
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">SQL Schema Studio & ER Playground</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-blue-500 border-blue-500/30">
                Visual DDL
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Parse DDL schemas, render live Entity-Relationship diagrams, generate TypeScript interfaces, and scaffold queries.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dialect Selector */}
          <Select value={dialect} onValueChange={(val: any) => setDialect(val)}>
            <SelectTrigger className="w-32 h-8 text-xs font-medium">
              <SelectValue placeholder="Dialect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="postgresql" className="text-xs">PostgreSQL</SelectItem>
              <SelectItem value="mysql" className="text-xs">MySQL</SelectItem>
              <SelectItem value="sqlite" className="text-xs">SQLite</SelectItem>
              <SelectItem value="sql" className="text-xs">Standard SQL</SelectItem>
            </SelectContent>
          </Select>

          {/* Sample Templates */}
          <Select
            onValueChange={(val) => {
              if (val === 'ecommerce') setSql(SAMPLE_ECOMMERCE_DDL);
              if (val === 'saas') setSql(SAMPLE_SAAS_DDL);
              toast.success('Loaded schema template');
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Sample Schemas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ecommerce" className="text-xs">E-Commerce Schema</SelectItem>
              <SelectItem value="saas" className="text-xs">SaaS Multi-Tenant</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFormatSql}
            disabled={isFormatting}
            className="h-8 text-xs gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Format SQL
          </Button>
        </div>
      </div>

      {/* MAIN SPLIT: SQL EDITOR & VISUAL ARTIFACTS */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border shadow-sm">
          
          {/* LEFT: MONACO SQL EDITOR */}
          <ResizablePanel defaultSize={45} minSize={30} className="flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SQL DDL Schema</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {schema.tables.length} {schema.tables.length === 1 ? 'Table' : 'Tables'}
              </Badge>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="sql"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={sql}
                onChange={(val) => setSql(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                  lineNumbersMinChars: 3,
                }}
                className="absolute inset-0"
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* RIGHT: TABS (ER DIAGRAM, TYPESCRIPT, MOCK JSON, CRUD SCAFFOLD) */}
          <ResizablePanel defaultSize={55} minSize={35} className="flex flex-col bg-background min-h-0">
            <Tabs defaultValue="er" className="flex flex-col h-full min-h-0">
              <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
                <TabsList className="h-7 bg-muted/50 p-0.5">
                  <TabsTrigger value="er" className="text-xs h-6 px-3">
                    <Layers className="w-3.5 h-3.5 mr-1" /> Visual ER Diagram
                  </TabsTrigger>
                  <TabsTrigger value="ts" className="text-xs h-6 px-3">
                    <FileCode className="w-3.5 h-3.5 mr-1" /> TypeScript Types
                  </TabsTrigger>
                  <TabsTrigger value="json" className="text-xs h-6 px-3">
                    <Database className="w-3.5 h-3.5 mr-1" /> Mock JSON
                  </TabsTrigger>
                  <TabsTrigger value="crud" className="text-xs h-6 px-3">
                    <Table className="w-3.5 h-3.5 mr-1" /> CRUD Queries
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* VISUAL ER DIAGRAM TAB */}
              <TabsContent value="er" className="flex-1 p-4 m-0 overflow-auto bg-muted/5 flex flex-col items-center justify-center min-h-0 mac-scrollbar">
                {mermaidSvg ? (
                  <div
                    ref={mermaidContainerRef}
                    dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                    className="w-full flex items-center justify-center p-4 overflow-auto [&>svg]:max-w-full [&>svg]:h-auto shadow-sm rounded-lg"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground p-4">No schema to render.</div>
                )}
              </TabsContent>

              {/* TYPESCRIPT INTERFACES TAB */}
              <TabsContent value="ts" className="flex-1 p-0 m-0 min-h-0 relative">
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shadow-xs"
                    onClick={() => handleCopy(tsInterfaces, 'TypeScript Interfaces')}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Types
                  </Button>
                </div>
                <Editor
                  height="100%"
                  language="typescript"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={tsInterfaces}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                  }}
                  className="absolute inset-0"
                />
              </TabsContent>

              {/* MOCK JSON TAB */}
              <TabsContent value="json" className="flex-1 p-0 m-0 min-h-0 relative">
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shadow-xs"
                    onClick={() => handleCopy(mockJson, 'Mock JSON')}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy JSON
                  </Button>
                </div>
                <Editor
                  height="100%"
                  language="json"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={mockJson}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                  }}
                  className="absolute inset-0"
                />
              </TabsContent>

              {/* CRUD QUERIES TAB */}
              <TabsContent value="crud" className="flex-1 p-0 m-0 min-h-0 flex flex-col">
                <div className="p-2 border-b bg-muted/20 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground font-medium">Table:</span>
                    <Select value={selectedTable} onValueChange={setSelectedTable}>
                      <SelectTrigger className="w-40 h-7 text-xs">
                        <SelectValue placeholder="Select Table" />
                      </SelectTrigger>
                      <SelectContent>
                        {schema.tables.map((t) => (
                          <SelectItem key={t.name} value={t.name} className="text-xs">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleCopy(generateCrudQueries(selectedTable), 'CRUD Queries')}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Copy Queries
                  </Button>
                </div>

                <div className="flex-1 min-h-0 relative">
                  <Editor
                    height="100%"
                    language="sql"
                    theme={isDark ? 'vs-dark' : 'vs'}
                    value={generateCrudQueries(selectedTable)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      padding: { top: 12, bottom: 12 },
                    }}
                    className="absolute inset-0"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
