import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Terminal, Code2, Radio, Braces, BookText, Settings, Sun, Moon, Laptop, Clock, CalendarClock, Link2, Palette, FileCode2, FileText } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useThemeStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/api'))}>
            <Code2 className="mr-2 h-4 w-4" />
            <span>API Workspace</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/websocket'))}>
            <Radio className="mr-2 h-4 w-4" />
            <span>WebSocket Client</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/format'))}>
            <Braces className="mr-2 h-4 w-4" />
            <span>Formatters</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/notes'))}>
            <BookText className="mr-2 h-4 w-4" />
            <span>Notes</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Utilities & Formatters">
          <CommandItem onSelect={() => runCommand(() => navigate('/regex'))}>
            <Code2 className="mr-2 h-4 w-4" />
            <span>Regex Tester</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/format/code-formatter'))}>
            <Code2 className="mr-2 h-4 w-4" />
            <span>Code Formatter</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/format/json-diff'))}>
            <Braces className="mr-2 h-4 w-4" />
            <span>JSON Diff Checker</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/format/json-to-csv'))}>
            <Braces className="mr-2 h-4 w-4" />
            <span>JSON to CSV</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/format/uuid-generator'))}>
            <Braces className="mr-2 h-4 w-4" />
            <span>UUID Generator</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/format/hash-generator'))}>
            <Braces className="mr-2 h-4 w-4" />
            <span>Hash Generator</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/jwt'))}>
            <Braces className="mr-2 h-4 w-4" />
            <span>JWT Decoder</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/base64'))}>
            <Braces className="mr-2 h-4 w-4" />
            <span>Base64 Encoder / Decoder</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/time'))}>
            <Clock className="mr-2 h-4 w-4" />
            <span>Epoch Timestamp Converter</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/cron'))}>
            <CalendarClock className="mr-2 h-4 w-4" />
            <span>Cron Expression Parser</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/url'))}>
            <Link2 className="mr-2 h-4 w-4" />
            <span>URL Parser & Builder</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/color'))}>
            <Palette className="mr-2 h-4 w-4" />
            <span>Color Format Converter</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/markdown'))}>
            <FileCode2 className="mr-2 h-4 w-4" />
            <span>Markdown Previewer</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/text'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Text Inspector</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
            <Laptop className="mr-2 h-4 w-4" />
            <span>System Theme</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
