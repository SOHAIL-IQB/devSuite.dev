import { useState, useMemo } from 'react';
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
  generateDockerfile,
  generateDockerCompose,
  generateK8sManifests,
  validateDockerfile,
  type RuntimeStack,
  type DockerfileOptions,
  type ComposeServiceOptions,
  type K8sOptions,
} from '@/lib/container_generator.utils';
import {
  Container,
  Copy,
  Download,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  Server,
  Box,
  Check
} from 'lucide-react';

export function DockerStudioWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Dockerfile State
  const [dockerfileOpts, setDockerfileOpts] = useState<DockerfileOptions>({
    stack: 'nodejs-express',
    port: 3000,
    useMultiStage: true,
    useNonRoot: true,
    useAlpine: true,
  });

  // Compose State
  const [composeOpts, setComposeOpts] = useState<ComposeServiceOptions>({
    appName: 'api-server',
    appPort: 3000,
    enablePostgres: true,
    enableRedis: true,
    enableNginx: false,
  });

  // K8s State
  const [k8sOpts, setK8sOpts] = useState<K8sOptions>({
    appName: 'web-app',
    replicas: 3,
    containerPort: 3000,
    serviceType: 'ClusterIP',
    enableIngress: true,
    host: 'api.example.com',
  });

  // Linter State
  const [customDockerfile, setCustomDockerfile] = useState(
    `FROM node:latest\nWORKDIR /app\nCOPY . .\nRUN npm install\nEXPOSE 3000\nCMD ["npm", "start"]`
  );

  const generatedDockerfile = useMemo(() => generateDockerfile(dockerfileOpts), [dockerfileOpts]);
  const generatedCompose = useMemo(() => generateDockerCompose(composeOpts), [composeOpts]);
  const generatedK8s = useMemo(() => generateK8sManifests(k8sOpts), [k8sOpts]);
  const lintIssues = useMemo(() => validateDockerfile(customDockerfile), [customDockerfile]);

  const handleCopy = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600">
            <Container className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">Docker & Container Architecture Studio</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-blue-600 border-blue-600/30">
                Cloud Native
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate production-ready multi-stage Dockerfiles, Docker Compose stacks, and Kubernetes manifests.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN TABS: DOCKERFILE, COMPOSE, KUBERNETES, LINTER */}
      <Tabs defaultValue="dockerfile" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between pb-2">
          <TabsList className="h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="dockerfile" className="text-xs h-7 px-3 gap-1.5">
              <Box className="w-3.5 h-3.5" /> Dockerfile
            </TabsTrigger>
            <TabsTrigger value="compose" className="text-xs h-7 px-3 gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Docker Compose
            </TabsTrigger>
            <TabsTrigger value="k8s" className="text-xs h-7 px-3 gap-1.5">
              <Server className="w-3.5 h-3.5" /> Kubernetes Manifests
            </TabsTrigger>
            <TabsTrigger value="linter" className="text-xs h-7 px-3 gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Dockerfile Linter
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: DOCKERFILE */}
        <TabsContent value="dockerfile" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CONTROLS */}
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-4 overflow-y-auto mac-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Runtime Stack</Label>
              <Select
                value={dockerfileOpts.stack}
                onValueChange={(val: RuntimeStack) => setDockerfileOpts({ ...dockerfileOpts, stack: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nodejs-express" className="text-xs">Node.js (Express / API)</SelectItem>
                  <SelectItem value="nextjs" className="text-xs">Next.js (Standalone)</SelectItem>
                  <SelectItem value="python-fastapi" className="text-xs">Python (FastAPI / Uvicorn)</SelectItem>
                  <SelectItem value="go" className="text-xs">Go (Static Binary)</SelectItem>
                  <SelectItem value="rust" className="text-xs">Rust (Musl Alpine)</SelectItem>
                  <SelectItem value="java-spring" className="text-xs">Java (Spring Boot / Temurin)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Exposed Port</Label>
              <Input
                type="number"
                value={dockerfileOpts.port}
                onChange={(e) => setDockerfileOpts({ ...dockerfileOpts, port: parseInt(e.target.value) || 3000 })}
                className="font-mono text-xs h-8"
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Production Optimizations
              </span>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dockerfileOpts.useMultiStage}
                  onChange={(e) => setDockerfileOpts({ ...dockerfileOpts, useMultiStage: e.target.checked })}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span>Multi-Stage Build (Minimal Size)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dockerfileOpts.useNonRoot}
                  onChange={(e) => setDockerfileOpts({ ...dockerfileOpts, useNonRoot: e.target.checked })}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span>Non-Root Security User</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dockerfileOpts.useAlpine}
                  onChange={(e) => setDockerfileOpts({ ...dockerfileOpts, useAlpine: e.target.checked })}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span>Alpine Linux Base Image</span>
              </label>
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">Dockerfile</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(generatedDockerfile, 'Dockerfile')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleDownload(generatedDockerfile, 'Dockerfile')}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="dockerfile"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={generatedDockerfile}
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
          </div>
        </TabsContent>

        {/* TAB 2: DOCKER COMPOSE */}
        <TabsContent value="compose" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CONTROLS */}
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-4 overflow-y-auto mac-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Application Service Name</Label>
              <Input
                value={composeOpts.appName}
                onChange={(e) => setComposeOpts({ ...composeOpts, appName: e.target.value })}
                className="font-mono text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Application Port</Label>
              <Input
                type="number"
                value={composeOpts.appPort}
                onChange={(e) => setComposeOpts({ ...composeOpts, appPort: parseInt(e.target.value) || 3000 })}
                className="font-mono text-xs h-8"
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Attached Microservices & Databases
              </span>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={composeOpts.enablePostgres}
                  onChange={(e) => setComposeOpts({ ...composeOpts, enablePostgres: e.target.checked })}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span>PostgreSQL Database (Port 5432)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={composeOpts.enableRedis}
                  onChange={(e) => setComposeOpts({ ...composeOpts, enableRedis: e.target.checked })}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span>Redis In-Memory Cache (Port 6379)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={composeOpts.enableNginx}
                  onChange={(e) => setComposeOpts({ ...composeOpts, enableNginx: e.target.checked })}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span>Nginx Reverse Proxy (Port 80/443)</span>
              </label>
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">docker-compose.yml</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(generatedCompose, 'Docker Compose')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleDownload(generatedCompose, 'docker-compose.yml')}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="yaml"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={generatedCompose}
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
          </div>
        </TabsContent>

        {/* TAB 3: KUBERNETES */}
        <TabsContent value="k8s" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CONTROLS */}
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-4 overflow-y-auto mac-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deployment Name</Label>
              <Input
                value={k8sOpts.appName}
                onChange={(e) => setK8sOpts({ ...k8sOpts, appName: e.target.value })}
                className="font-mono text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pod Replicas</Label>
              <Input
                type="number"
                value={k8sOpts.replicas}
                onChange={(e) => setK8sOpts({ ...k8sOpts, replicas: parseInt(e.target.value) || 1 })}
                className="font-mono text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Service Type</Label>
              <Select
                value={k8sOpts.serviceType}
                onValueChange={(val: any) => setK8sOpts({ ...k8sOpts, serviceType: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ClusterIP" className="text-xs">ClusterIP (Internal)</SelectItem>
                  <SelectItem value="NodePort" className="text-xs">NodePort</SelectItem>
                  <SelectItem value="LoadBalancer" className="text-xs">LoadBalancer (Cloud)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 border-t text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={k8sOpts.enableIngress}
                  onChange={(e) => setK8sOpts({ ...k8sOpts, enableIngress: e.target.checked })}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span>Include Ingress Route (cert-manager TLS)</span>
              </label>

              {k8sOpts.enableIngress && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs">Ingress Hostname</Label>
                  <Input
                    value={k8sOpts.host}
                    onChange={(e) => setK8sOpts({ ...k8sOpts, host: e.target.value })}
                    className="font-mono text-xs h-8"
                    placeholder="api.domain.com"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">k8s-manifests.yaml</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(generatedK8s, 'Kubernetes Manifests')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleDownload(generatedK8s, 'k8s-manifests.yaml')}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="yaml"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={generatedK8s}
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
          </div>
        </TabsContent>

        {/* TAB 4: LINTER */}
        <TabsContent value="linter" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* DOCKERFILE INPUT */}
          <div className="border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">Input Dockerfile</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCustomDockerfile(generatedDockerfile)}
              >
                Load Generated
              </Button>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="dockerfile"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={customDockerfile}
                onChange={(val) => setCustomDockerfile(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                }}
                className="absolute inset-0"
              />
            </div>
          </div>

          {/* LINT FINDINGS */}
          <div className="border rounded-lg p-4 bg-background flex flex-col gap-3 overflow-y-auto mac-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Security & Quality Audit
              </h2>
              <Badge variant="outline" className="text-xs font-mono">
                {lintIssues.length} Findings
              </Badge>
            </div>

            {lintIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                <Check className="w-8 h-8 text-emerald-500" />
                <span className="text-xs font-medium">No Dockerfile issues detected! Clean & secure.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {lintIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
                      issue.severity === 'warning'
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                        : issue.severity === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {issue.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase text-[10px] tracking-wider">
                          {issue.severity} {issue.line ? `(Line ${issue.line})` : ''}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 text-foreground leading-relaxed">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
