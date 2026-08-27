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

  it('does not fire while a modal is open', () => {
    const onNewEntry = vi.fn();
    renderHook(() => useNewEntryShortcut(onNewEntry));
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);
    fireEvent.keyDown(document, { key: 'n' });
    expect(onNewEntry).not.toHaveBeenCalled();
    document.body.removeChild(backdrop);
  });

  it('fires again once the modal is gone', () => {
    const onNewEntry = vi.fn();
    renderHook(() => useNewEntryShortcut(onNewEntry));
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);
    fireEvent.keyDown(document, { key: 'n' });
    document.body.removeChild(backdrop);
    fireEvent.keyDown(document, { key: 'n' });
    expect(onNewEntry).toHaveBeenCalledTimes(1);
  });

  it('always calls the latest callback without re-adding the document listener', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useNewEntryShortcut(cb), { initialProps: { cb: first } });
    const keydownRegistrations = addSpy.mock.calls.filter((call) => call[0] === 'keydown').length;

    rerender({ cb: second });
    expect(addSpy.mock.calls.filter((call) => call[0] === 'keydown').length).toBe(keydownRegistrations);

    fireEvent.keyDown(document, { key: 'n' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    addSpy.mockRestore();
  });
});
