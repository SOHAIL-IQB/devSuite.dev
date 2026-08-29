import { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  buildCommitMessage,
  parseLogToChangelog,
  buildGitignore,
  GIT_SCENARIOS,
  GITIGNORE_PRESETS,
  type CommitType,
  type CommitMessageOptions,
} from '@/lib/git_tools.utils';
import {
  GitBranch,
  GitCommit,
  Copy,
  Download,
  Terminal,
  FileCode,
  FileText,
  Search,
  Sparkles,
  Undo2
} from 'lucide-react';

export function GitStudioWorkspace() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Commit Builder State
  const [commitOpts, setCommitOpts] = useState<CommitMessageOptions>({
    type: 'feat',
    scope: 'auth',
    isBreaking: false,
    shortDescription: 'implement OAuth2 PKCE authentication flow',
    longBody: 'Add state parameter validation and token revocation endpoint.',
    breakingChangeDescription: '',
    closedIssues: '#104, #118',
  });

  // Scenario Navigator State
  const [scenarioFilter, setScenarioFilter] = useState('');
  const [scenarioParams, setScenarioParams] = useState<Record<string, Record<string, string>>>({});

  // Changelog State
  const [rawCommits, setRawCommits] = useState(
    `a1b2c3d feat(auth): add OAuth2 refresh token rotation\n` +
    `e4f5a6b fix(api): resolve CORS preflight headers issue on webhook catch\n` +
    `c7d8e9f perf(db): optimize user query indexing for high concurrency\n` +
    `9a8b7c6 docs: update API Swagger documentation\n` +
    `1a2b3c4 feat(docker)!: migrate container base image to distroless`
  );

  // Gitignore State
  const [selectedPresets, setSelectedPresets] = useState<string[]>(['NodeJS', 'macOS', 'VSCode']);

  const commitResult = useMemo(() => buildCommitMessage(commitOpts), [commitOpts]);
  const changelogResult = useMemo(() => parseLogToChangelog(rawCommits), [rawCommits]);
  const gitignoreResult = useMemo(() => buildGitignore(selectedPresets), [selectedPresets]);

  const filteredScenarios = useMemo(() => {
    if (!scenarioFilter.trim()) return GIT_SCENARIOS;
    const q = scenarioFilter.toLowerCase();
    return GIT_SCENARIOS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.includes(q)
    );
  }, [scenarioFilter]);

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

  const updateScenarioParam = (scenarioId: string, paramKey: string, val: string) => {
    setScenarioParams((prev) => ({
      ...prev,
      [scenarioId]: {
        ...(prev[scenarioId] || {}),
        [paramKey]: val,
      },
    }));
  };

  const togglePreset = (preset: string) => {
    setSelectedPresets((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset]
    );
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">Git Studio & Command Navigator</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-red-500 border-red-500/30">
                VCS Toolkit
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Build Conventional Commits, resolve tricky Git undo scenarios, parse changelogs, and bundle .gitignore presets.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN TABS */}
      <Tabs defaultValue="commit" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between pb-2">
          <TabsList className="h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="commit" className="text-xs h-7 px-3 gap-1.5">
              <GitCommit className="w-3.5 h-3.5" /> Commit Message Builder
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs h-7 px-3 gap-1.5">
              <Undo2 className="w-3.5 h-3.5" /> Scenario & Undo Navigator
            </TabsTrigger>
            <TabsTrigger value="changelog" className="text-xs h-7 px-3 gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Changelog Scaffolder
            </TabsTrigger>
            <TabsTrigger value="gitignore" className="text-xs h-7 px-3 gap-1.5">
              <FileCode className="w-3.5 h-3.5" /> .gitignore Bundler
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: COMMIT MESSAGE BUILDER */}
        <TabsContent value="commit" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CONTROLS */}
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-3 overflow-y-auto mac-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Type</Label>
                <Select
                  value={commitOpts.type}
                  onValueChange={(val: CommitType) => setCommitOpts({ ...commitOpts, type: val })}
                >
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert'].map((t) => (
                      <SelectItem key={t} value={t} className="text-xs font-mono">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Scope (optional)</Label>
                <Input
                  value={commitOpts.scope || ''}
                  onChange={(e) => setCommitOpts({ ...commitOpts, scope: e.target.value })}
                  placeholder="auth, api, ui"
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Short Description</Label>
              <Input
                value={commitOpts.shortDescription}
                onChange={(e) => setCommitOpts({ ...commitOpts, shortDescription: e.target.value })}
                placeholder="what was changed"
                className="font-mono text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Extended Body (optional)</Label>
              <Textarea
                value={commitOpts.longBody || ''}
                onChange={(e) => setCommitOpts({ ...commitOpts, longBody: e.target.value })}
                placeholder="detailed motivation or context"
                className="font-mono text-xs h-20 resize-none mac-scrollbar"
              />
            </div>

            <div className="space-y-2 pt-2 border-t text-xs">
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-red-500">
                <input
                  type="checkbox"
                  checked={commitOpts.isBreaking}
                  onChange={(e) => setCommitOpts({ ...commitOpts, isBreaking: e.target.checked })}
                  className="rounded border-border text-red-600 focus:ring-red-500"
                />
                <span>Breaking Change (!)</span>
              </label>

              {commitOpts.isBreaking && (
                <div className="space-y-1">
                  <Label className="text-xs text-red-500">Breaking Change Details</Label>
                  <Input
                    value={commitOpts.breakingChangeDescription || ''}
                    onChange={(e) => setCommitOpts({ ...commitOpts, breakingChangeDescription: e.target.value })}
                    placeholder="describe what breaks and migration"
                    className="font-mono text-xs h-8 border-red-500/40"
                  />
                </div>
              )}

              <div className="space-y-1 pt-1">
                <Label className="text-xs">Closes Issues</Label>
                <Input
                  value={commitOpts.closedIssues || ''}
                  onChange={(e) => setCommitOpts({ ...commitOpts, closedIssues: e.target.value })}
                  placeholder="#12, #45"
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">Git Commit Message</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(commitResult.gitCommand, 'Git command')}
                >
                  <Terminal className="w-3.5 h-3.5 mr-1" /> Copy git command
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleCopy(commitResult.message, 'Commit message')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Message
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="markdown"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={commitResult.message}
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

        {/* TAB 2: SCENARIOS */}
        <TabsContent value="scenarios" className="flex-1 m-0 min-h-0 flex flex-col gap-3 bg-background border rounded-lg p-4 overflow-y-auto mac-scrollbar">
          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={scenarioFilter}
                onChange={(e) => setScenarioFilter(e.target.value)}
                placeholder="Search scenarios (e.g. undo, squash, stash, branch, delete, revert)..."
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {filteredScenarios.map((sc) => {
              const currentParams = scenarioParams[sc.id] || {};
              const resolvedCommand = sc.generateCommand(currentParams);

              return (
                <div key={sc.id} className="p-3.5 border rounded-lg bg-muted/10 flex flex-col justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold leading-snug">{sc.title}</h2>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {sc.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{sc.description}</p>
                  </div>

                  {sc.params.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                      {sc.params.map((param) => (
                        <div key={param.key} className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{param.label}</Label>
                          <Input
                            placeholder={param.placeholder}
                            value={currentParams[param.key] ?? param.defaultValue ?? ''}
                            onChange={(e) => updateScenarioParam(sc.id, param.key, e.target.value)}
                            className="font-mono text-xs h-7"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 bg-background border rounded font-mono text-xs">
                    <span className="truncate mr-2 text-foreground font-semibold">{resolvedCommand}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleCopy(resolvedCommand, 'Command')}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: CHANGELOG */}
        <TabsContent value="changelog" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* LOG INPUT */}
          <div className="border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">Raw Commits / Git Log</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRawCommits(rawCommits)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Re-parse
              </Button>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="plaintext"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={rawCommits}
                onChange={(val) => setRawCommits(val || '')}
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

          {/* GENERATED CHANGELOG */}
          <div className="border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">CHANGELOG.md</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(changelogResult, 'Changelog')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDownload(changelogResult, 'CHANGELOG.md')}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="markdown"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={changelogResult}
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

        {/* TAB 4: GITIGNORE */}
        <TabsContent value="gitignore" className="flex-1 m-0 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CONTROLS */}
          <div className="p-4 border rounded-lg bg-background flex flex-col gap-3 overflow-y-auto mac-scrollbar">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Preset Bundles
            </h2>
            <div className="space-y-2 text-xs">
              {Object.keys(GITIGNORE_PRESETS).map((preset) => (
                <label
                  key={preset}
                  className="flex items-center space-x-2 p-2 rounded border bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPresets.includes(preset)}
                    onChange={() => togglePreset(preset)}
                    className="rounded border-border text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold">{preset}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background min-h-0">
            <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-11">
              <span className="text-xs font-mono font-semibold text-muted-foreground">.gitignore</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(gitignoreResult, '.gitignore')}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDownload(gitignoreResult, '.gitignore')}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language="plaintext"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={gitignoreResult}
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
      </Tabs>
    </div>
  );
}
