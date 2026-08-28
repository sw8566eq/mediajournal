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

  it('falls back to focusing .app-content when the originally-focused element is already gone by unmount', () => {
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

  it('falls back to .app-content when the previously-focused element is removed well after unmount - the real Edit-from-menu race', async () => {
    // Reproduces the actual bug: a menu action like Edit calls an *async* handler (App.tsx's
    // openEditForm awaits an IPC round trip before ever calling setView), so the view swap that
    // unmounts the right-clicked card can land many milliseconds after this component's own cleanup
    // already ran and successfully refocused it - nowhere close to "the same tick", so a fixed
    // microtask/timeout delay can't bridge it. Simulated here as an arbitrarily-later removal, well
    // after unmount() has already returned and successfully restored focus to `trigger`.
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
    unmount();
    expect(document.activeElement).toBe(trigger); // focus restored synchronously, same as the simple case

    // ...an arbitrary amount of "later" (a real async IPC round trip in the app) before the actual
    // navigation's unmount removes it - a setTimeout, not just a microtask, to prove this isn't
    // riding some same-tick ordering quirk.
    await new Promise((resolve) => setTimeout(resolve, 20));
    document.body.removeChild(trigger);
    // jsdom (unlike real Chromium, confirmed live against the built Electron app) doesn't dispatch
    // a 'focusout' event when a focused element is removed from the DOM - it silently updates
    // document.activeElement to <body> with no event, so the fix's listener has nothing to react to
    // here. Dispatch the event jsdom omits, standing in for what a real browser fires on its own.
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await Promise.resolve(); // let the focusout listener's queued microtask run

    expect(document.activeElement).toBe(appContent);
    document.body.removeChild(appContent);
  });

  it('leaves focus alone if something else claims it after the previously-focused element is removed', async () => {
    // The fallback should only kick in when focus is truly orphaned (reverted to document.body with
    // nothing claiming it) - not fight a deliberate focus move elsewhere, e.g. the next view
    // autofocusing one of its own fields.
    const appContent = document.createElement('main');
    appContent.className = 'app-content';
    appContent.tabIndex = -1;
    document.body.appendChild(appContent);

    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const somethingElse = document.createElement('input');
    document.body.appendChild(somethingElse);

    const { unmount } = render(
      <ContextMenu x={0} y={0} items={[{ label: 'Edit', onClick: () => {} }]} onClose={() => {}} />,
    );
    unmount();
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
    // jsdom doesn't dispatch 'focusout' on removal the way real Chromium does (see the previous
    // test) - dispatch it manually so the fix's listener actually runs, same as it would for real.
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    somethingElse.focus(); // the next view's own autofocus, claiming focus right as trigger is removed
    await Promise.resolve(); // let the focusout listener's queued microtask run and find somethingElse already focused

    expect(document.activeElement).toBe(somethingElse);
    document.body.removeChild(appContent);
    document.body.removeChild(somethingElse);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={[{ label: 'Edit', onClick: () => {} }]} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
