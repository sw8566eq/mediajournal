import { useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  /** Renders in the destructive-action color (e.g. Delete). */
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/**
 * Small floating menu positioned at a click point (right-click on a card). Self-closes on an
 * outside click, another right-click, Escape, or scroll - callers just own "is it open, for
 * which entry" state and re-render with new x/y/items when that changes.
 */
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Clamp after the first paint so the menu never renders partly off-screen for a right-click
  // near the window's right/bottom edge - the true size isn't known until it's in the DOM.
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 4;
    const maxY = window.innerHeight - rect.height - 4;
    setPos({ x: Math.min(x, Math.max(4, maxX)), y: Math.min(y, Math.max(4, maxY)) });
  }, [x, y]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    // Deferred a tick: the same right-click that opens this menu is still bubbling ('contextmenu'
    // fires after 'mousedown'/'mouseup' for that click) when this effect first runs - registering
    // immediately would let it close itself before ever being seen.
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', onClose);
      document.addEventListener('contextmenu', onClose);
      document.addEventListener('scroll', onClose, true);
    }, 0);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onClose);
      document.removeEventListener('contextmenu', onClose);
      document.removeEventListener('scroll', onClose, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="context-menu" style={{ left: pos.x, top: pos.y }} ref={ref}>
      {items.map((item) => (
        <button
          type="button"
          key={item.label}
          className={item.danger ? 'context-menu-item danger' : 'context-menu-item'}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
