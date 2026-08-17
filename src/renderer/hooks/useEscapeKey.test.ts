// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, fireEvent, cleanup } from '@testing-library/react';
import { useEscapeKey } from './useEscapeKey';

afterEach(() => cleanup());

describe('useEscapeKey', () => {
  it('calls onEscape when Escape is pressed while active', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not attach a listener, and does not call onEscape, while inactive', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(false, onEscape));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('ignores keys other than Escape', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('removes its listener when active flips to false', () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(({ active }) => useEscapeKey(active, onEscape), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});
