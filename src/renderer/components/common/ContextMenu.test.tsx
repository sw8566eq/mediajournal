// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';

afterEach(() => cleanup());

describe('ContextMenu', () => {
  it('restores focus to the previously-focused element on unmount', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <ContextMenu x={0} y={0} items={[{ label: 'Edit', onClick: () => {} }]} onClose={() => {}} />,
    );
    unmount();

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it('falls back to focusing .app-content when the originally-focused element is gone', () => {
    const appContent = document.createElement('main');
    appContent.className = 'app-content';
    appContent.tabIndex = -1;
    document.body.appendChild(appContent);

    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <ContextMenu x={0} y={0} items={[{ label: 'Edit', onClick: () => {} }]} onClose={() => {}} />,
    );
    // Simulate a menu action (e.g. Edit) navigating away and unmounting the right-clicked element
    // before the menu itself unmounts - .focus() on a now-detached node is a silent no-op.
    document.body.removeChild(trigger);
    unmount();

    expect(document.activeElement).toBe(appContent);
    document.body.removeChild(appContent);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={[{ label: 'Edit', onClick: () => {} }]} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
