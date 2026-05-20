export interface FormatterResult {
  formatted: string;
  isValid: boolean;
  error?: string;
}

export interface FormatterStrategy {
  id: string;
  name: string;
  monacoLanguage: string;
  format: (code: string) => Promise<FormatterResult>;
  minify?: (code: string) => Promise<FormatterResult>;
}
