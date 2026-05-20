import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Hash, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

export function HashGenerator() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<{ [key: string]: string }>({
    'SHA-1': '',
    'SHA-256': '',
    'SHA-384': '',
    'SHA-512': '',
  });

  const debouncedInput = useDebounce(input, 300);

  const generateHashes = async (text: string) => {
    if (!text) {
      setHashes({
        'SHA-1': '',
        'SHA-256': '',
        'SHA-384': '',
        'SHA-512': '',
      });
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      const algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
      const newHashes: { [key: string]: string } = {};

      for (const algo of algos) {
        const hashBuffer = await crypto.subtle.digest(algo, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        newHashes[algo] = hashHex;
      }

      setHashes(newHashes);
    } catch (error) {
      console.error('Hashing failed', error);
    }
  };

  useEffect(() => {
    generateHashes(debouncedInput);
  }, [debouncedInput]);

  const copyToClipboard = (text: string, name: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${name} to clipboard`);
  };

  return (
    <div className="flex flex-col h-full bg-background p-6 overflow-y-auto mac-scrollbar">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center">
              <Hash className="w-5 h-5 mr-2 text-primary" /> Hash Generator
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Generate secure cryptographic hashes in real-time.</p>
          </div>
          <Button onClick={() => setInput('')} variant="outline" size="sm" className="shadow-sm text-muted-foreground hover:text-red-500">
            <Trash2 className="w-4 h-4 mr-2" /> Clear Input
          </Button>
        </div>

        <div className="space-y-2 relative">
          <div className="absolute top-3 right-4 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Input Text</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text here to hash..."
            className="w-full h-40 p-4 font-mono text-sm bg-muted/10 border rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-none shadow-inner"
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          {Object.entries(hashes).map(([name, hash]) => (
            <div key={name} className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wide uppercase text-muted-foreground">{name}</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  readOnly 
                  value={hash} 
                  className="font-mono text-sm bg-muted/30 border-dashed focus-visible:ring-0" 
                  placeholder={`Waiting for input...`}
                />
                <Button 
                  onClick={() => copyToClipboard(hash, name)} 
                  variant="outline" 
                  size="icon" 
                  disabled={!hash}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
