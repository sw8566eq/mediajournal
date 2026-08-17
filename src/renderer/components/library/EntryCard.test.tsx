// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryCard } from './EntryCard';

afterEach(() => {
  cleanup();
});

const entry = { id: 1, title: 'Dune', year: 2021, ratingTenths: 85, status: null, genre: 'Sci-Fi', tags: [] };

describe('EntryCard', () => {
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<EntryCard mediaType="movie" entry={entry} onClick={onClick} selected={false} onToggleSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter and Space when the card itself is focused', () => {
    const onClick = vi.fn();
    render(<EntryCard mediaType="movie" entry={entry} onClick={onClick} selected={false} onToggleSelect={vi.fn()} />);
    const card = screen.getByRole('button');

    fireEvent.keyDown(card, { key: 'Enter', target: card });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ', target: card });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does not call onClick for other keys', () => {
    const onClick = vi.fn();
    render(<EntryCard mediaType="movie" entry={entry} onClick={onClick} selected={false} onToggleSelect={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });

  // Regression/forward-compat guard: a keydown that bubbles up from a focusable child (the
  // select checkbox) must not also trigger the card's own "open entry" behavior.
  it('does not call onClick when the keydown target is a child, not the card itself', () => {
    const onClick = vi.fn();
    render(<EntryCard mediaType="movie" entry={entry} onClick={onClick} selected={false} onToggleSelect={vi.fn()} />);
    const title = screen.getByText('Dune');
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('reflects the selected prop on the checkbox and applies a "selected" class', () => {
    const { rerender } = render(
      <EntryCard mediaType="movie" entry={entry} onClick={vi.fn()} selected={false} onToggleSelect={vi.fn()} />,
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button')).not.toHaveClass('selected');

    rerender(<EntryCard mediaType="movie" entry={entry} onClick={vi.fn()} selected onToggleSelect={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button')).toHaveClass('selected');
  });

  it('clicking the checkbox toggles selection exactly once and does not open the entry', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onToggleSelect = vi.fn();
    render(<EntryCard mediaType="movie" entry={entry} onClick={onClick} selected={false} onToggleSelect={onToggleSelect} />);

    await user.click(screen.getByRole('checkbox'));
    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
