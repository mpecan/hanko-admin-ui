import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconTrash, IconUserPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { users } from '../api/endpoints';
import type { UserBase } from '../api/types';
import { QueryError } from '../components/QueryError';
import { Sensitive } from '../components/Sensitive';
import { TablePagination } from '../components/TablePagination';
import {
  confirmDelete,
  formatDate,
  notifyError,
  notifySuccess,
  primaryEmail,
} from '../lib/ui';
import { CreateUserModal } from './users/CreateUserModal';

const PER_PAGE = 20;

export function Users() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail] = useDebouncedValue(emailFilter, 350);
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery({
    queryKey: ['users', { page, email: debouncedEmail, sort }],
    queryFn: () =>
      users.list({
        page,
        per_page: PER_PAGE,
        email: debouncedEmail || undefined,
        sort_direction: sort,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => users.remove(id),
    onSuccess: () => {
      notifySuccess('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => notifyError('Failed to delete user', err),
  });

  const confirmRemove = (user: UserBase) =>
    confirmDelete({
      title: 'Delete user',
      children: (
        <Text size="sm">
          Permanently delete <b>{primaryEmail(user)}</b> ({user.id})? This
          cannot be undone.
        </Text>
      ),
      onConfirm: () => deleteMutation.mutate(user.id),
    });

  const rows = query.data?.items ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Users</Title>
        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={() => setCreateOpen(true)}
        >
          Create user
        </Button>
      </Group>

      <Card withBorder radius="md" p="md">
        <Group mb="md" justify="space-between">
          <TextInput
            placeholder="Filter by exact email"
            leftSection={<IconSearch size={16} />}
            value={emailFilter}
            onChange={(e) => {
              setPage(1);
              setEmailFilter(e.currentTarget.value);
            }}
            w={320}
          />
          <Select
            label={undefined}
            value={sort}
            onChange={(v) => setSort((v as 'asc' | 'desc') ?? 'desc')}
            data={[
              { value: 'desc', label: 'Newest first' },
              { value: 'asc', label: 'Oldest first' },
            ]}
            allowDeselect={false}
            w={160}
          />
        </Group>

        {query.isError ? (
          <QueryError error={query.error} />
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Username</Table.Th>
                  <Table.Th>Passkeys</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th w={60}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/users/${user.id}`}>
                        <Sensitive reveal="email">{primaryEmail(user)}</Sensitive>
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      {user.username?.username ? (
                        <Sensitive>{user.username.username}</Sensitive>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray">
                        {user.webauthn_credentials?.length ?? 0}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDate(user.created_at)}</Table.Td>
                    <Table.Td>
                      <Tooltip label="Delete user">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => confirmRemove(user)}
                          aria-label="Delete user"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {!query.isLoading && rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="md">
                        No users found.
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

      <CreateUserModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() =>
          queryClient.invalidateQueries({ queryKey: ['users'] })
        }
      />
    </Stack>
  );
}
