import { describe, expect, it } from 'vitest';
import type { Database } from '../../db/database.module';
import { ReferenceDataRepository, categorySlug } from './reference-data.repository';

describe('categorySlug', () => {
  it('lowercases and transliterates Turkish letters', () => {
    expect(categorySlug('İş ve Girişimcilik')).toBe('is-ve-girisimcilik');
    expect(categorySlug('Arapça & Kültür')).toBe('arapca-kultur');
  });

  it('collapses punctuation into single hyphens', () => {
    expect(categorySlug('  Hello -- World!  ')).toBe('hello-world');
  });

  it('returns an empty string when nothing latin remains', () => {
    expect(categorySlug('ثقافة')).toBe('');
  });
});

describe('ReferenceDataRepository.createCategory', () => {
  it('rejects names outside the 2 to 40 character range', async () => {
    const repository = new ReferenceDataRepository({} as Database);
    await expect(repository.createCategory(' a ')).rejects.toThrow('2 to 40');
    await expect(repository.createCategory('x'.repeat(41))).rejects.toThrow('2 to 40');
  });
});
