import { describe, it, expect } from 'vitest';
import { parseLetterboxdCsv } from './letterboxd';

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function ratingsCsv(rows: { Date?: string; Name: string; Year?: string; Rating?: string }[]): string {
  const header = 'Date,Name,Year,Letterboxd URI,Rating';
  const lines = rows.map((r) =>
    [r.Date ?? '', r.Name, r.Year ?? '', 'https://boxd.it/xyz', r.Rating ?? ''].map((v) => csvField(v)).join(','),
  );
  return [header, ...lines].join('\n');
}

function diaryCsv(rows: { Date?: string; Name: string; Year?: string; Rating?: string; Rewatch?: string; Tags?: string }[]): string {
  const header = 'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags';
  const lines = rows.map((r) =>
    [r.Date ?? '', r.Name, r.Year ?? '', 'https://boxd.it/xyz', r.Rating ?? '', r.Rewatch ?? '', r.Tags ?? '']
      .map((v) => csvField(v))
      .join(','),
  );
  return [header, ...lines].join('\n');
}

describe('parseLetterboxdCsv', () => {
  it('parses ratings.csv rows, converting the 5-star scale to ratingTenths and prepending the watched date', () => {
    const csv = ratingsCsv([{ Date: '2021-05-02', Name: 'Dune', Year: '2021', Rating: '4.5' }]);
    const result = parseLetterboxdCsv(csv);

    expect(result.skippedInvalid).toBe(0);
    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0];
    expect(entry.title).toBe('Dune');
    expect(entry.year).toBe(2021);
    expect(entry.ratingTenths).toBe(90);
    expect(entry.status).toBeNull();
    expect(entry.notes).toBe('Watched: 2021-05-02');
  });

  it('treats a blank rating as unrated (null)', () => {
    const csv = ratingsCsv([{ Name: 'Unrated Film', Year: '2020', Rating: '' }]);
    const result = parseLetterboxdCsv(csv);
    expect(result.entries[0].ratingTenths).toBeNull();
  });

  it('collapses a rewatch (same title+year, multiple dates) into one entry using the latest date', () => {
    const csv = diaryCsv([
      { Date: '2018-01-01', Name: 'Arrival', Year: '2016', Rating: '4', Tags: 'first-watch' },
      { Date: '2022-06-15', Name: 'Arrival', Year: '2016', Rating: '5', Tags: 'rewatch' },
    ]);
    const result = parseLetterboxdCsv(csv);

    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0];
    expect(entry.ratingTenths).toBe(100);
    expect(entry.notes).toBe('Watched: 2022-06-15');
    expect(entry.tags).toEqual(['rewatch']);
  });

  it('parses the Tags column from diary.csv', () => {
    const csv = diaryCsv([{ Name: 'Paddington 2', Year: '2017', Rating: '5', Tags: 'comfort, rewatch' }]);
    const result = parseLetterboxdCsv(csv);
    expect(result.entries[0].tags.sort()).toEqual(['comfort', 'rewatch']);
  });

  it('parses a title containing a comma via CSV quoting', () => {
    const csv = ratingsCsv([{ Name: 'Se7en, the Movie', Year: '1995', Rating: '4' }]);
    const result = parseLetterboxdCsv(csv);
    expect(result.entries[0].title).toBe('Se7en, the Movie');
  });

  it('skips a row missing Name, with a warning, and does not throw', () => {
    const csv = ratingsCsv([{ Name: '', Year: '2020', Rating: '3' }]);
    const result = parseLetterboxdCsv(csv);
    expect(result.entries).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('missing Name'))).toBe(true);
  });

  it('throws a clear error for a watched.csv/watchlist.csv-shaped file with no Rating column', () => {
    const csv = ['Date,Name,Year,Letterboxd URI', '2020-01-01,Some Film,2019,https://boxd.it/abc'].join('\n');
    expect(() => parseLetterboxdCsv(csv)).toThrow(/Rating/);
  });

  it('reports the true physical row number for a warning after an earlier blank line', () => {
    const csv = [
      'Date,Name,Year,Letterboxd URI,Rating',
      '2020-01-01,First Film,2020,https://boxd.it/xyz,4',
      '', // a blank line, as some real exports have between sections
      ',,2019,https://boxd.it/xyz,3', // missing Name
    ].join('\n');
    const result = parseLetterboxdCsv(csv);
    // The row missing a Name is truly on physical line 4 (header=1, First Film=2, blank=3), not
    // line 3, which a naive index-based count over skipEmptyLines:true output would report.
    expect(result.warnings.some((w) => w.startsWith('Row 4'))).toBe(true);
  });
});
