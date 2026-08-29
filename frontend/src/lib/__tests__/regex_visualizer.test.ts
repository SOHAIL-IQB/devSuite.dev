import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  explainRegex,
  testRegex,
  REGEX_LIBRARY,
} from '../regex_visualizer.utils.ts';

describe('RegEx Visualizer & Pattern Studio', () => {
  it('should parse regex AST tokens into human readable descriptions', () => {
    const tokens = explainRegex('^[a-z0-9]+\\.[a-z]{2,4}$');
    assert.ok(tokens.length >= 5);
    assert.ok(tokens.some((t) => t.type === 'anchor' && t.raw === '^'));
    assert.ok(tokens.some((t) => t.type === 'char-class' && t.raw === '[a-z0-9]'));
    assert.ok(tokens.some((t) => t.type === 'quantifier' && t.raw === '+'));
    assert.ok(tokens.some((t) => t.type === 'special' && t.raw === '\\.'));
    assert.ok(tokens.some((t) => t.type === 'anchor' && t.raw === '$'));
  });

  it('should execute regex test and extract capture matches and perform replacements', () => {
    const text = 'hello john@example.com and jane@work.org';
    const result = testRegex('([a-z]+)@([a-z.]+)', 'g', text, '$1 at $2');

    assert.equal(result.matched, true);
    assert.equal(result.matchCount, 2);
    assert.equal(result.matches[0].text, 'john@example.com');
    assert.equal(result.matches[1].text, 'jane@work.org');
    assert.equal(result.replacedText, 'hello john at example.com and jane at work.org');
  });

  it('should validate all standard library regex snippets against valid inputs', () => {
    const emailSnippet = REGEX_LIBRARY.find((s) => s.title.includes('Email'));
    assert.ok(emailSnippet);
    const emailResult = testRegex(emailSnippet.pattern, emailSnippet.flags, 'dev@company.io');
    assert.equal(emailResult.matched, true);

    const uuidSnippet = REGEX_LIBRARY.find((s) => s.title.includes('UUID'));
    assert.ok(uuidSnippet);
    const uuidResult = testRegex(uuidSnippet.pattern, uuidSnippet.flags, '123e4567-e89b-42d3-a456-426614174000');
    assert.equal(uuidResult.matched, true);
  });
});
