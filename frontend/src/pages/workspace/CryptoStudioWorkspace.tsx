import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  generateSecureToken,
  calculateEntropy,
  generateHmac,
  encryptAesGcm,
  decryptAesGcm,
} from '@/lib/crypto_studio.utils';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Fingerprint,
  Copy,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export function CryptoStudioWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Token Generator State
  const [tokenLength, setTokenLength] = useState(32);
  const [tokenOpts, setTokenOpts] = useState({ uppercase: true, lowercase: true, digits: true, symbols: true });
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenEntropy, setTokenEntropy] = useState<ReturnType<typeof calculateEntropy>>({ bits: 0, strength: 'Very Strong' });

  // AES State
  const [aesPlaintext, setAesPlaintext] = useState('Confidential payload requiring military-grade AES-256-GCM encryption.');
  const [aesPassword, setAesPassword] = useState('MasterSecretKey123!@#');
  const [aesCiphertext, setAesCiphertext] = useState('');
  const [aesDecryptedText, setAesDecryptedText] = useState('');

  // HMAC State
  const [hmacAlgo, setHmacAlgo] = useState<'SHA-256' | 'SHA-512'>('SHA-256');
  const [hmacMessage, setHmacMessage] = useState('{"event":"order.created","amount":99.00,"currency":"USD"}');
  const [hmacSecret, setHmacSecret] = useState('whsec_8f9a2b4c6e1d3f5a7c9b0e2d4f6a8b0c');
  const [hmacOutput, setHmacOutput] = useState('');

  const refreshTokens = () => {
    const tok = generateSecureToken({ length: tokenLength, ...tokenOpts });
    setGeneratedToken(tok);
    setTokenEntropy(calculateEntropy(tok));
  };

  useEffect(() => {
    refreshTokens();
  }, [tokenLength, tokenOpts]);

  const handleCopy = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${label} copied to clipboard`);
  };

  const handleEncryptAes = async () => {
    try {
      const encrypted = await encryptAesGcm(aesPlaintext, aesPassword);
      setAesCiphertext(encrypted);
      toast.success('Encrypted with AES-256-GCM');
    } catch {
      toast.error('Encryption failed');
    }
  };

  const handleDecryptAes = async () => {
    try {
      const decrypted = await decryptAesGcm(aesCiphertext, aesPassword);
      setAesDecryptedText(decrypted);
      toast.success('Decrypted successfully');
    } catch {
      toast.error('Decryption failed: Invalid password or corrupted payload');
    }
  };

  const handleGenerateHmac = async () => {
    try {
      const signature = await generateHmac(hmacMessage, hmacSecret, hmacAlgo);
      setHmacOutput(signature);
      toast.success(`HMAC-${hmacAlgo} signature computed`);
    } catch {
      toast.error('HMAC calculation failed');
    }
  };

  useEffect(() => {
    handleGenerateHmac();
  }, [hmacMessage, hmacSecret, hmacAlgo]);

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">Security & Cryptography Studio</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-indigo-500 border-indigo-500/30">
                WebCrypto Suite
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Client-side AES-256-GCM authenticated encryption, HMAC message integrity signatures, and high-entropy token generators.
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="aes" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between pb-2">
          <TabsList className="h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="aes" className="text-xs h-7 px-3 gap-1.5">
              <Lock className="w-3.5 h-3.5" /> AES-256-GCM Encrypt/Decrypt
            </TabsTrigger>
            <TabsTrigger value="hmac" className="text-xs h-7 px-3 gap-1.5">
              <Fingerprint className="w-3.5 h-3.5" /> HMAC Signatures
            </TabsTrigger>
            <TabsTrigger value="tokens" className="text-xs h-7 px-3 gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> High-Entropy Token Generator
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: AES-256-GCM */}
        <TabsContent value="aes" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ENCRYPT SECTION */}
          <div className="border rounded-lg p-4 bg-background flex flex-col gap-3 min-h-0 overflow-y-auto mac-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Encrypt (AES-256-GCM + PBKDF2)
              </h2>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Plaintext Payload</Label>
              <div className="h-32 border rounded overflow-hidden relative">
                <Editor
                  height="100%"
                  language="plaintext"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={aesPlaintext}
                  onChange={(v) => setAesPlaintext(v || '')}
                  options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
                  className="absolute inset-0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Encryption Passphrase</Label>
              <Input
                type="password"
                value={aesPassword}
                onChange={(e) => setAesPassword(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>

            <Button onClick={handleEncryptAes} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Encrypt Payload
            </Button>

            {aesCiphertext && (
              <div className="space-y-1 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Ciphertext (Base64)</Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(aesCiphertext, 'Ciphertext')}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="p-2 border rounded bg-muted/20 font-mono text-[11px] break-all max-h-24 overflow-y-auto">
                  {aesCiphertext}
                </div>
              </div>
            )}
          </div>

          {/* DECRYPT SECTION */}
          <div className="border rounded-lg p-4 bg-background flex flex-col gap-3 min-h-0 overflow-y-auto mac-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Decrypt Payload
              </h2>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ciphertext (Base64)</Label>
              <div className="h-32 border rounded overflow-hidden relative">
                <Editor
                  height="100%"
                  language="plaintext"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={aesCiphertext}
                  onChange={(v) => setAesCiphertext(v || '')}
                  options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
                  className="absolute inset-0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Decryption Passphrase</Label>
              <Input
                type="password"
                value={aesPassword}
                onChange={(e) => setAesPassword(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>

            <Button onClick={handleDecryptAes} variant="outline" className="h-8 text-xs">
              <KeyRound className="w-3.5 h-3.5 mr-1" /> Decrypt Payload
            </Button>

            {aesDecryptedText && (
              <div className="space-y-1 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-emerald-500 font-semibold">Decrypted Plaintext</Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(aesDecryptedText, 'Decrypted text')}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="p-2 border rounded bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                  {aesDecryptedText}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: HMAC */}
        <TabsContent value="hmac" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-background flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Algorithm</Label>
                <Select value={hmacAlgo} onValueChange={(val: 'SHA-256' | 'SHA-512') => setHmacAlgo(val)}>
                  <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHA-256" className="text-xs font-mono">HMAC SHA-256</SelectItem>
                    <SelectItem value="SHA-512" className="text-xs font-mono">HMAC SHA-512</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Secret Key</Label>
                <Input
                  value={hmacSecret}
                  onChange={(e) => setHmacSecret(e.target.value)}
                  placeholder="webhook secret key"
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1 flex-1 flex flex-col min-h-0">
              <Label className="text-xs font-semibold">Message Payload</Label>
              <div className="flex-1 border rounded overflow-hidden relative">
                <Editor
                  height="100%"
                  language="json"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={hmacMessage}
                  onChange={(v) => setHmacMessage(v || '')}
                  options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
                  className="absolute inset-0"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-background flex flex-col justify-between min-h-0">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Computed HMAC Signature
              </span>
              <div className="p-3 border rounded bg-muted/20 font-mono text-xs break-all text-indigo-500 font-semibold">
                {hmacOutput || 'Calculating...'}
              </div>
            </div>

            <Button
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => handleCopy(hmacOutput, 'HMAC signature')}
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Hex Signature
            </Button>
          </div>
        </TabsContent>

        {/* TAB 3: HIGH ENTROPY TOKEN GENERATOR */}
        <TabsContent value="tokens" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-3 overflow-y-auto mac-scrollbar">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Length</Label>
                <span className="font-mono text-xs font-bold">{tokenLength} chars</span>
              </div>
              <input
                type="range"
                min="8"
                max="128"
                value={tokenLength}
                onChange={(e) => setTokenLength(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="space-y-2 pt-2 border-t text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tokenOpts.uppercase}
                  onChange={(e) => setTokenOpts({ ...tokenOpts, uppercase: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span>Uppercase (A-Z)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tokenOpts.lowercase}
                  onChange={(e) => setTokenOpts({ ...tokenOpts, lowercase: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span>Lowercase (a-z)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tokenOpts.digits}
                  onChange={(e) => setTokenOpts({ ...tokenOpts, digits: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span>Digits (0-9)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tokenOpts.symbols}
                  onChange={(e) => setTokenOpts({ ...tokenOpts, symbols: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span>Symbols (!@#$%)</span>
              </label>
            </div>

            <Button onClick={refreshTokens} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-generate
            </Button>
          </div>

          <div className="col-span-2 border rounded-lg p-4 bg-background flex flex-col justify-between min-h-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Generated Secure Secret</span>
                <Badge variant="outline" className="text-indigo-500 font-mono text-[10px]">
                  {tokenEntropy.bits} bits • {tokenEntropy.strength}
                </Badge>
              </div>

              <div className="p-4 border rounded bg-muted/10 font-mono text-sm break-all font-bold text-foreground">
                {generatedToken}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t">
              <Button
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => handleCopy(generatedToken, 'Secret Token')}
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy Secret
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
