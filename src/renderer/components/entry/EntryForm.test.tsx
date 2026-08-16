// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryForm } from './EntryForm';

afterEach(() => {
  cleanup();
});

// Neither CoverArtField nor ExternalSearchPanel touch the api client during render - only inside
// their own click handlers (pick/fetch cover, run a search) - so EntryForm can mount here without
// needing to mock `window.mediaJournalAPI` (unset under jsdom), as long as the tests below never
// trigger those specific buttons.
async function renderOpenForm() {
  const user = userEvent.setup();
  render(<EntryForm mediaType="movie" allTags={[]} onCreateTag={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} />);
  // Status/Start Date/Finish Date live in the collapsible "More fields" section, closed by default.
  await user.click(screen.getByText('More fields'));
  return user;
}

function dateFields() {
  return {
    start: screen.queryByLabelText('Start Date'),
    finish: screen.queryByLabelText('Finish Date'),
  };
}

describe('EntryForm - status-dependent Start/Finish Date visibility', () => {
  it('shows both Start Date and Finish Date when no status is set (finished)', async () => {
    await renderOpenForm();
    const { start, finish } = dateFields();
    expect(start).toBeInTheDocument();
    expect(finish).toBeInTheDocument();
  });

  it('hides only Finish Date when status is In Progress', async () => {
    const user = await renderOpenForm();
    await user.selectOptions(screen.getByRole('combobox'), 'In Progress');

    const { start, finish } = dateFields();
    expect(start).toBeInTheDocument();
    expect(finish).not.toBeInTheDocument();
  });

  it('hides both Start Date and Finish Date when status is Planned', async () => {
    const user = await renderOpenForm();
    await user.selectOptions(screen.getByRole('combobox'), 'Planned');

    const { start, finish } = dateFields();
    expect(start).not.toBeInTheDocument();
    expect(finish).not.toBeInTheDocument();
  });

  it('clears both dates when switching to Planned, so they come back empty if status is cleared again', async () => {
    const user = await renderOpenForm();

    await user.type(screen.getByLabelText('Start Date'), '2020-01-01');
    await user.type(screen.getByLabelText('Finish Date'), '2020-06-15');
    expect(screen.getByLabelText('Start Date')).toHaveValue('2020-01-01');
    expect(screen.getByLabelText('Finish Date')).toHaveValue('2020-06-15');

    await user.selectOptions(screen.getByRole('combobox'), 'Planned');
    expect(dateFields()).toEqual({ start: null, finish: null }); // both hidden while planned

    await user.selectOptions(screen.getByRole('combobox'), '—'); // back to no active status
    expect(screen.getByLabelText('Start Date')).toHaveValue(''); // not the stale 2020-01-01
    expect(screen.getByLabelText('Finish Date')).toHaveValue(''); // not the stale 2020-06-15
  });

  it('clears only Finish Date when switching to In Progress, preserving Start Date', async () => {
    const user = await renderOpenForm();

    await user.type(screen.getByLabelText('Start Date'), '2020-01-01');
    await user.type(screen.getByLabelText('Finish Date'), '2020-06-15');

    await user.selectOptions(screen.getByRole('combobox'), 'In Progress');
    expect(screen.getByLabelText('Start Date')).toHaveValue('2020-01-01'); // preserved, still visible

    await user.selectOptions(screen.getByRole('combobox'), '—');
    expect(screen.getByLabelText('Start Date')).toHaveValue('2020-01-01'); // untouched throughout
    expect(screen.getByLabelText('Finish Date')).toHaveValue(''); // cleared when it was hidden
  });
});
