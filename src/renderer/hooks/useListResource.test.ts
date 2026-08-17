// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { useListResource } from './useListResource';

afterEach(() => cleanup());

describe('useListResource', () => {
  it('fetches on mount and reports the result with loading settled', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a', 'b']);
    const { result } = renderHook(() => useListResource(fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual(['a', 'b']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when refetch is called', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(['a']).mockResolvedValueOnce(['a', 'b']);
    const { result } = renderHook(() => useListResource(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.items).toEqual(['a', 'b']);
  });

  it('keeps refetch referentially stable across re-renders when fetcher is stable', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { result, rerender } = renderHook(() => useListResource(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const firstRefetch = result.current.refetch;
    rerender();
    expect(result.current.refetch).toBe(firstRefetch);
  });
});
