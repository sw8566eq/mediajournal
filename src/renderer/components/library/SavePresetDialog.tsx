import { TextPromptDialog } from '../common/TextPromptDialog';

interface Props {
  open: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}

/** Thin wrapper around the generic TextPromptDialog - kept as its own named component so callers
 *  (LibraryView/AllLibraryView) don't need to know or care that it's backed by a shared dialog. */
export function SavePresetDialog({ open, onSave, onCancel }: Props) {
  return <TextPromptDialog open={open} title="Save current filters as a preset" onSave={onSave} onCancel={onCancel} />;
}
