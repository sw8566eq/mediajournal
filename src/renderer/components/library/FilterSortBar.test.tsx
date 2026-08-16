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
});

const TAGS: Tag[] = [
  { id: 1, name: 'Sci-Fi' },
  { id: 2, name: 'Horror' },
];

function renderBar(overrides: { filters?: EntryFilters; onChange?: (f: EntryFilters) => void; availableTags?: Tag[] } = {}) {
  const onChange = overrides.onChange ?? vi.fn();
  const onDeleteTag = vi.fn();
  const onRenameTag = vi.fn().mockResolvedValue(undefined);
  render(
    <FilterSortBar
      filters={overrides.filters ?? {}}
      onChange={onChange}
      availableGenres={[]}
      availableTags={overrides.availableTags ?? TAGS}
      onDeleteTag={onDeleteTag}
      onRenameTag={onRenameTag}
    />,
  );
  return { onChange, onDeleteTag, onRenameTag };
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

describe('FilterSortBar - date range', () => {
  it('sets dateFrom/dateTo when picked, labeled Start Date / Finish Date (not a generic range)', () => {
    const onChange = vi.fn();
    renderBar({ onChange });

    // fireEvent.change, not userEvent.type: native date inputs don't support character-by-character
    // typing, and a plain manual `.value =` + dispatchEvent bypasses the native setter React
    // patches to detect controlled-input changes, so it wouldn't reliably reach onChange either.
    const startInput = screen.getByLabelText('Start Date');
    const finishInput = screen.getByLabelText('Finish Date');

    fireEvent.change(startInput, { target: { value: '2020-01-01' } });
    expect(onChange).toHaveBeenLastCalledWith({ dateFrom: '2020-01-01' });

    fireEvent.change(finishInput, { target: { value: '2020-12-31' } });
    expect(onChange).toHaveBeenLastCalledWith({ dateTo: '2020-12-31' });
  });

  it('reflects existing dateFrom/dateTo in the inputs', () => {
    renderBar({ filters: { dateFrom: '2020-01-01', dateTo: '2020-12-31' } });
    expect(screen.getByLabelText('Start Date')).toHaveValue('2020-01-01');
    expect(screen.getByLabelText('Finish Date')).toHaveValue('2020-12-31');
  });
});

describe('FilterSortBar - tag rename', () => {
  it('right-click a tag -> Rename Tag -> submit calls onRenameTag with the new name', async () => {
    const user = userEvent.setup();
    const { onRenameTag } = renderBar();

    const chip = screen.getByRole('button', { name: 'Sci-Fi' });
    // ContextMenu listens on the native 'contextmenu' event - fireEvent maps directly to it,
    // whereas userEvent has no dedicated "right click" helper in this version.
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
