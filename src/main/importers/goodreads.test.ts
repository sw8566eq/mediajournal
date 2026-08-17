import { describe, it, expect } from 'vitest';
import { parseGoodreadsCsv } from './goodreads';

const HEADER =
  'Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes';

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function row(fields: Partial<Record<string, string>>): string {
  const cols = [
    'Book Id',
    'Title',
    'Author',
    'Author l-f',
    'Additional Authors',
    'ISBN',
    'ISBN13',
    'My Rating',
    'Average Rating',
    'Publisher',
    'Binding',
    'Number of Pages',
    'Year Published',
    'Original Publication Year',
    'Date Read',
    'Date Added',
    'Bookshelves',
    'Bookshelves with positions',
    'Exclusive Shelf',
    'My Review',
    'Spoiler',
    'Private Notes',
  ];
  return cols.map((c) => csvField(fields[c] ?? '')).join(',');
}

describe('parseGoodreadsCsv', () => {
  it('parses a normal read row with a rating, shelves, review, and read date', () => {
    const csv = [
      HEADER,
      row({
        Title: 'Dune',
        Author: 'Frank Herbert',
        'My Rating': '5',
        'Year Published': '1990',
        'Original Publication Year': '1965',
        'Number of Pages': '412',
        'Date Read': '2021/05/02',
        Bookshelves: 'sci-fi, favorites, read',
        'Exclusive Shelf': 'read',
        'My Review': 'Loved it.',
      }),
    ].join('\n');

    const result = parseGoodreadsCsv(csv);

    expect(result.skippedInvalid).toBe(0);
    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0];
    expect(entry.title).toBe('Dune');
    expect(entry.author).toBe('Frank Herbert');
    expect(entry.year).toBe(1990);
    expect(entry.pages).toBe(412);
    expect(entry.ratingTenths).toBe(100);
    expect(entry.status).toBeNull();
    expect(entry.notes).toBe('Read: 2021/05/02\n\nLoved it.');
    // exclusive shelf name is not duplicated into tags
    expect(entry.tags.sort()).toEqual(['favorites', 'sci-fi']);
  });

  it('falls back to Original Publication Year when Year Published is blank', () => {
    const csv = [HEADER, row({ Title: 'Old Book', 'Original Publication Year': '1950', 'Exclusive Shelf': 'read' })].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.entries[0].year).toBe(1950);
  });

  it('maps currently-reading and to-read shelves to in_progress/planned', () => {
    const csv = [
      HEADER,
      row({ Title: 'A', 'Exclusive Shelf': 'currently-reading' }),
      row({ Title: 'B', 'Exclusive Shelf': 'to-read' }),
    ].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.entries.find((e) => e.title === 'A')?.status).toBe('in_progress');
    expect(result.entries.find((e) => e.title === 'B')?.status).toBe('planned');
  });

  it('treats an unrecognized shelf as finished, with a warning', () => {
    const csv = [HEADER, row({ Title: 'Mystery Shelf Book', 'Exclusive Shelf': 'currently-listening' })].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.entries[0].status).toBeNull();
    expect(result.warnings.some((w) => w.includes('unrecognized shelf'))).toBe(true);
  });

  it('treats a rating of 0 as unrated (null), not a real zero rating', () => {
    const csv = [HEADER, row({ Title: 'Unrated Book', 'My Rating': '0', 'Exclusive Shelf': 'read' })].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.entries[0].ratingTenths).toBeNull();
  });

  it('handles a blank Bookshelves and Number of Pages without error', () => {
    const csv = [HEADER, row({ Title: 'Sparse Row', 'Exclusive Shelf': 'read' })].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.skippedInvalid).toBe(0);
    expect(result.entries[0].pages).toBeNull();
    expect(result.entries[0].tags).toEqual([]);
  });

  it('parses a review containing an embedded comma and a quoted newline', () => {
    const csv = [
      HEADER,
      row({
        Title: 'Quoted Review Book',
        'Exclusive Shelf': 'read',
        'My Review': 'Great, but slow.\nWorth it though.',
      }),
    ].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.skippedInvalid).toBe(0);
    expect(result.entries[0].notes).toContain('Great, but slow.\nWorth it though.');
  });

  it('skips a row missing Title, with a warning, and does not throw', () => {
    const csv = [HEADER, row({ Author: 'No Title Here', 'Exclusive Shelf': 'read' })].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.entries).toHaveLength(0);
    expect(result.skippedInvalid).toBe(1);
    expect(result.warnings.some((w) => w.includes('skipped'))).toBe(true);
  });

  it('combines My Review and Private Notes, and prepends the read date to both', () => {
    const csv = [
      HEADER,
      row({
        Title: 'Both Notes Book',
        'Exclusive Shelf': 'read',
        'Date Read': '2020/01/15',
        'My Review': 'Public thoughts.',
        'Private Notes': 'Private thoughts.',
      }),
    ].join('\n');
    const result = parseGoodreadsCsv(csv);
    expect(result.entries[0].notes).toBe('Read: 2020/01/15\n\nPublic thoughts.\n\nPrivate thoughts.');
  });
});
