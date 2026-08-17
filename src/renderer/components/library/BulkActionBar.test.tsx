// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionBar } from './BulkActionBar';

afterEach(() => {
  cleanup();
});

describe('BulkActionBar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <BulkActionBar count={0} onClear={vi.fn()} onDelete={vi.fn()} onAddTagClick={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selected count when count > 0', () => {
    render(<BulkActionBar count={3} onClear={vi.fn()} onDelete={vi.fn()} onAddTagClick={vi.fn()} />);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('calls onClear and onAddTagClick directly, with no confirmation', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onAddTagClick = vi.fn();
    render(<BulkActionBar count={2} onClear={onClear} onDelete={vi.fn()} onAddTagClick={onAddTagClick} />);

    await user.click(screen.getByRole('button', { name: 'Add Tag…' }));
    expect(onAddTagClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('requires confirming Delete before calling onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<BulkActionBar count={2} onClear={vi.fn()} onDelete={onDelete} onAddTagClick={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete 2 selected entries? This cannot be undone.')).toBeInTheDocument();

    const modal = document.querySelector('.modal') as HTMLElement;
    await user.click(within(modal).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('uses singular "entry" phrasing for a single selected item', async () => {
    const user = userEvent.setup();
    render(<BulkActionBar count={1} onClear={vi.fn()} onDelete={vi.fn()} onAddTagClick={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete 1 selected entry? This cannot be undone.')).toBeInTheDocument();
  });

  it('cancelling the confirm dialog does not call onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<BulkActionBar count={2} onClear={vi.fn()} onDelete={onDelete} onAddTagClick={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/This cannot be undone/)).not.toBeInTheDocument();
  });
});
