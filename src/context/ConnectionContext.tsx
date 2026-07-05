import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as api from '../api/client';
import type { CliProvider } from '../api/providers';
import type { ConnectionInfo } from '../api/types';

interface ConnectionContextValue {
  /** null while the initial status check is in flight. */
  info: ConnectionInfo | null;
  connected: boolean;
  loading: boolean;
  connect: (
    baseUrl: string,
    apiKey: string,
    headers: api.HeaderInput[],
    provider?: CliProvider | null,
  ) => Promise<void>;
  disconnect: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const connected = info != null;

  // On mount, ask Rust whether a session already exists (survives HMR reloads).
  useEffect(() => {
    api
      .connectionInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  const connect = useCallback(
    async (
      baseUrl: string,
      apiKey: string,
      headers: api.HeaderInput[],
      provider?: CliProvider | null,
    ) => {
      setInfo(await api.connect(baseUrl, apiKey, headers, provider));
    },
    [],
  );

  const disconnect = useCallback(async () => {
    await api.disconnect();
    setInfo(null);
  }, []);

  const value = useMemo<ConnectionContextValue>(
    () => ({ info, connected, loading, connect, disconnect }),
    [info, connected, loading, connect, disconnect],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider');
  return ctx;
}
