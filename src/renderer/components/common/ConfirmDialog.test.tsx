// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(() => {
  cleanup();
});

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} message="Delete this entry?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the message when open', () => {
    render(<ConfirmDialog open message="Delete this entry?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Delete this entry?')).toBeInTheDocument();
  });

  it('calls onConfirm when clicking Delete, and onCancel when clicking Cancel', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open message="Delete this entry?" onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking the backdrop, but not when clicking inside the modal', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog open message="Delete this entry?" onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByText('Delete this entry?')); // inside the modal
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(document.querySelector('.modal-backdrop') as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // Regression coverage: unlike ContextMenu/TextPromptDialog, ConfirmDialog didn't close on
  // Escape at all until this fix.
  it('calls onCancel on Escape while open', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open message="Delete this entry?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not attach an Escape listener while closed', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open={false} message="Delete this entry?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
