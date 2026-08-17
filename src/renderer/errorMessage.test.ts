import { describe, it, expect } from 'vitest';
import { toErrorMessage } from './errorMessage';

describe('toErrorMessage', () => {
  it('returns the message of a real Error instance', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies a non-Error thrown value', () => {
    expect(toErrorMessage('plain string error')).toBe('plain string error');
    expect(toErrorMessage(42)).toBe('42');
  });

  it('stringifies null/undefined rather than throwing', () => {
    expect(toErrorMessage(null)).toBe('null');
    expect(toErrorMessage(undefined)).toBe('undefined');
  });
});
