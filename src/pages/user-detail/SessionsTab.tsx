import {
  ActionIcon,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconCopy, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { sessions } from '../../api/endpoints';
import type { Session } from '../../api/types';
import { QueryBoundary } from '../../components/QueryBoundary';
import { Sensitive } from '../../components/Sensitive';
import { confirmDelete, formatDate, notifyError, notifySuccess } from '../../lib/ui';

export function SessionsTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const key = ['user', userId, 'sessions'];
  const [token, setToken] = useState<string | null>(null);

  const query = useQuery({ queryKey: key, queryFn: () => sessions.list(userId) });

  const createMutation = useMutation({
    mutationFn: () => sessions.create(userId),
    onSuccess: (res) => {
      setToken(res.session_token);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err) => notifyError('Failed to create session', err),
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => sessions.remove(userId, sessionId),
    onSuccess: () => {
      notifySuccess('Session revoked');
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err) => notifyError('Failed to revoke session', err),
  });

  const confirmRevoke = (session: Session) =>
    confirmDelete({
      title: 'Revoke session',
      children: (
        <Text size="sm">
          Revoke this session? The associated device will be signed out.
        </Text>
      ),
      confirmLabel: 'Revoke',
      onConfirm: () => revokeMutation.mutate(session.id),
    });

  return (
    <QueryBoundary query={query}>
      {(rows) => (
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="md">
            <Text fw={600}>Active sessions</Text>
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create session token
            </Button>
          </Group>

          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>IP address</Table.Th>
                  <Table.Th>User agent</Table.Th>
                  <Table.Th>Last used</Table.Th>
                  <Table.Th>Expires</Table.Th>
                  <Table.Th w={50}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((session) => (
                  <Table.Tr key={session.id}>
                    <Table.Td>
                      {session.ip_address ? (
                        <Sensitive>{session.ip_address}</Sensitive>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1} maw={280}>
                        {session.user_agent ? (
                          <Sensitive>{session.user_agent}</Sensitive>
                        ) : (
                          '—'
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatDate(session.last_used)}</Table.Td>
                    <Table.Td>{formatDate(session.expires_at)}</Table.Td>
                    <Table.Td>
                      <Tooltip label="Revoke session">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => confirmRevoke(session)}
                          aria-label="Revoke session"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="sm">
                        No active sessions.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Modal
            opened={token !== null}
            onClose={() => setToken(null)}
            title="Session token created"
            centered
            size="lg"
          >
            <Stack>
              <Text size="sm" c="dimmed">
                Copy this token now — it is shown only once.
              </Text>
              <Code block style={{ wordBreak: 'break-all' }}>
                {token}
              </Code>
              <Group justify="flex-end">
                <CopyButton value={token ?? ''}>
                  {({ copied, copy }) => (
                    <Button
                      leftSection={
                        copied ? <IconCheck size={16} /> : <IconCopy size={16} />
                      }
                      color={copied ? 'teal' : undefined}
                      onClick={copy}
                    >
                      {copied ? 'Copied' : 'Copy token'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Modal>
        </Card>
      )}
    </QueryBoundary>
  );
}
