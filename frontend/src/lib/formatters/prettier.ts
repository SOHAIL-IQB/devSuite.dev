import type { FormatterStrategy, FormatterResult } from './types';

export const htmlFormatter: FormatterStrategy = {
  id: 'html',
  name: 'HTML',
  monacoLanguage: 'html',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const prettier = await import('prettier/standalone');
      const htmlPlugin = await import('prettier/plugins/html');
      
      const formatted = await prettier.format(code, {
        parser: 'html',
        plugins: [htmlPlugin],
      });
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  }
};

export const cssFormatter: FormatterStrategy = {
  id: 'css',
  name: 'CSS',
  monacoLanguage: 'css',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const prettier = await import('prettier/standalone');
      const postcssPlugin = await import('prettier/plugins/postcss');
      
      const formatted = await prettier.format(code, {
        parser: 'css',
        plugins: [postcssPlugin],
      });
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  }
};

export const jsFormatter: FormatterStrategy = {
  id: 'javascript',
  name: 'JavaScript',
  monacoLanguage: 'javascript',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const prettier = await import('prettier/standalone');
      const babelPlugin = await import('prettier/plugins/babel');
      const estreePlugin = await import('prettier/plugins/estree');
      
      const formatted = await prettier.format(code, {
        parser: 'babel',
        plugins: [babelPlugin, estreePlugin],
        singleQuote: true,
      });
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  }
};

export const tsFormatter: FormatterStrategy = {
  id: 'typescript',
  name: 'TypeScript',
  monacoLanguage: 'typescript',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const prettier = await import('prettier/standalone');
      const tsPlugin = await import('prettier/plugins/typescript');
      const estreePlugin = await import('prettier/plugins/estree');
      
      const formatted = await prettier.format(code, {
        parser: 'typescript',
        plugins: [tsPlugin, estreePlugin],
        singleQuote: true,
      });
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  }
};

export const markdownFormatter: FormatterStrategy = {
  id: 'markdown',
  name: 'Markdown',
  monacoLanguage: 'markdown',
  format: async (code: string): Promise<FormatterResult> => {
    try {
      if (!code.trim()) return { formatted: code, isValid: true };
      const prettier = await import('prettier/standalone');
      const markdownPlugin = await import('prettier/plugins/markdown');
      
      const formatted = await prettier.format(code, {
        parser: 'markdown',
        plugins: [markdownPlugin],
      });
      return { formatted, isValid: true };
    } catch (e: any) {
      return { formatted: code, isValid: false, error: e.message };
    }
  }
};
