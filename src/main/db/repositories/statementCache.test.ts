import { describe, it, expect } from 'vitest';
import { createKeyedSlot } from './statementCache';

describe('createKeyedSlot', () => {
  it('returns an empty object for the first key seen', () => {
    const slot = createKeyedSlot<object, { a?: number }>();
    const key = {};
    expect(slot.forKey(key)).toEqual({});
  });

  it('returns the exact same object across repeated calls with the same key', () => {
    const slot = createKeyedSlot<object, { a?: number }>();
    const key = {};
    const first = slot.forKey(key);
    first.a = 42; // mutate, as a real caller would (e.g. `s.tagsFor ??= db.prepare(...)`)
    const second = slot.forKey(key);
    expect(second).toBe(first);
    expect(second.a).toBe(42);
  });

  it('mutations persist across calls as long as the key does not change', () => {
    const slot = createKeyedSlot<object, { a?: number; b?: string }>();
    const key = {};
    slot.forKey(key).a = 1;
    slot.forKey(key).b = 'x';
    expect(slot.forKey(key)).toEqual({ a: 1, b: 'x' });
  });

  it('returns a fresh, empty object when the key changes', () => {
    const slot = createKeyedSlot<object, { a?: number }>();
    const keyA = {};
    const keyB = {};
    const forA = slot.forKey(keyA);
    forA.a = 99;
    const forB = slot.forKey(keyB);
    expect(forB).not.toBe(forA);
    expect(forB).toEqual({});
  });

  it('discards the old key\'s cache after switching, even if the old key is asked about again', () => {
    // Mirrors the connection-swap scenario this exists for: once the DB reconnects, nothing should
    // ever ask about the old connection again in practice, but even if it did, a "switch back"
    // starts fresh too - this cache holds exactly one live entry, not a history of every key seen.
    const slot = createKeyedSlot<object, { a?: number }>();
    const keyA = {};
    const keyB = {};
    slot.forKey(keyA).a = 1;
    slot.forKey(keyB).a = 2;
    const forAAgain = slot.forKey(keyA);
    expect(forAAgain).toEqual({});
    expect(forAAgain.a).toBeUndefined();
  });

  it('uses reference equality, not deep/structural equality, to compare keys', () => {
    const slot = createKeyedSlot<{ id: number }, { a?: number }>();
    const keyA = { id: 1 };
    const keyALookalike = { id: 1 }; // structurally identical, but a different object
    const forA = slot.forKey(keyA);
    forA.a = 7;
    const forLookalike = slot.forKey(keyALookalike);
    expect(forLookalike).not.toBe(forA);
    expect(forLookalike).toEqual({});
  });

  it('keeps independent slots fully isolated from one another', () => {
    const slotOne = createKeyedSlot<object, { a?: number }>();
    const slotTwo = createKeyedSlot<object, { a?: number }>();
    const key = {};
    slotOne.forKey(key).a = 1;
    slotTwo.forKey(key).a = 2;
    expect(slotOne.forKey(key).a).toBe(1);
    expect(slotTwo.forKey(key).a).toBe(2);
  });
});
