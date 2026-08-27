import { describe, it, expect } from 'vitest';
import { formatSourceImportSummary, formatImportSummary } from './importSummary';
import type { ImportSummary, SourceImportSummary } from '@shared/types';

function summary(overrides: Partial<SourceImportSummary>): SourceImportSummary {
  return {
    movie: 0,
    tv: 0,
    book: 0,
    album: 0,
    game: 0,
    tags: 0,
    skippedDuplicate: 0,
    skippedInvalid: 0,
    warnings: [],
    ...overrides,
  };
}

describe('formatSourceImportSummary', () => {
  it('reports a plain imported count when nothing was skipped', () => {
    const result = formatSourceImportSummary(summary({ book: 42 }), 'book');
    expect(result).toBe('Imported 42 Books.');
  });

  it('reports nothing-new-to-import when the count is zero', () => {
    const result = formatSourceImportSummary(summary({ movie: 0 }), 'movie');
    expect(result).toBe('Nothing new to import.');
  });

  it('appends a skipped-duplicate clause', () => {
    const result = formatSourceImportSummary(summary({ movie: 10, skippedDuplicate: 3 }), 'movie');
    expect(result).toBe('Imported 10 Movies. Skipped 3 already in your library.');
  });

  it('appends a skipped-invalid clause with correct singular/plural phrasing', () => {
    const one = formatSourceImportSummary(summary({ book: 5, skippedInvalid: 1 }), 'book');
    expect(one).toBe("Imported 5 Books. Skipped 1 row that couldn't be read.");

    const many = formatSourceImportSummary(summary({ book: 5, skippedInvalid: 2 }), 'book');
    expect(many).toBe("Imported 5 Books. Skipped 2 rows that couldn't be read.");
  });

  it('combines both skip clauses', () => {
    const result = formatSourceImportSummary(summary({ movie: 1, skippedDuplicate: 2, skippedInvalid: 1 }), 'movie');
    expect(result).toBe("Imported 1 Movies. Skipped 2 already in your library. Skipped 1 row that couldn't be read.");
  });

  it('never mentions a tag count even when the raw summary has one', () => {
    const result = formatSourceImportSummary(summary({ book: 1, tags: 5 }), 'book');
    expect(result).not.toContain('tag');
  });
});

function importSummary(overrides: Partial<ImportSummary>): ImportSummary {
  return { movie: 0, tv: 0, book: 0, album: 0, game: 0, tags: 0, ...overrides };
}

describe('formatImportSummary', () => {
  it('reports nothing-to-import for an empty summary', () => {
    expect(formatImportSummary(importSummary({}))).toBe('Nothing to import - the file was empty.');
  });

  it('lists every non-zero media type in a fixed order', () => {
    const result = formatImportSummary(importSummary({ movie: 2, book: 1 }));
    expect(result).toBe('Imported 2 Movies, 1 Books.');
  });

  it('appends a tag count when present', () => {
    const result = formatImportSummary(importSummary({ book: 1, tags: 3 }));
    expect(result).toBe('Imported 1 Books, 3 tags.');
  });

  it('singularizes a tag count of exactly 1', () => {
    const result = formatImportSummary(importSummary({ tags: 1 }));
    expect(result).toBe('Imported 1 tag.');
  });
});
