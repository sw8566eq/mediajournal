// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextPromptDialog } from './TextPromptDialog';

// @testing-library/react's auto-cleanup registers itself onto a *global* afterEach, which only
// exists if vitest's `globals: true` is set - this project deliberately keeps that off (explicit
// imports everywhere, see queryBuilder.test.ts etc.), so it has to be wired up explicitly here
// instead, or each test's render() output piles up in the same jsdom document as the next.
afterEach(() => {
  cleanup();
});

describe('TextPromptDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <TextPromptDialog open={false} title="Rename tag" onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the title and pre-fills the initial value when open', () => {
    render(<TextPromptDialog open title={'Rename tag "Sci-Fi"'} initialValue="Sci-Fi" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Rename tag "Sci-Fi"')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Sci-Fi');
  });

  it('defaults to an empty field when no initialValue is given', () => {
    render(<TextPromptDialog open title="Save preset" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  // Regression test: SavePresetDialog (before this component existed) only reset its input inside
  // submit() - fine there since it always opened blank, but a dialog reused across *different*
  // tags, each with a different initialValue, would keep showing whatever was last typed instead
  // of the newly-selected tag's actual name unless it explicitly re-seeds on every open.
  it('re-seeds the field when reopened with a different initialValue', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TextPromptDialog open title="Rename tag" initialValue="Foo" onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Foo');

    // User edits the field but never submits.
    await user.clear(input);
    await user.type(input, 'Something else entirely');
    expect(screen.getByRole('textbox')).toHaveValue('Something else entirely');

    // Dialog closes (e.g. Cancel), then reopens for a *different* tag.
    rerender(<TextPromptDialog open={false} title="Rename tag" initialValue="Foo" onSave={vi.fn()} onCancel={vi.fn()} />);
    rerender(<TextPromptDialog open title="Rename tag" initialValue="Bar" onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('Bar');
  });

  it('does not re-seed while it stays open with the same initialValue (mid-typing is preserved)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TextPromptDialog open title="Rename tag" initialValue="Foo" onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'X');
    expect(input).toHaveValue('FooX');

    // A re-render with the same open/initialValue (e.g. a sibling state update elsewhere) must not
    // stomp what the user is actively typing.
    rerender(<TextPromptDialog open title="Rename tag" initialValue="Foo" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('FooX');
  });

  it('disables Save until the field has non-whitespace content', async () => {
    const user = userEvent.setup();
    render(<TextPromptDialog open title="Save preset" onSave={vi.fn()} onCancel={vi.fn()} />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    await user.type(screen.getByRole('textbox'), '   ');
    expect(save).toBeDisabled();

    await user.type(screen.getByRole('textbox'), 'x');
    expect(save).toBeEnabled();
  });

  it('calls onSave with the trimmed value on Save click', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<TextPromptDialog open title="Save preset" onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), '  My Preset  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('My Preset');
  });

  it('calls onSave on Enter, and onCancel on Escape', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<TextPromptDialog open title="Save preset" initialValue="Existing" onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('Existing');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave on Enter when the field is empty', () => {
    const onSave = vi.fn();
    render(<TextPromptDialog open title="Save preset" onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onCancel when clicking the backdrop, but not when clicking inside the modal', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TextPromptDialog open title="Save preset" onSave={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByText('Save preset')); // inside the modal
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error when provided, and shows none when omitted', () => {
    const { rerender } = render(
      <TextPromptDialog open title="Rename tag" error="UNIQUE constraint failed: tags.name" onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('UNIQUE constraint failed: tags.name')).toBeInTheDocument();

    rerender(<TextPromptDialog open title="Rename tag" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('UNIQUE constraint failed: tags.name')).not.toBeInTheDocument();
  });

  it('uses a custom submitLabel when given, defaulting to "Save"', () => {
    const { rerender } = render(<TextPromptDialog open title="x" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    rerender(<TextPromptDialog open title="x" submitLabel="Rename" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });
});
