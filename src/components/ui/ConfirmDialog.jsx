import Modal from './Modal';

/**
 * A small "are you sure" window. Render it conditionally, on top of the window that asked.
 * The caller owns the action: onConfirm runs it, pending disables the buttons, error shows a failure
 * so the dialog stays open and the person can retry or cancel.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  pendingLabel = 'Working...',
  pending = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={pending ? () => {} : onCancel} maxWidth="max-w-sm">
      <p className="text-sm text-gray-700">{message}</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
