import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface PrivacyContextValue {
  /** When true, personally-identifiable information is blurred in the UI. */
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const toggle = useCallback(() => setHidden((h) => !h), []);
  const value = useMemo<PrivacyContextValue>(
    () => ({ hidden, toggle }),
    [hidden, toggle],
  );
  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
}
