import { useMemo } from 'react';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER } from '../../mediaTypeConfig';
import { useActiveMediaTypes } from '../../hooks/useActiveMediaTypes';
import { useMultiTypeEntries } from '../../hooks/useMultiTypeEntries';
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
 * Fetches via useMultiTypeEntries, the same shared hook AllLibraryView uses, rather than adding a
 * server-side aggregate query - appropriate at the scale a personal local library actually reaches
 * (see mediaRepository.ts: no GROUP BY/aggregate SQL exists anywhere in this app).
 */
export function StatsView() {
  const { activeTypes, toggleType } = useActiveMediaTypes();
  const { entries, loading, error } = useMultiTypeEntries<StatsEntry>(activeTypes, {});

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
