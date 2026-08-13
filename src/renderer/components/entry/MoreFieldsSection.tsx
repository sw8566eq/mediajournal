import { useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/** Collapsible container for the form's less-frequently-edited fields, closed by default. */
export function MoreFieldsSection({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="more-fields">
      <button type="button" className="more-fields-toggle" onClick={() => setOpen((o) => !o)}>
        <span className={open ? 'more-fields-caret open' : 'more-fields-caret'}>▸</span>
        More fields
      </button>
      {open && <div className="more-fields-content">{children}</div>}
    </div>
  );
}
