import { describe, it, expect } from 'vitest';
import { isTypingTarget } from './isTypingTarget';

// Plain node environment (no jsdom docblock) - isTypingTarget duck-types on tagName/
// isContentEditable rather than `instanceof HTMLElement` specifically so it's testable with plain
// object literals here, with no DOM environment needed at all.
describe('isTypingTarget', () => {
  it('returns false for null', () => {
    expect(isTypingTarget(null)).toBe(false);
  });

  it('returns false for a non-object target', () => {
    expect(isTypingTarget('not an element' as unknown as EventTarget)).toBe(false);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('returns true for a %s tagName', (tagName) => {
    expect(isTypingTarget({ tagName } as unknown as EventTarget)).toBe(true);
  });

  it('returns false for a plain div', () => {
    expect(isTypingTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(false);
  });

  it('returns true for a contentEditable element regardless of tagName', () => {
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true);
  });
});
