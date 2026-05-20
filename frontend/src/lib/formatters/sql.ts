import type { FormatterStrategy, FormatterResult } from './types';

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
  }
};
