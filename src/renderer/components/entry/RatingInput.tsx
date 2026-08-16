import { useEffect, useState } from 'react';
import { parseRatingTenths } from './ratingInputParsing';

interface Props {
  valueTenths: number | null;
  onChange: (tenths: number | null) => void;
}

/** Rating entry constrained to 0.0-10.0 in 0.1 steps. Internally works in integer tenths to avoid float drift. */
export function RatingInput({ valueTenths, onChange }: Props) {
  const formatted = valueTenths === null ? '' : (valueTenths / 10).toFixed(1);

  // Local raw text, separate from `formatted`. A plain controlled input driven straight off
  // `formatted` used to reformat on every keystroke - typing "3" committed 30 tenths, which
  // re-rendered the field to "3.0" immediately, so the next keystroke ("." ) produced "3.0." on a
  // native type="number" input: not a valid number, so the browser just dropped it and every
  // keystroke after seemed to do nothing. `text` is what the user actually sees while typing;
  // it's only resynced from `formatted` when the field *isn't* focused (an external change - a
  // different entry loaded, external-search autofill, cancel - not something typed here).
  const [text, setText] = useState(formatted);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatted);
  }, [formatted, focused]);

  function handleChange(raw: string) {
    const tenths = parseRatingTenths(raw);
    if (tenths === undefined) return; // not a valid partial decimal yet - ignore the keystroke
    setText(raw);
    onChange(tenths);
  }

  function step(direction: 1 | -1) {
    const next = Math.min(100, Math.max(0, (valueTenths ?? 0) + direction));
    onChange(next);
    setText((next / 10).toFixed(1)); // a full jump, not partial typing - safe to show immediately
  }

  return (
    <label className="field">
      <span>Rating (0–10)</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="e.g. 8.2"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(formatted); // snap back to the canonical X.X form, discarding e.g. a trailing "."
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
          }
        }}
      />
    </label>
  );
}
