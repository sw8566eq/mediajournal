import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  title: string;
  data: BarDatum[];
  emptyMessage?: string;
  /** Horizontal bars (category axis on Y) - better for longer/variable-length labels like genre names. */
  horizontal?: boolean;
}

/**
 * One reusable chart card for every count-based chart in the Stats view (by type, by status,
 * rating histogram, top genres, entries per year). Every one of these is a single series of
 * counts over its own self-labeled categories/bins, not a multi-series comparison - so per the
 * dataviz skill's color-by-job rule, one flat hue is correct throughout and no legend is needed
 * (axis labels already carry category identity; a single series needs no legend box). Colors and
 * ink come from this app's own existing CSS variables (see global.css), not a separate imported
 * palette, so charts match the rest of the shipped UI exactly.
 */
export function BarChartCard({ title, data, emptyMessage = 'No data yet.', horizontal = false }: Props) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {!hasData ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={90}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" width={32} />
              </>
            )}
            <Tooltip
              cursor={{ fill: 'var(--chip-bg)' }}
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12.5,
              }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            {/* Rounded data-end anchored to the baseline: top corners for vertical bars, the
                trailing (right) corners for horizontal ones. */}
            <Bar dataKey="value" fill="var(--accent)" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
