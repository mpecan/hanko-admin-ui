import {
  Badge,
  Card,
  Group,
  MultiSelect,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { auditLogs } from '../api/endpoints';
import { AUDIT_LOG_TYPES } from '../api/types';
import { QueryError } from '../components/QueryError';
import { Sensitive } from '../components/Sensitive';
import { TablePagination } from '../components/TablePagination';
import { formatDate } from '../lib/ui';

const PER_PAGE = 25;

function typeColor(type: string): string {
  if (type.includes('failed') || type.includes('failure')) return 'red';
  if (type.includes('succeeded') || type.includes('success')) return 'teal';
  if (type.includes('deleted')) return 'orange';
  if (type.includes('created')) return 'indigo';
  return 'gray';
}

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [dSearch] = useDebouncedValue(search, 350);
  const [dActorEmail] = useDebouncedValue(actorEmail, 350);

  const query = useQuery({
    queryKey: ['audit_logs', { page, types, dSearch, dActorEmail }],
    queryFn: () =>
      auditLogs.list({
        page,
        per_page: PER_PAGE,
        type: types.length ? types : undefined,
        q: dSearch || undefined,
        actor_email: dActorEmail || undefined,
      }),
  });

  const resetPage = () => setPage(1);
  const rows = query.data?.items ?? [];

  return (
    <Stack gap="lg">
      <Title order={2}>Audit logs</Title>

      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group grow>
            <TextInput
              placeholder="Search IP, actor id or email"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => {
                resetPage();
                setSearch(e.currentTarget.value);
              }}
            />
            <TextInput
              placeholder="Filter by actor email"
              value={actorEmail}
              onChange={(e) => {
                resetPage();
                setActorEmail(e.currentTarget.value);
              }}
            />
          </Group>
          <MultiSelect
            placeholder={types.length ? undefined : 'Filter by event type'}
            data={[...AUDIT_LOG_TYPES]}
            value={types}
            onChange={(v) => {
              resetPage();
              setTypes(v);
            }}
            searchable
            clearable
            maxDropdownHeight={280}
          />
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md">
        {query.isError ? (
          <QueryError error={query.error} />
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table highlightOnHover verticalSpacing="sm" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Time</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Actor</Table.Th>
                  <Table.Th>Source IP</Table.Th>
                  <Table.Th>Error</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(log.created_at)}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={typeColor(log.type)}>
                        {log.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {log.actor_email || log.actor_user_id ? (
                        <Sensitive reveal="email">
                          {log.actor_email || log.actor_user_id}
                        </Sensitive>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      {log.meta_source_ip ? (
                        <Sensitive>{log.meta_source_ip}</Sensitive>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="red" lineClamp={1} maw={220}>
                        {log.error || ''}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {!query.isLoading && rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="md">
                        No audit logs match the filters.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        <TablePagination
          total={query.data?.total}
          perPage={PER_PAGE}
          page={page}
          onChange={setPage}
          loading={query.isLoading}
        />
      </Card>
    </Stack>
  );
}
