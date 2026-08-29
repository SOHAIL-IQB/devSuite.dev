import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from '@/components/CommandPalette';
import { Toaster } from '@/components/ui/sonner';
import { 
  Terminal, 
  Settings, 
  BookText, 
  Braces, 
  Code2, 
  Menu,
  Moon,
  Sun,
  Laptop,
  Lock,
  Hash,
  Regex,
  Clock,
  CalendarClock,
  Link2,
  Palette,
  FileCode2,
  FileText,
  Radio,
  Layers,
  Webhook,
  Database,
  Server,
  Globe2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useThemeStore } from '@/store/themeStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: <Terminal className="w-4 h-4" /> },
  { name: 'API Workspace', path: '/api', icon: <Code2 className="w-4 h-4" /> },
  { name: 'WebSocket Client', path: '/websocket', icon: <Radio className="w-4 h-4" /> },
  { name: 'GraphQL Client', path: '/graphql', icon: <Layers className="w-4 h-4" /> },
  { name: 'Webhook Bin', path: '/webhook-bin', icon: <Webhook className="w-4 h-4" /> },
  { name: 'Mock Server', path: '/mock-server', icon: <Server className="w-4 h-4" /> },
  { name: 'SQL Studio', path: '/sql', icon: <Database className="w-4 h-4" /> },
  { name: 'cURL Converter', path: '/curl', icon: <Terminal className="w-4 h-4" /> },
  { name: 'Network Tools', path: '/network-tools', icon: <Globe2 className="w-4 h-4" /> },
  { name: 'Formatters', path: '/format', icon: <Braces className="w-4 h-4" /> },
  { name: 'Regex Tester', path: '/regex', icon: <Regex className="w-4 h-4" /> },
  { name: 'JWT Decoder', path: '/jwt', icon: <Lock className="w-4 h-4" /> },
  { name: 'Base64 Encoder', path: '/base64', icon: <Hash className="w-4 h-4" /> },
  { name: 'URL Parser', path: '/url', icon: <Link2 className="w-4 h-4" /> },
  { name: 'Color Converter', path: '/color', icon: <Palette className="w-4 h-4" /> },
  { name: 'Markdown Previewer', path: '/markdown', icon: <FileCode2 className="w-4 h-4" /> },
  { name: 'Text Inspector', path: '/text', icon: <FileText className="w-4 h-4" /> },
  { name: 'Epoch Converter', path: '/time', icon: <Clock className="w-4 h-4" /> },
  { name: 'Cron Parser', path: '/cron', icon: <CalendarClock className="w-4 h-4" /> },
  { name: 'Notes', path: '/notes', icon: <BookText className="w-4 h-4" /> },
  { name: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
];

export function DashboardLayout() {
  const { setTheme } = useThemeStore();

  const SidebarContent = () => {
    const location = useLocation();
    
    return (
      <div className="flex flex-col h-full bg-muted/30 border-r">
        <div className="h-14 px-5 flex items-center space-x-2 border-b font-semibold tracking-tight">
          <div className="w-6 h-6 bg-primary rounded-[6px] flex items-center justify-center shadow-sm">
            <Terminal className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm">DevWorkspace</span>
        </div>
        <div className="px-3 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Menu
        </div>
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto mac-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className={`${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.icon}
                </div>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col">
        <SidebarContent />
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Top Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            {/* Breadcrumb / Title placeholder */}
            <h1 className="font-semibold text-sm">Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="hidden sm:flex text-muted-foreground" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
              Search... <kbd className="ml-2 bg-secondary px-1.5 rounded text-[10px]">⌘K</kbd>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Laptop className="mr-2 h-4 w-4" /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area with Framer Motion */}
        <div className="flex-1 overflow-auto bg-background mac-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <CommandPalette />
      <Toaster />
    </div>
  );
}
