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

  // A right-click doesn't move keyboard focus the way a real click does, so without this a
  // keyboard/screen-reader user who opens the menu some other way (or just presses Tab right
  // after) lands nowhere in particular. Restores focus to whatever had it before the menu opened
  // (the card/chip that was right-clicked) on close - this component always unmounts rather than
  // toggling visibility (see how every caller renders it conditionally), so "on close" here means
  // "on unmount".
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('.context-menu-item')?.focus();
    return () => {
      const focusAppContent = () => document.querySelector<HTMLElement>('.app-content')?.focus();
      if (!previouslyFocused?.isConnected) {
        // Already gone by the time this runs - .focus() on a detached node is a silent no-op,
        // which would otherwise leave focus stranded on document.body. Fall back to the main
        // content region (a valid focus target via tabIndex={-1} in App.tsx, not part of the tab
        // order) so focus lands somewhere meaningful in whatever view replaced this one.
        focusAppContent();
        return;
      }
      previouslyFocused.focus();
      // previouslyFocused can still be connected right now and yet be removed later anyway: a menu
      // action like Edit calls an *async* handler (openEditForm awaits an IPC round trip before
      // ever calling setView) - so the view swap that unmounts the right-clicked card can land many
      // milliseconds after this cleanup already ran and focused it, not within this same tick. A
      // fixed delay (a microtask, a timeout) can't bridge a gap of unknown length, so instead of
      // guessing, react to the actual event: when the browser blurs previouslyFocused, check a tick
      // later whether anything else claimed focus. If focus reverted to document.body, it was
      // orphaned (the element was removed with nothing meaningful in its place) - fall back to
      // .app-content then. If something else has focus (e.g. the next view's own autofocus), leave
      // it alone - only document.body means nothing claimed it.
      previouslyFocused.addEventListener(
        'focusout',
        () => {
          queueMicrotask(() => {
            if (document.activeElement === document.body) focusAppContent();
          });
        },
        { once: true },
      );
    };
  }, []);

  useEffect(() => {
    // mousedown fires before click - without the containment check, clicking a menu item closed
    // (unmounted) the menu on mousedown before its own click event ever got a chance to fire the
    // item's onClick, making every item look like it did nothing.
    function handleOutsidePointer(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    // Deferred a tick: the same right-click that opens this menu is still bubbling ('contextmenu'
    // fires after 'mousedown'/'mouseup' for that click) when this effect first runs - registering
    // immediately would let it close itself before ever being seen.
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsidePointer);
      document.addEventListener('contextmenu', handleOutsidePointer);
      document.addEventListener('scroll', onClose, true);
    }, 0);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('contextmenu', handleOutsidePointer);
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
