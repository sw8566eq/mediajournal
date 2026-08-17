/**
 * Whether an event's target is something the user is actively typing into - used to gate global
 * single-key shortcuts (like `/` for search) so they don't hijack a literal `/` typed into a
 * field. Split out as a pure predicate (no DOM listener wiring) so it's unit-testable under the
 * suite's default `node` environment, matching the existing ratingInputParsing.ts/queryBuilder.ts
 * precedent. Deliberately duck-types (`tagName`/`isContentEditable`) rather than
 * `target instanceof HTMLElement` - `HTMLElement` isn't a global in a plain node test
 * environment, and duck-typing works identically against a real DOM element in the browser.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object') return false;
  const el = target as { tagName?: unknown; isContentEditable?: unknown };
  if (el.isContentEditable) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}
