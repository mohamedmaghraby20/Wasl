import { describe, expect, it } from 'vitest';
import { i18n } from './i18n';

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe('i18n resources', () => {
  it('does not contain Unicode replacement characters', () => {
    const strings = collectStrings(i18n.options.resources);
    expect(strings.filter((value) => value.includes('\uFFFD'))).toEqual([]);
  });

  it('uses Arabic plural forms for discovery result counts', () => {
    const ar = i18n.getFixedT('ar');
    expect(ar('resultCount', { count: 1 })).toBe('نتيجة واحدة');
    expect(ar('resultCount', { count: 2 })).toBe('نتيجتان');
    expect(ar('resultCount', { count: 3 })).toBe('3 نتائج');
    expect(ar('resultCount', { count: 11 })).toBe('11 نتيجة');
  });
});
