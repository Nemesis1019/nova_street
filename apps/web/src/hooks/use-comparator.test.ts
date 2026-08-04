import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useComparator } from './use-comparator';

describe('useComparator', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds items up to the limit', async () => {
    const { result } = renderHook(() => useComparator());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.add('a');
      result.current.add('b');
      result.current.add('c');
      result.current.add('d');
      result.current.add('e');
    });

    expect(result.current.items).toEqual(['a', 'b', 'c', 'd']);
  });

  it('removes items', async () => {
    const { result } = renderHook(() => useComparator());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.add('a');
      result.current.add('b');
    });
    act(() => result.current.remove('a'));

    expect(result.current.items).toEqual(['b']);
    expect(result.current.isSelected('a')).toBe(false);
    expect(result.current.isSelected('b')).toBe(true);
  });

  it('toggles items', async () => {
    const { result } = renderHook(() => useComparator());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.toggle('a'));
    expect(result.current.isSelected('a')).toBe(true);

    act(() => result.current.toggle('a'));
    expect(result.current.isSelected('a')).toBe(false);
  });

  it('clears all items', async () => {
    const { result } = renderHook(() => useComparator());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.add('a'));
    act(() => result.current.clear());

    expect(result.current.items).toEqual([]);
  });

  it('hydrates from localStorage', async () => {
    localStorage.setItem('nova-comparator', JSON.stringify(['x', 'y']));

    const { result } = renderHook(() => useComparator());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(result.current.items).toEqual(['x', 'y']);
  });
});
