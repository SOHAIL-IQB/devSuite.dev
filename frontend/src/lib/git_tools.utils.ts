export type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore' | 'revert';

export interface CommitMessageOptions {
  type: CommitType;
  scope?: string;
  isBreaking: boolean;
  shortDescription: string;
  longBody?: string;
  breakingChangeDescription?: string;
  closedIssues?: string;
}

export interface GitScenario {
  id: string;
  category: 'undo' | 'branching' | 'stash' | 'remote' | 'inspect';
  title: string;
  description: string;
  generateCommand: (params: Record<string, string>) => string;
  params: { key: string; label: string; placeholder: string; defaultValue?: string }[];
}

export interface CategorizedChangelog {
  features: string[];
  fixes: string[];
  perf: string[];
  refactors: string[];
  breaking: string[];
  others: string[];
}

/**
 * Builds Conventional Commit message string and matching git commit command.
 */
export function buildCommitMessage(opts: CommitMessageOptions): { message: string; gitCommand: string } {
  const {
    type,
    scope,
    isBreaking,
    shortDescription,
    longBody,
    breakingChangeDescription,
    closedIssues,
  } = opts;

  let header = `${type}`;
  if (scope?.trim()) {
    header += `(${scope.trim()})`;
  }
  if (isBreaking) {
    header += `!`;
  }
  header += `: ${shortDescription.trim() || 'update'}`;

  const paragraphs: string[] = [header];

  if (longBody?.trim()) {
    paragraphs.push(longBody.trim());
  }

  if (isBreaking && breakingChangeDescription?.trim()) {
    paragraphs.push(`BREAKING CHANGE: ${breakingChangeDescription.trim()}`);
  }

  if (closedIssues?.trim()) {
    paragraphs.push(`Closes: ${closedIssues.trim()}`);
  }

  const message = paragraphs.join('\n\n');
  const escapedMessage = message.replace(/"/g, '\\"');
  const gitCommand = `git commit -m "${escapedMessage}"`;

  return { message, gitCommand };
}

/**
 * Parses raw git log lines or commit messages into categorized changelog sections.
 */
export function parseLogToChangelog(rawLog: string): string {
  const lines = rawLog.split('\n').map((l) => l.trim()).filter(Boolean);
  const changelog: CategorizedChangelog = {
    features: [],
    fixes: [],
    perf: [],
    refactors: [],
    breaking: [],
    others: [],
  };

  for (const line of lines) {
    // Strip leading hash or branch tags if present (e.g. "abc1234 feat: message" or "* 1234567 feat: message")
    const cleaned = line
      .replace(/^[*>\s-]*([a-z0-9]{6,40}\s+)?/i, '')
      .trim();

    if (/^feat(\(.*?\))?:/i.test(cleaned)) {
      changelog.features.push(cleaned.replace(/^feat(\(.*?\))?:\s*/i, ''));
    } else if (/^fix(\(.*?\))?:/i.test(cleaned)) {
      changelog.fixes.push(cleaned.replace(/^fix(\(.*?\))?:\s*/i, ''));
    } else if (/^perf(\(.*?\))?:/i.test(cleaned)) {
      changelog.perf.push(cleaned.replace(/^perf(\(.*?\))?:\s*/i, ''));
    } else if (/^refactor(\(.*?\))?:/i.test(cleaned)) {
      changelog.refactors.push(cleaned.replace(/^refactor(\(.*?\))?:\s*/i, ''));
    } else if (cleaned.includes('BREAKING') || cleaned.includes('!')) {
      changelog.breaking.push(cleaned);
    } else {
      changelog.others.push(cleaned);
    }
  }

  let md = `## 📦 Changelog (${new Date().toISOString().split('T')[0]})\n\n`;

  if (changelog.breaking.length > 0) {
    md += `### ⚠️ Breaking Changes\n`;
    changelog.breaking.forEach((item) => { md += `- ${item}\n`; });
    md += `\n`;
  }
  if (changelog.features.length > 0) {
    md += `### 🚀 New Features\n`;
    changelog.features.forEach((item) => { md += `- ${item}\n`; });
    md += `\n`;
  }
  if (changelog.fixes.length > 0) {
    md += `### 🐛 Bug Fixes\n`;
    changelog.fixes.forEach((item) => { md += `- ${item}\n`; });
    md += `\n`;
  }
  if (changelog.perf.length > 0) {
    md += `### ⚡ Performance Improvements\n`;
    changelog.perf.forEach((item) => { md += `- ${item}\n`; });
    md += `\n`;
  }
  if (changelog.refactors.length > 0) {
    md += `### 🛠️ Refactors & Maintenance\n`;
    changelog.refactors.forEach((item) => { md += `- ${item}\n`; });
    md += `\n`;
  }
  if (changelog.others.length > 0) {
    md += `### 📝 Other Commits\n`;
    changelog.others.forEach((item) => { md += `- ${item}\n`; });
    md += `\n`;
  }

  return md.trim();
}

/**
 * Common Git scenarios library.
 */
export const GIT_SCENARIOS: GitScenario[] = [
  {
    id: 'undo-last-commit-keep-changes',
    category: 'undo',
    title: 'Undo last commit but keep my code changes',
    description: 'Moves HEAD back by 1 commit while leaving your files in the working directory staged.',
    params: [],
    generateCommand: () => 'git reset --soft HEAD~1',
  },
  {
    id: 'discard-all-local-changes',
    category: 'undo',
    title: 'Discard all uncommitted local modifications completely',
    description: 'Permanently resets tracked files and removes untracked files/directories.',
    params: [],
    generateCommand: () => 'git restore . && git clean -fd',
  },
  {
    id: 'rename-branch',
    category: 'branching',
    title: 'Rename current branch locally and on remote',
    description: 'Renames local branch and updates origin tracking.',
    params: [
      { key: 'oldName', label: 'Old Branch Name', placeholder: 'old-feature', defaultValue: 'old-feature' },
      { key: 'newName', label: 'New Branch Name', placeholder: 'new-feature', defaultValue: 'new-feature' },
    ],
    generateCommand: (p) => `git branch -m ${p.oldName || 'old'} ${p.newName || 'new'} && git push origin -u ${p.newName || 'new'} && git push origin --delete ${p.oldName || 'old'}`,
  },
  {
    id: 'squash-commits',
    category: 'branching',
    title: 'Squash the last N commits into a single commit',
    description: 'Starts an interactive rebase for the last N commits to squash.',
    params: [
      { key: 'count', label: 'Number of Commits', placeholder: '3', defaultValue: '3' },
    ],
    generateCommand: (p) => `git rebase -i HEAD~${p.count || '3'}`,
  },
  {
    id: 'stash-include-untracked',
    category: 'stash',
    title: 'Stash all changes including new untracked files',
    description: 'Saves unstaged, staged, and brand new files to the stash stack.',
    params: [
      { key: 'message', label: 'Stash Description', placeholder: 'work-in-progress', defaultValue: 'wip-feature' },
    ],
    generateCommand: (p) => `git stash push -u -m "${p.message || 'wip'}"`,
  },
  {
    id: 'force-push-safe',
    category: 'remote',
    title: 'Force push safely without overwriting teammate commits',
    description: 'Uses lease verification to guarantee no remote commits are lost.',
    params: [
      { key: 'branch', label: 'Branch Name', placeholder: 'main', defaultValue: 'main' },
    ],
    generateCommand: (p) => `git push origin ${p.branch || 'main'} --force-with-lease`,
  },
  {
    id: 'search-commit-history',
    category: 'inspect',
    title: 'Search entire commit history for a specific code string',
    description: 'Finds which commits introduced or removed a specific text string.',
    params: [
      { key: 'query', label: 'Search Query', placeholder: 'SECRET_API_KEY', defaultValue: 'API_KEY' },
    ],
    generateCommand: (p) => `git log -S "${p.query || 'term'}" --source --all`,
  },
];

/**
 * Preset bundles for .gitignore generator.
 */
export const GITIGNORE_PRESETS: Record<string, string> = {
  NodeJS: `# Node.js / NPM\nnode_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnpm-debug.log*\n.env\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\ndist/\nbuild/\n.next/\n.turbo/\n`,
  Python: `# Python\n__pycache__/\n*.py[cod]\n*$py.class\n*.so\n.Python\nbuild/\ndevelop-eggs/\ndist/\neggs/\n.eggs/\nlib/\nlib64/\nparts/\nsdist/\nvar/\nwheels/\n*.egg-info/\n.installed.cfg\n*.egg\n.env\nvenv/\nENV/\nenv/\n`,
  macOS: `# macOS\n.DS_Store\n.AppleDouble\n.LSOverride\nIcon\r\r\n._*\n.DocumentRevisions-V100\n.fseventsd\n.Spotlight-V100\n.TemporaryItems\n.Trashes\n.VolumeIcon.icns\n.com.apple.timemachine.donotpresent\n`,
  VSCode: `# Visual Studio Code\n.vscode/*\n!.vscode/settings.json\n!.vscode/tasks.json\n!.vscode/launch.json\n!.vscode/extensions.json\n*.code-workspace\n`,
  Rust: `# Rust / Cargo\n/target/\n**/*.rs.bk\nCargo.lock\n`,
  Go: `# Go\nbin/\n*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n*.test\n*.out\nvendor/\n`,
};

/**
 * Builds bundled .gitignore content from selected presets.
 */
export function buildGitignore(selectedPresets: string[]): string {
  if (selectedPresets.length === 0) {
    return '# Generated by DevSuite.dev Git Studio\n';
  }

  let content = `# ==========================================\n# Generated by DevSuite.dev Git Studio\n# ==========================================\n\n`;
  for (const preset of selectedPresets) {
    if (GITIGNORE_PRESETS[preset]) {
      content += GITIGNORE_PRESETS[preset] + '\n';
    }
  }
  return content.trim();
}
