// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, fireEvent, cleanup } from '@testing-library/react';
import { useNewEntryShortcut } from './useNewEntryShortcut';

afterEach(() => cleanup());

describe('useNewEntryShortcut', () => {
  it('calls onNewEntry when "n" is pressed', () => {
    const onNewEntry = vi.fn();
    renderHook(() => useNewEntryShortcut(onNewEntry));
    fireEvent.keyDown(document, { key: 'n' });
    expect(onNewEntry).toHaveBeenCalledTimes(1);
  });

  it('ignores keys other than "n"', () => {
    const onNewEntry = vi.fn();
    renderHook(() => useNewEntryShortcut(onNewEntry));
    fireEvent.keyDown(document, { key: 'N' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onNewEntry).not.toHaveBeenCalled();
  });

  it('does not fire while typing into an input', () => {
    const onNewEntry = vi.fn();
    renderHook(() => useNewEntryShortcut(onNewEntry));
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'n' });
    expect(onNewEntry).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
