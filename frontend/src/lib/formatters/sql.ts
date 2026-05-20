import type { FormatterStrategy, FormatterResult, DiagnosticMarker } from './types';

export const sqlFormatter: FormatterStrategy = {
  id: 'sql',
  name: 'SQL',
  monacoLanguage: 'sql',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const { format } = await import('sql-formatter');
      const formatted = format(code);
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  },
  validate: async (code: string): Promise<DiagnosticMarker[]> => {
    if (!code.trim()) return [];
    try {
      const { format } = await import('sql-formatter');
      format(code);
      return [];
    } catch (e: any) {
      const match = e.message.match(/line (\d+).*column (\d+)/i);
      const line = match ? parseInt(match[1], 10) : 1;
      const col = match ? parseInt(match[2], 10) : 1;
      return [{
        severity: 'error',
        message: e.message.split('\n')[0],
        startLineNumber: line,
        startColumn: col,
        endLineNumber: line,
        endColumn: col + 1,
      }];
    }
  }
};
