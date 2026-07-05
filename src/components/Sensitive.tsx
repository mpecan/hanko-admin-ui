import type { CSSProperties, ReactNode } from 'react';

import { usePrivacy } from '../context/PrivacyContext';

/** Blur applied to hidden PII. Strong enough to be unreadable in a screenshot. */
export const SENSITIVE_BLUR: CSSProperties = {
  filter: 'blur(5px)',
  userSelect: 'none',
};

/**
 * Wraps personally-identifiable text. When privacy mode is on, the content is
 * blurred (layout preserved) so it can be revealed again with the header toggle.
 */
export function Sensitive({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  const { hidden } = usePrivacy();
  return (
    <span
      style={{
        display: 'inline-block',
        transition: 'filter 120ms ease',
        ...(hidden ? SENSITIVE_BLUR : null),
        ...style,
      }}
      aria-hidden={hidden || undefined}
    >
      {children}
    </span>
  );
}

/**
 * Mantine `styles` fragment that blurs an input's text when privacy mode is on.
 * Use for fields that display PII (e.g. a pre-filled username or JSON metadata).
 */
export function useSensitiveInputStyles(): { input: CSSProperties } | undefined {
  const { hidden } = usePrivacy();
  return hidden ? { input: SENSITIVE_BLUR } : undefined;
}
