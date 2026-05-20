import type { FormatterStrategy, FormatterResult } from './types';

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
  }
};
