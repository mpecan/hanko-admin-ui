import type { ReactNode } from 'react';

import { usePrivacy } from '../context/PrivacyContext';

/** Fixed-width mask — constant length so the real value's length isn't leaked. */
const FULL_MASK = '••••••••';

const maskStyle: React.CSSProperties = {
  userSelect: 'none',
  letterSpacing: '0.15em',
  color: 'var(--mantine-color-dimmed)',
};

/**
 * Partial email reveal: first local-part character + the TLD, e.g. `j•••@•••.de`.
 * Everything else is masked with a fixed number of dots (no length leak). Falls
 * back to the full mask for anything that isn't email-shaped.
 */
function maskEmail(value: string): string {
  const at = value.lastIndexOf('@');
  if (at <= 0 || at >= value.length - 1) return FULL_MASK;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${local[0]}•••@•••${tld}`;
}

/**
 * Redacts personally-identifiable content. When privacy mode is on, the real
 * `children` are **not rendered** — a fixed-width mask is shown instead, so the
 * value is absent from the DOM and from any screenshot (nothing to reconstruct).
 *
 * `reveal="email"` shows a convenience partial reveal (first char + TLD) when
 * the child is an email string.
 */
export function Sensitive({
  children,
  reveal,
}: {
  children: ReactNode;
  reveal?: 'email';
}) {
  const { hidden } = usePrivacy();
  if (!hidden) return <>{children}</>;

  const masked =
    reveal === 'email' && typeof children === 'string'
      ? maskEmail(children)
      : FULL_MASK;

  return (
    <span style={maskStyle} aria-label="hidden">
      {masked}
    </span>
  );
}
