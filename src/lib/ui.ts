import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import type { ReactNode } from 'react';

import type { UserBase } from '../api/types';

/** Extract a human-readable message from any thrown value. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Show a red error toast from any thrown value. */
export function notifyError(title: string, err: unknown) {
  notifications.show({ color: 'red', title, message: errorMessage(err) });
}

/** Show a green success toast. */
export function notifySuccess(title: string, message?: string) {
  notifications.show({ color: 'green', title, message: message ?? '' });
}

/** Open a red confirm modal for a destructive action. */
export function confirmDelete(opts: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    title: opts.title,
    children: opts.children,
    labels: { confirm: opts.confirmLabel ?? 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm: opts.onConfirm,
  });
}

/** Format an ISO timestamp as a locale date-time, or '—' when absent. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

/** The user's primary email address, falling back to the first, then `fallback`. */
export function primaryEmail(user?: UserBase, fallback = '—'): string {
  const list = user?.emails ?? [];
  return (list.find((e) => e.is_primary) ?? list[0])?.address ?? fallback;
}
