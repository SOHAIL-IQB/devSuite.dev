import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Lock } from 'lucide-react';

export function JwtDecoder() {
  const [token, setToken] = useState('');
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  let header = '';
  let payload = '';
  let error = '';

  try {
    if (token.trim()) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        // use try-catch inside atob to safely parse base64
        const decodeSafe = (b64: string) => {
          // Add padding if missing
          let str = b64.replace(/-/g, '+').replace(/_/g, '/');
          while (str.length % 4) str += '=';
          return decodeURIComponent(escape(window.atob(str)));
        };

        header = JSON.stringify(JSON.parse(decodeSafe(parts[0])), null, 2);
        payload = JSON.stringify(JSON.parse(decodeSafe(parts[1])), null, 2);
      } else {
        error = 'Invalid JWT format. Must contain at least two parts separated by dots.';
      }
    }
  } catch (err) {
    error = 'Failed to decode JWT. It might be malformed or not a valid token.';
  }

  return (
    <div className="h-full bg-background flex flex-col min-h-0">
      <div className="p-4 border-b bg-muted/5 shrink-0 flex items-center">
        <Lock className="w-5 h-5 mr-2 text-purple-500" />
        <h2 className="text-lg font-semibold">JWT Decoder</h2>
      </div>

      <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {/* Left Side: Input */}
        <div className="w-full md:w-1/3 flex flex-col shrink-0">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Encoded Token
          </label>
          <Textarea 
            value={token}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setToken(e.target.value)}
            placeholder="Paste your JWT here... (ey...)"
            className="flex-1 font-mono text-sm resize-none"
          />
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        {/* Right Side: Decoded */}
        <div className="w-full md:w-2/3 flex flex-col gap-6 min-h-0 overflow-y-auto">
          <Card className="flex-1 min-h-[250px] flex flex-col shadow-sm border-primary/10">
            <CardHeader className="py-3 px-4 bg-primary/5 border-b">
              <CardTitle className="text-sm uppercase text-primary font-bold tracking-widest">Header <span className="text-muted-foreground font-normal lowercase">(Algorithm & Type)</span></CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              <Editor
                language="json"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={header || '{\n\n}'}
                options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-[300px] flex flex-col shadow-sm border-purple-500/10">
            <CardHeader className="py-3 px-4 bg-purple-500/5 border-b">
              <CardTitle className="text-sm uppercase text-purple-500 font-bold tracking-widest">Payload <span className="text-muted-foreground font-normal lowercase">(Data & Claims)</span></CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              <Editor
                language="json"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={payload || '{\n\n}'}
                options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
