import ConfirmDialog from "../ui/ConfirmDialog";

export default function CancelModal({
  onConfirm,
  onDismiss,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <ConfirmDialog
      title="Cancel session?"
      description="Elapsed time will be saved as a canceled session."
      confirmLabel="Yes, Cancel"
      cancelLabel="Go Back"
      destructive
      onConfirm={onConfirm}
      onCancel={onDismiss}
    />
  );
}
