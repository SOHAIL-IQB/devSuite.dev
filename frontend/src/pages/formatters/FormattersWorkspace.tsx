import { Link, Outlet, useLocation } from 'react-router-dom';
import { Braces, Diff, Table, Fingerprint, Hash } from 'lucide-react';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

const FORMATTER_TOOLS = [
  { name: 'JSON Formatter', path: '/format/json-formatter', icon: <Braces className="w-4 h-4" /> },
  { name: 'JSON Diff', path: '/format/json-diff', icon: <Diff className="w-4 h-4" /> },
  { name: 'JSON to CSV', path: '/format/json-to-csv', icon: <Table className="w-4 h-4" /> },
  { name: 'UUID Generator', path: '/format/uuid-generator', icon: <Fingerprint className="w-4 h-4" /> },
  { name: 'Hash Generator', path: '/format/hash-generator', icon: <Hash className="w-4 h-4" /> },
];

export function FormattersWorkspace() {
  const location = useLocation();

  return (
    <div className="h-full w-full bg-muted/10 p-2 overflow-hidden flex flex-col min-h-0">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 rounded-lg">
        {/* LEFT SIDEBAR: Tools Menu */}
        <ResizablePanel defaultSize={18} minSize={15} maxSize={25} className="flex flex-col bg-background rounded-lg border shadow-sm overflow-hidden mr-2 min-h-0">
          <div className="flex items-center p-4 border-b bg-muted/5 h-14">
            <span className="font-semibold text-[11px] tracking-widest uppercase text-muted-foreground">Utilities</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {FORMATTER_TOOLS.map((tool) => {
              const isActive = location.pathname === tool.path;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className={`flex items-center space-x-3 px-4 py-2 text-[13px] font-medium transition-colors border-l-2 ${
                    isActive 
                      ? 'bg-primary/5 text-primary border-primary' 
                      : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <div className={`${isActive ? 'text-primary' : 'text-muted-foreground opacity-70'}`}>
                    {tool.icon}
                  </div>
                  <span>{tool.name}</span>
                </Link>
              );
            })}
          </nav>
        </ResizablePanel>

        {/* MAIN CONTENT AREA */}
        <ResizablePanel defaultSize={100} className="flex flex-col h-full overflow-hidden bg-background rounded-lg border shadow-sm min-h-0 relative">
          <Outlet />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
