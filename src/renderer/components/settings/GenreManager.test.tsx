// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenreManager } from './GenreManager';

// Unlike every other component test so far (which take callbacks as props), GenreManager fetches
// via `api.genres.*` directly - there's exactly one consumer, so an App-level hook + prop-threading
// isn't warranted (see the component's own doc comment). `api/client.ts` does
// `export const api = window.mediaJournalAPI` - a one-time snapshot at import time - so stubbing
// `window.mediaJournalAPI` in a beforeEach is too late (the module's already been imported and
// captured `undefined` by then). vi.mock the module directly instead; vi.hoisted is required since
// vi.mock's factory is hoisted above these imports, so it can't close over a plain outer `const`.
const { listMock, renameMock } = vi.hoisted(() => ({ listMock: vi.fn(), renameMock: vi.fn() }));

vi.mock('../../api/client', () => ({
  api: { genres: { list: listMock, rename: renameMock } },
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('GenreManager', () => {
  it('lists genres with their counts', async () => {
    listMock.mockResolvedValue([
      { name: 'Comedy', count: 2 },
      { name: 'Sci-Fi', count: 1 },
    ]);
    render(<GenreManager />);

    expect(await screen.findByText('Comedy')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no genres yet', async () => {
    listMock.mockResolvedValue([]);
    render(<GenreManager />);
    expect(await screen.findByText('No genres logged yet.')).toBeInTheDocument();
  });

  it('renames a genre, refetches, and shows the updated-count success message', async () => {
    const user = userEvent.setup();
    listMock
      .mockResolvedValueOnce([{ name: 'SciFi', count: 1 }])
      .mockResolvedValueOnce([{ name: 'Sci-Fi', count: 1 }]);
    renameMock.mockResolvedValue({ updated: 1 });
    render(<GenreManager />);

    await user.click(await screen.findByRole('button', { name: 'Rename' }));

    const dialogTitle = await screen.findByText('Rename genre "SciFi"');
    expect(dialogTitle).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveValue('SciFi'); // pre-filled with the current name

    await user.clear(input);
    await user.type(input, 'Sci-Fi');
    // Not screen.getByRole - the row's own "Rename" button is still in the DOM behind the dialog,
    // so an unscoped query would match both it and the dialog's submit button.
    const modal = document.querySelector('.modal') as HTMLElement;
    await user.click(within(modal).getByRole('button', { name: 'Rename' }));

    expect(renameMock).toHaveBeenCalledWith('SciFi', 'Sci-Fi');
    expect(await screen.findByText('Renamed "SciFi" to "Sci-Fi" - 1 entry updated.')).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2); // initial load + refetch after rename
  });

  it('shows the rejection inline and keeps the dialog open on failure', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([{ name: 'Comedy', count: 3 }]);
    renameMock.mockRejectedValue(new Error('Something went wrong'));
    render(<GenreManager />);

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const input = await screen.findByRole('textbox', { name: 'Name' });
    await user.clear(input);
    await user.type(input, 'Comedies');
    const modal = document.querySelector('.modal') as HTMLElement;
    await user.click(within(modal).getByRole('button', { name: 'Rename' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Rename genre "Comedy"')).toBeInTheDocument(); // dialog still open
  });
});
