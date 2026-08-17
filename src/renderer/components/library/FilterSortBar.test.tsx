// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EntryFilters, Tag } from '@shared/types';
import { FilterSortBar } from './FilterSortBar';

afterEach(() => {
  cleanup();
  // Safety net alongside each debounce test's own vi.useRealTimers(): if one of them threw or
  // timed out before reaching that call, fake timers would otherwise leak into every later test in
  // this file (userEvent.type() and fake timers don't mix well - see the debounce tests' own
  // comment - so isolating this matters).
  vi.useRealTimers();
});

const TAGS: Tag[] = [
  { id: 1, name: 'Sci-Fi' },
  { id: 2, name: 'Horror' },
];

function renderBar(overrides: { filters?: EntryFilters; onChange?: (f: EntryFilters) => void; availableTags?: Tag[] } = {}) {
  const onChange = overrides.onChange ?? vi.fn();
  const onDeleteTag = vi.fn();
  const onRenameTag = vi.fn().mockResolvedValue(undefined);
  const { unmount } = render(
    <FilterSortBar
      filters={overrides.filters ?? {}}
      onChange={onChange}
      availableGenres={[]}
      availableTags={overrides.availableTags ?? TAGS}
      onDeleteTag={onDeleteTag}
      onRenameTag={onRenameTag}
    />,
  );
  return { onChange, onDeleteTag, onRenameTag, unmount };
}

/** Mimics how LibraryView/AllLibraryView actually use FilterSortBar (their own `useState` feeding
 *  filters/onChange back in) - needed for any test that types multiple characters into a
 *  *controlled* input: with a static, non-updating `filters` prop (as `renderBar` above uses),
 *  React resets the DOM value back to the stale prop after every keystroke, so each character
 *  would appear to type into an empty field instead of accumulating - not a bug in the component,
 *  just a mismatch between a "dumb mock" harness and how a real controlled input actually behaves. */
function StatefulFilterBar({ initialFilters = {} }: { initialFilters?: EntryFilters }) {
  const [filters, setFilters] = useState<EntryFilters>(initialFilters);
  return (
    <FilterSortBar
      filters={filters}
      onChange={setFilters}
      availableGenres={[]}
      availableTags={TAGS}
      onDeleteTag={vi.fn()}
      onRenameTag={vi.fn().mockResolvedValue(undefined)}
    />
  );
}

describe('FilterSortBar - search debounce', () => {
  // fireEvent (not userEvent) throughout this block: userEvent.type()'s internal per-character
  // delays don't play well with vi.useFakeTimers() in this project's dependency versions (an
  // earlier version of these tests using userEvent hung indefinitely). fireEvent.change fires one
  // synchronous DOM event with a given final value, which is all a debounce test actually needs -
  // "type X" is simulated as however many fireEvent.change calls the test wants, with
  // vi.advanceTimersByTime between them standing in for the elapsed real time.
  it('does not call onChange immediately after a change', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderBar({ onChange });

    fireEvent.change(screen.getByPlaceholderText('Search title & notes…'), { target: { value: 'dune' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange with the typed text after the debounce window elapses', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderBar({ onChange });

    fireEvent.change(screen.getByPlaceholderText('Search title & notes…'), { target: { value: 'dune' } });
    vi.advanceTimersByTime(250);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ search: 'dune' });
  });

  it('resets the debounce timer on each change rather than firing once per keystroke', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderBar({ onChange });

    const input = screen.getByPlaceholderText('Search title & notes…');
    fireEvent.change(input, { target: { value: 'du' } });
    vi.advanceTimersByTime(150); // less than the debounce window
    fireEvent.change(input, { target: { value: 'dune' } });
    vi.advanceTimersByTime(150); // still less than 250ms since the last change
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100); // now 250ms since the last change
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ search: 'dune' });
  });

  it('clears search back to undefined (not an empty string) once debounced', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderBar({ filters: { search: 'dune' }, onChange });

    fireEvent.change(screen.getByPlaceholderText('Search title & notes…'), { target: { value: '' } });
    vi.advanceTimersByTime(250);

    expect(onChange).toHaveBeenLastCalledWith({ search: undefined });
  });

  it('reflects an externally-set filters.search (e.g. a loaded preset) in the input', () => {
    renderBar({ filters: { search: 'preloaded' } });
    expect(screen.getByPlaceholderText('Search title & notes…')).toHaveValue('preloaded');
  });

  // Regression check: the debounce is specific to the search box. A change here to the shared
  // `filters`/`onChange` wiring shouldn't accidentally delay every other control too - status,
  // genre, tags, rating/year range, and sort all commit on their own discrete action (click/select),
  // not per-keystroke, so there was never a reason for them to debounce.
  it('does not delay a non-search filter change (status chip) behind the search debounce', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderBar({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'Planned' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ status: ['planned'] });
  });

  it('cancels the pending debounced push if the component unmounts before it fires', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { unmount } = renderBar({ onChange });

    fireEvent.change(screen.getByPlaceholderText('Search title & notes…'), { target: { value: 'dune' } });
    unmount();
    vi.advanceTimersByTime(250);

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('FilterSortBar - year range', () => {
  it('accumulates typed digits into yearMin/yearMax, reflected back in the inputs', async () => {
    const user = userEvent.setup();
    render(<StatefulFilterBar />);

    await user.type(screen.getByPlaceholderText('Year min'), '1990');
    expect(screen.getByPlaceholderText('Year min')).toHaveValue(1990);

    await user.type(screen.getByPlaceholderText('Year max'), '2020');
    expect(screen.getByPlaceholderText('Year max')).toHaveValue(2020);
  });

  it('clears yearMin back to undefined (not 0 or NaN) when the field is emptied', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderBar({ filters: { yearMin: 1990 }, onChange });

    await user.clear(screen.getByPlaceholderText('Year min'));
    expect(onChange).toHaveBeenLastCalledWith({ yearMin: undefined });
  });

  it('reflects an existing yearMin/yearMax in the inputs', () => {
    renderBar({ filters: { yearMin: 1990, yearMax: 2020 } });
    expect(screen.getByPlaceholderText('Year min')).toHaveValue(1990);
    expect(screen.getByPlaceholderText('Year max')).toHaveValue(2020);
  });
});

describe('FilterSortBar - tag rename', () => {
  it('right-click a tag -> Rename Tag -> submit calls onRenameTag with the new name', async () => {
    const user = userEvent.setup();
    const { onRenameTag } = renderBar();

    const chip = screen.getByRole('button', { name: 'Sci-Fi' });
    // ContextMenu listens on the native 'contextmenu' event, and userEvent has no dedicated
    // "right click" helper in this version, so dispatch it directly.
    chip.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));

    await user.click(await screen.findByText('Rename Tag'));

    const dialog = await screen.findByText('Rename tag "Sci-Fi"');
    expect(dialog).toBeInTheDocument();
    // Not a bare getByRole('textbox') - the filter bar's own search box is also a textbox once the
    // dialog is open, so it'd match both. The dialog's input has an accessible name ("Name") via
    // its wrapping <label>; the search box's only comes from its placeholder text.
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveValue('Sci-Fi'); // pre-filled with the current name

    await user.clear(input);
    await user.type(input, 'Science Fiction');
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(onRenameTag).toHaveBeenCalledWith(1, 'Science Fiction');
  });

  it('shows the rejection inline and keeps the dialog open on a name collision', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onDeleteTag = vi.fn();
    const onRenameTag = vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed: tags.name'));
    render(
      <FilterSortBar
        filters={{}}
        onChange={onChange}
        availableGenres={[]}
        availableTags={TAGS}
        onDeleteTag={onDeleteTag}
        onRenameTag={onRenameTag}
      />,
    );

    const chip = screen.getByRole('button', { name: 'Sci-Fi' });
    chip.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    await user.click(await screen.findByText('Rename Tag'));

    const input = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(input);
    await user.type(input, 'Horror'); // collides with the other existing tag
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(await screen.findByText('UNIQUE constraint failed: tags.name')).toBeInTheDocument();
    // Dialog stays open - the rename did NOT silently appear to succeed.
    expect(screen.getByText('Rename tag "Sci-Fi"')).toBeInTheDocument();
  });

  it('right-click a tag -> Delete Tag still works alongside the new Rename item', async () => {
    const user = userEvent.setup();
    const { onDeleteTag } = renderBar();

    const chip = screen.getByRole('button', { name: 'Horror' });
    chip.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    await user.click(await screen.findByText('Delete Tag'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDeleteTag).toHaveBeenCalledWith(2);
  });
});
