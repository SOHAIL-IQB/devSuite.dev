import { jsonFormatter } from './json';
import { htmlFormatter, cssFormatter, jsFormatter, tsFormatter, markdownFormatter } from './prettier';
import { sqlFormatter } from './sql';
import { yamlFormatter } from './yaml';
import { xmlFormatter } from './xml';

export * from './types';

export const formatters = {
  json: jsonFormatter,
  xml: xmlFormatter,
  yaml: yamlFormatter,
  sql: sqlFormatter,
  html: htmlFormatter,
  css: cssFormatter,
  javascript: jsFormatter,
  typescript: tsFormatter,
  markdown: markdownFormatter,
};

export type FormatterType = keyof typeof formatters;
