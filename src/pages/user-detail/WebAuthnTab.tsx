import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { webauthn } from '../../api/endpoints';
import type { WebAuthnCredential } from '../../api/types';
import { QueryBoundary } from '../../components/QueryBoundary';
import { confirmDelete, formatDate, notifyError, notifySuccess } from '../../lib/ui';

export function WebAuthnTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const key = ['user', userId, 'webauthn'];

  const query = useQuery({ queryKey: key, queryFn: () => webauthn.list(userId) });

  const deleteMutation = useMutation({
    mutationFn: (credentialId: string) => webauthn.remove(userId, credentialId),
    onSuccess: () => {
      notifySuccess('Passkey removed');
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (err) => notifyError('Failed to remove passkey', err),
  });

  const confirmRemove = (cred: WebAuthnCredential) =>
    confirmDelete({
      title: 'Remove passkey',
      children: (
        <Text size="sm">
          Remove passkey <b>{cred.name || cred.id}</b>? The user will no longer
          be able to sign in with it.
        </Text>
      ),
      confirmLabel: 'Remove',
      onConfirm: () => deleteMutation.mutate(cred.id),
    });

  return (
    <QueryBoundary query={query}>
      {(rows) => (
        <Card withBorder radius="md" p="lg">
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Backup</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Last used</Table.Th>
                  <Table.Th w={50}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((cred) => (
                  <Table.Tr key={cred.id}>
                    <Table.Td>{cred.name || '—'}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Badge variant="light" color="gray">
                          {cred.attestation_type || 'unknown'}
                        </Badge>
                        {cred.mfa_only && (
                          <Badge variant="light" color="orange">
                            MFA only
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={cred.backup_state ? 'teal' : 'gray'}
                      >
                        {cred.backup_state ? 'Backed up' : 'Local'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDate(cred.created_at)}</Table.Td>
                    <Table.Td>{formatDate(cred.last_used_at)}</Table.Td>
                    <Table.Td>
                      <Tooltip label="Remove passkey">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => confirmRemove(cred)}
                          aria-label="Remove passkey"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center" py="sm">
                        No passkeys registered.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </QueryBoundary>
  );
}
