interface Props {
  label: string;
  value: string;
  sublabel?: string;
}

/** A single KPI tile - used for headline numbers that don't warrant a chart (per the dataviz
 *  skill's form guidance: "sometimes the answer is not a chart, it's a stat tile"). Also how
 *  typeSpecificTotals are shown - each is a different unit (hours/pages/minutes), so they can't
 *  share one chart axis without a dual-axis chart (an anti-pattern); separate tiles sidestep that
 *  entirely. */
export function StatCard({ label, value, sublabel }: Props) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sublabel && <div className="stat-card-sublabel">{sublabel}</div>}
    </div>
  );
}
