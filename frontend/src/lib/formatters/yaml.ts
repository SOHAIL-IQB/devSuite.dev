import type { FormatterStrategy, FormatterResult } from './types';

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
  }
};
