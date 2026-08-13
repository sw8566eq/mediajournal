import type { MediaType } from '@shared/types';
import { TYPE_FIELDS } from '../../mediaTypeConfig';

interface Props {
  mediaType: MediaType;
  values: Record<string, unknown>;
  onChange: (key: string, value: string | number | null) => void;
}

/** Renders the field set specific to the active media type (director/year/runtime for movies, author/pages for books, etc.), config-driven from mediaTypeConfig. */
export function TypeSpecificFields({ mediaType, values, onChange }: Props) {
  return (
    <>
      {TYPE_FIELDS[mediaType].map((field) => (
        <label className="field" key={field.key}>
          <span>{field.label}</span>
          <input
            type={field.type}
            step={field.step}
            value={(values[field.key] as string | number | undefined) ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange(field.key, null);
                return;
              }
              onChange(field.key, field.type === 'number' ? Number(raw) : raw);
            }}
          />
        </label>
      ))}
    </>
  );
}
