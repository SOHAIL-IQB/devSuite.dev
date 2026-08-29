export interface WorkspaceBackup {
  version: string;
  exportedAt: string;
  app: 'DevSuite.dev';
  data: {
    collections?: any[];
    environments?: any[];
    notes?: any[];
    mockServers?: any[];
    history?: any[];
  };
}

/**
 * Creates a complete JSON backup of the active workspace.
 */
export function exportWorkspaceData(data: WorkspaceBackup['data']): string {
  const backup: WorkspaceBackup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    app: 'DevSuite.dev',
    data,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Validates and parses imported workspace JSON backup file.
 */
export function validateAndParseBackup(jsonString: string): {
  valid: boolean;
  error?: string;
  backup?: WorkspaceBackup;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'File does not contain valid JSON object.' };
    }
    if (parsed.app !== 'DevSuite.dev') {
      return { valid: false, error: 'Unrecognized backup format. Expected DevSuite.dev workspace file.' };
    }
    if (!parsed.data || typeof parsed.data !== 'object') {
      return { valid: false, error: 'Missing data payload in backup file.' };
    }

    return {
      valid: true,
      backup: parsed as WorkspaceBackup,
    };
  } catch (err: any) {
    return { valid: false, error: `JSON Parse Error: ${err.message}` };
  }
}
