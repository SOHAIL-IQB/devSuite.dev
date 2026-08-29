import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommitMessage,
  parseLogToChangelog,
  buildGitignore,
  GIT_SCENARIOS,
} from '../git_tools.utils.ts';

describe('Git Studio & Command Navigator', () => {
  it('should build conventional commit message and git command string', () => {
    const { message, gitCommand } = buildCommitMessage({
      type: 'feat',
      scope: 'auth',
      isBreaking: true,
      shortDescription: 'implement OAuth2 PKCE',
      longBody: 'Migrates auth flow to PKCE standard.',
      breakingChangeDescription: 'Auth headers now require Bearer token.',
      closedIssues: '#42',
    });

    assert.ok(message.includes('feat(auth)!: implement OAuth2 PKCE'));
    assert.ok(message.includes('Migrates auth flow to PKCE standard.'));
    assert.ok(message.includes('BREAKING CHANGE: Auth headers now require Bearer token.'));
    assert.ok(message.includes('Closes: #42'));
    assert.ok(gitCommand.startsWith('git commit -m "feat(auth)!:'));
  });

  it('should parse raw git logs into categorized markdown changelog', () => {
    const rawLogs = `
      1a2b3c4 feat(api): add webhook catcher
      5d6e7f8 fix(db): resolve connection pool exhaustion
      9a0b1c2 perf(render): memoize syntax highlighter
      3a4b5c6 refactor: clean up routes
      7a8b9c0 feat!: breaking api v2 overhaul
    `;

    const changelog = parseLogToChangelog(rawLogs);
    assert.ok(changelog.includes('## 📦 Changelog'));
    assert.ok(changelog.includes('### ⚠️ Breaking Changes'));
    assert.ok(changelog.includes('### 🚀 New Features'));
    assert.ok(changelog.includes('### 🐛 Bug Fixes'));
    assert.ok(changelog.includes('### ⚡ Performance Improvements'));
    assert.ok(changelog.includes('### 🛠️ Refactors & Maintenance'));
  });

  it('should resolve scenario commands with custom parameter overrides', () => {
    const renameScenario = GIT_SCENARIOS.find((s) => s.id === 'rename-branch');
    assert.ok(renameScenario);

    const cmd = renameScenario.generateCommand({ oldName: 'feature-1', newName: 'feature-2' });
    assert.ok(cmd.includes('git branch -m feature-1 feature-2'));
    assert.ok(cmd.includes('git push origin -u feature-2'));
    assert.ok(cmd.includes('git push origin --delete feature-1'));
  });

  it('should bundle multiple .gitignore presets together', () => {
    const gitignore = buildGitignore(['NodeJS', 'Python', 'VSCode']);
    assert.ok(gitignore.includes('node_modules/'));
    assert.ok(gitignore.includes('__pycache__/'));
    assert.ok(gitignore.includes('.vscode/*'));
  });
});
