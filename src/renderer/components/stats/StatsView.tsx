import { useEffect, useMemo, useState } from 'react';
import type { MediaType } from '@shared/types';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER } from '../../mediaTypeConfig';
import { api } from '../../api/client';
import { computeStats, type StatsEntry } from '../../stats/computeStats';
import { StatCard } from './StatCard';
import { BarChartCard, type BarDatum } from './BarChartCard';

/** Formats a rating-tenths value (0-100) as the displayed X.X/10 form - only done here at the
 *  display boundary, per CLAUDE.md; computeStats itself deals purely in tenths. */
function formatRating(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

/**
 * Combined stats dashboard spanning every media type at once (mirrors the "All" library view's
 * philosophy), with a type-toggle chip row rather than five separate per-type stats pages.
 * Unfiltered by the main filter bar for v1 - wiring the full filter bar in is a natural v2.
 * Fetches via the same Promise.all-over-active-types pattern AllLibraryView already uses, reused
 * verbatim rather than adding a server-side aggregate query - appropriate at the scale a personal
 * local library actually reaches (see mediaRepository.ts: no GROUP BY/aggregate SQL exists
 * anywhere in this app).
 */
export function StatsView() {
  const [activeTypes, setActiveTypes] = useState<MediaType[]>(MEDIA_TYPE_ORDER);
  const [entries, setEntries] = useState<StatsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTypesKey = activeTypes.slice().sort().join(',');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const perType = await Promise.all(
          activeTypes.map((type) =>
            api[type]
              .list({})
              .then((rows) => (rows as unknown as Record<string, unknown>[]).map((row) => ({ ...row, mediaType: type }))),
          ),
        );
        if (cancelled) return;
        setEntries(perType.flat() as StatsEntry[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypesKey]);

  function toggleType(type: MediaType) {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  const stats = useMemo(() => computeStats(entries), [entries]);

  const typeData: BarDatum[] = stats.countByType.map((c) => ({ label: c.label, value: c.count }));
  const statusData: BarDatum[] = stats.countByStatus.map((c) => ({ label: c.label, value: c.count }));
  const ratingData: BarDatum[] = stats.ratingHistogram.map((b) => ({ label: b.label, value: b.count }));
  const genreData: BarDatum[] = stats.topGenres.map((g) => ({ label: g.genre, value: g.count }));
  const yearData: BarDatum[] = stats.entriesPerYear.map((y) => ({ label: String(y.year), value: y.count }));

  return (
    <div className="stats-view">
      <div className="filter-bar">
        <div className="filter-group">
          {MEDIA_TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              className={activeTypes.includes(type) ? 'chip active' : 'chip'}
              onClick={() => toggleType(type)}
            >
              {MEDIA_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="status-line">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && (
        <>
          <div className="stat-grid">
            <StatCard label="Total Entries" value={String(stats.totalEntries)} />
            <StatCard
              label="Average Rating"
              value={stats.averageRatingTenths !== null ? `${formatRating(stats.averageRatingTenths)}/10` : '—'}
            />
            {stats.typeSpecificTotals.map((t) => (
              <StatCard
                key={`${t.mediaType}-${t.key}`}
                label={t.label}
                value={t.total.toLocaleString()}
                sublabel={MEDIA_TYPE_LABELS[t.mediaType]}
              />
            ))}
          </div>

          <div className="chart-grid">
            <BarChartCard title="Entries by Type" data={typeData} />
            <BarChartCard title="Status" data={statusData} />
            <BarChartCard title="Rating Distribution" data={ratingData} />
            <BarChartCard title="Top Genres" data={genreData} horizontal emptyMessage="No genres logged yet." />
            <BarChartCard title="Added per Year" data={yearData} emptyMessage="No entries logged yet." />
          </div>
        </>
      )}
    </div>
  );
}
