import { Center, Loader } from '@mantine/core';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { QueryError } from './QueryError';

/**
 * Renders a query's loading and error states consistently, and hands the
 * resolved data to `children`. Note `data` may itself be `null` (e.g. an
 * optional resource that returned 404) — that is treated as loaded, not
 * loading.
 */
export function QueryBoundary<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isError) return <QueryError error={query.error} />;
  if (query.isPending || query.data === undefined) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  return <>{children(query.data)}</>;
}
