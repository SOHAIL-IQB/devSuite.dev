import type { FormatterStrategy, FormatterResult } from './types';

export const jsonFormatter: FormatterStrategy = {
  id: 'json',
  name: 'JSON',
  monacoLanguage: 'json',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const parsed = JSON.parse(code);
      return {
        formatted: JSON.stringify(parsed, null, 2),
        isValid: true
      };
    } catch (e: any) {
      return {
        formatted: code,
        isValid: false,
        error: e.message
      };
    }
  },
  minify: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const parsed = JSON.parse(code);
      return {
        formatted: JSON.stringify(parsed),
        isValid: true
      };
    } catch (e: any) {
      return {
        formatted: code,
        isValid: false,
        error: e.message
      };
    }
  }
};
