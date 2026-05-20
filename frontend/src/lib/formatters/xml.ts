import type { FormatterStrategy, FormatterResult, DiagnosticMarker } from './types';

export const xmlFormatter: FormatterStrategy = {
  id: 'xml',
  name: 'XML',
  monacoLanguage: 'xml',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const xmlFormat = (await import('xml-formatter')).default;
      const formatted = xmlFormat(code, {
        collapseContent: true,
      });
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  },
  validate: async (code: string): Promise<DiagnosticMarker[]> => {
    if (!code.trim()) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, "application/xml");
      const errorNode = doc.querySelector("parsererror");
      
      if (errorNode) {
        const errorText = errorNode.textContent || '';
        const match = errorText.match(/line (\d+) at column (\d+)/i);
        const line = match ? parseInt(match[1], 10) : 1;
        const col = match ? parseInt(match[2], 10) : 1;
        
        return [{
          severity: 'error',
          message: errorText.split('\n')[0] || 'Invalid XML structure',
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: col + 1,
        }];
      }
      return [];
    } catch (e: any) {
      return [{
        severity: 'error',
        message: e.message,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 2,
      }];
    }
  }
};
