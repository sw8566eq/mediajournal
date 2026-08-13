interface Props {
  valueTenths: number | null;
  onChange: (tenths: number | null) => void;
}

/** Rating entry constrained to 0.0-10.0 in 0.1 steps. Internally works in integer tenths to avoid float drift. */
export function RatingInput({ valueTenths, onChange }: Props) {
  const display = valueTenths === null ? '' : (valueTenths / 10).toFixed(1);

  function handleChange(raw: string) {
    if (raw === '') {
      onChange(null);
      return;
    }
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return;
    const tenths = Math.round(num * 10);
    onChange(Math.min(100, Math.max(0, tenths)));
  }

  return (
    <label className="field">
      <span>Rating (0–10)</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={10}
        step={0.1}
        placeholder="e.g. 8.2"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
      />
    </label>
  );
}
