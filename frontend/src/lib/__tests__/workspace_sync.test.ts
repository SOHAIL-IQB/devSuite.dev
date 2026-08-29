import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  exportWorkspaceData,
  validateAndParseBackup,
} from '../workspace_sync.utils.ts';

describe('Workspace Sync & Backup Engine', () => {
  it('should export valid JSON backup structure with metadata', () => {
    const backupJson = exportWorkspaceData({
      collections: [{ id: 'col-1', name: 'Billing API' }],
      environments: [{ id: 'env-1', name: 'Production' }],
      notes: [{ id: 'note-1', title: 'Roadmap', content: 'Architecture review' }],
    });

    const parsed = JSON.parse(backupJson);
    assert.equal(parsed.app, 'DevSuite.dev');
    assert.equal(parsed.version, '1.0.0');
    assert.equal(parsed.data.collections.length, 1);
    assert.equal(parsed.data.environments.length, 1);
    assert.equal(parsed.data.notes.length, 1);
  });

  it('should validate and parse compliant backup file', () => {
    const validJson = JSON.stringify({
      app: 'DevSuite.dev',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        collections: [{ id: 'c1', name: 'Users API' }],
      },
    });

    const result = validateAndParseBackup(validJson);
    assert.equal(result.valid, true);
    assert.ok(result.backup);
    assert.equal(result.backup.data.collections?.length, 1);
  });

  it('should reject invalid or non-DevSuite backup formats', () => {
    const invalidJson = JSON.stringify({
      app: 'UnknownApp',
      data: {},
    });

    const result = validateAndParseBackup(invalidJson);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('Unrecognized backup format'));
  });
});
