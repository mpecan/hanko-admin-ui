import { Group, Pagination, Text } from '@mantine/core';

/** Footer row showing the total count and page controls for a paged table. */
export function TablePagination({
  total,
  perPage,
  page,
  onChange,
  loading,
}: {
  total?: number;
  perPage: number;
  page: number;
  onChange: (page: number) => void;
  loading?: boolean;
}) {
  const totalPages = total ? Math.max(1, Math.ceil(total / perPage)) : 1;
  return (
    <Group justify="space-between" mt="md">
      <Text size="sm" c="dimmed">
        {total !== undefined ? `${total} total` : ' '}
      </Text>
      <Pagination
        total={totalPages}
        value={page}
        onChange={onChange}
        disabled={loading}
      />
    </Group>
  );
}
