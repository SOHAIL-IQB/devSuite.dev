import { Outlet, Link } from 'react-router-dom';
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
  Laptop
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
  { name: 'Formatters', path: '/format', icon: <Braces className="w-4 h-4" /> },
  { name: 'Notes', path: '/notes', icon: <BookText className="w-4 h-4" /> },
  { name: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
];

export function DashboardLayout() {
  const { setTheme } = useThemeStore();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="p-4 flex items-center space-x-2 font-bold text-lg border-b">
        <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
          <Terminal className="w-4 h-4 text-primary-foreground" />
        </div>
        <span>DevWorkspace</span>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors"
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );

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
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-muted/20">
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
