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
  generateGitHubActionsWorkflow,
  generateGitLabCi,
  validateCiWorkflow,
  type GitHubActionsOptions,
  type GitLabCiOptions,
  type ProjectLanguage,
} from '@/lib/cicd_generator.utils';
import {
  GitPullRequest,
  Copy,
  Download,
  ShieldCheck,
  AlertTriangle,
  Info,
  Layers,
  Check
} from 'lucide-react';

export function CicdStudioWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // GitHub Actions State
  const [ghaOpts, setGhaOpts] = useState<GitHubActionsOptions>({
    workflowName: 'Continuous Integration & Delivery',
    language: 'node',
    triggers: {
      push: true,
      pullRequest: true,
      branches: ['main', 'develop'],
      manualDispatch: true,
    },
    matrixTesting: true,
    enableCaching: true,
    runLint: true,
    runTests: true,
    runBuild: true,
    dockerPush: true,
    dockerRegistry: 'ghcr.io',
  });

  // GitLab CI State
  const [gitlabOpts, setGitlabOpts] = useState<GitLabCiOptions>({
    language: 'node',
    enableCache: true,
    runLint: true,
    runTests: true,
    runBuild: true,
    dockerBuild: true,
  });

  // Linter State
  const [customWorkflow, setCustomWorkflow] = useState(
    `name: Insecure CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@main\n      - run: npm install\n      - run: npm test\n`
  );

  const generatedGha = useMemo(() => generateGitHubActionsWorkflow(ghaOpts), [ghaOpts]);
  const generatedGitLab = useMemo(() => generateGitLabCi(gitlabOpts), [gitlabOpts]);
  const lintIssues = useMemo(() => validateCiWorkflow(customWorkflow), [customWorkflow]);

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
          <div className="w-10 h-10 rounded-lg bg-orange-600/10 flex items-center justify-center text-orange-600">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">CI/CD Pipeline & Workflow Architect</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-orange-600 border-orange-600/30">
                DevOps Studio
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Design automated pipelines for GitHub Actions and GitLab CI with caching, matrix builds, and security scans.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN TABS */}
      <Tabs defaultValue="github" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between pb-2">
          <TabsList className="h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="github" className="text-xs h-7 px-3 gap-1.5">
              <GitPullRequest className="w-3.5 h-3.5" /> GitHub Actions
            </TabsTrigger>
            <TabsTrigger value="gitlab" className="text-xs h-7 px-3 gap-1.5">
              <Layers className="w-3.5 h-3.5" /> GitLab CI/CD
            </TabsTrigger>
            <TabsTrigger value="linter" className="text-xs h-7 px-3 gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Workflow Security Linter
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: GITHUB ACTIONS */}
        <TabsContent value="github" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CONTROLS */}
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-4 overflow-y-auto mac-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Workflow Name</Label>
              <Input
                value={ghaOpts.workflowName}
                onChange={(e) => setGhaOpts({ ...ghaOpts, workflowName: e.target.value })}
                className="font-mono text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Language / Runtime</Label>
              <Select
                value={ghaOpts.language}
                onValueChange={(val: ProjectLanguage) => setGhaOpts({ ...ghaOpts, language: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="node" className="text-xs">Node.js (npm / TypeScript)</SelectItem>
                  <SelectItem value="python" className="text-xs">Python (pytest / flake8)</SelectItem>
                  <SelectItem value="go" className="text-xs">Go (go test / vet)</SelectItem>
                  <SelectItem value="rust" className="text-xs">Rust (cargo test / clippy)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 border-t text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Pipeline Stages & Checks
              </span>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ghaOpts.runLint}
                  onChange={(e) => setGhaOpts({ ...ghaOpts, runLint: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Linting & Static Analysis</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ghaOpts.runTests}
                  onChange={(e) => setGhaOpts({ ...ghaOpts, runTests: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Automated Unit & Integration Tests</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ghaOpts.runBuild}
                  onChange={(e) => setGhaOpts({ ...ghaOpts, runBuild: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Production Build Compilation</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ghaOpts.matrixTesting}
                  onChange={(e) => setGhaOpts({ ...ghaOpts, matrixTesting: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Multi-Version Matrix Testing</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ghaOpts.enableCaching}
                  onChange={(e) => setGhaOpts({ ...ghaOpts, enableCaching: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Smart Dependency Layer Caching</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ghaOpts.dockerPush}
                  onChange={(e) => setGhaOpts({ ...ghaOpts, dockerPush: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Publish Docker Container (GHCR)</span>
              </label>
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">.github/workflows/ci.yml</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(generatedGha, 'GitHub Actions')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => handleDownload(generatedGha, 'ci.yml')}
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
                value={generatedGha}
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

        {/* TAB 2: GITLAB CI */}
        <TabsContent value="gitlab" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CONTROLS */}
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-4 overflow-y-auto mac-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Language Runtime</Label>
              <Select
                value={gitlabOpts.language}
                onValueChange={(val: ProjectLanguage) => setGitlabOpts({ ...gitlabOpts, language: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="node" className="text-xs">Node.js</SelectItem>
                  <SelectItem value="python" className="text-xs">Python</SelectItem>
                  <SelectItem value="go" className="text-xs">Go</SelectItem>
                  <SelectItem value="rust" className="text-xs">Rust</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 border-t text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Pipeline Stages
              </span>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gitlabOpts.runLint}
                  onChange={(e) => setGitlabOpts({ ...gitlabOpts, runLint: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Run Linter</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gitlabOpts.runTests}
                  onChange={(e) => setGitlabOpts({ ...gitlabOpts, runTests: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Run Automated Tests</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gitlabOpts.runBuild}
                  onChange={(e) => setGitlabOpts({ ...gitlabOpts, runBuild: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Store Build Artifacts</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gitlabOpts.dockerBuild}
                  onChange={(e) => setGitlabOpts({ ...gitlabOpts, dockerBuild: e.target.checked })}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>Docker-in-Docker Build</span>
              </label>
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">.gitlab-ci.yml</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(generatedGitLab, 'GitLab CI')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => handleDownload(generatedGitLab, '.gitlab-ci.yml')}
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
                value={generatedGitLab}
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

        {/* TAB 3: LINTER */}
        <TabsContent value="linter" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* WORKFLOW INPUT */}
          <div className="border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">Workflow YAML</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCustomWorkflow(generatedGha)}
              >
                Load Generated
              </Button>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="yaml"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={customWorkflow}
                onChange={(val) => setCustomWorkflow(val || '')}
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
                <span className="text-xs font-medium">No workflow issues detected! Pipeline is secure.</span>
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
