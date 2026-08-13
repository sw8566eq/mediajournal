import type { EntryStatus } from '@shared/types';
import { STATUS_LABELS } from '../../mediaTypeConfig';

interface Props {
  value: EntryStatus | null;
  onChange: (status: EntryStatus | null) => void;
}

/** Status is optional - the blank option means "no active status" (implicitly finished), not a literal "None" value. */
export function StatusSelect({ value, onChange }: Props) {
  return (
    <label className="field">
      <span>Status</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as EntryStatus))}>
        <option value="">—</option>
        {(Object.entries(STATUS_LABELS) as [EntryStatus, string][]).map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
