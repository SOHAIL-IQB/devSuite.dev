import type { FormatterStrategy, FormatterResult, DiagnosticMarker } from './types';

export const yamlFormatter: FormatterStrategy = {
  id: 'yaml',
  name: 'YAML',
  monacoLanguage: 'yaml',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const yaml = await import('yaml');
      const parsed = yaml.parse(code);
      const formatted = yaml.stringify(parsed);
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  },
  validate: async (code: string): Promise<DiagnosticMarker[]> => {
    if (!code.trim()) return [];
    try {
      const yaml = await import('yaml');
      yaml.parse(code);
      return [];
    } catch (e: any) {
      const startLine = e.linePos?.[0]?.line || 1;
      const startCol = e.linePos?.[0]?.col || 1;
      const endLine = e.linePos?.[1]?.line || startLine;
      const endCol = e.linePos?.[1]?.col || startCol + 1;
      return [{
        severity: 'error',
        message: e.message,
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol,
      }];
    }
  }
};
