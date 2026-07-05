import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconStar, IconStarFilled, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { emails } from '../../api/endpoints';
import type { Email } from '../../api/types';
import { QueryBoundary } from '../../components/QueryBoundary';
import { confirmDelete, formatDate, notifyError, notifySuccess } from '../../lib/ui';

export function EmailsTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const key = ['user', userId, 'emails'];

  const query = useQuery({ queryKey: key, queryFn: () => emails.list(userId) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
  };

  const addForm = useForm({
    initialValues: { address: '', is_verified: true },
    validate: {
      address: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email'),
    },
  });

  const addMutation = useMutation({
    mutationFn: (values: typeof addForm.values) =>
      emails.create(userId, {
        address: values.address.trim(),
        is_verified: values.is_verified,
      }),
    onSuccess: () => {
      notifySuccess('Email added');
      addForm.reset();
      invalidate();
    },
    onError: (err) => notifyError('Failed to add email', err),
  });

  const primaryMutation = useMutation({
    mutationFn: (emailId: string) => emails.setPrimary(userId, emailId),
    onSuccess: () => {
      notifySuccess('Primary email updated');
      invalidate();
    },
    onError: (err) => notifyError('Failed to set primary email', err),
  });

  const deleteMutation = useMutation({
    mutationFn: (emailId: string) => emails.remove(userId, emailId),
    onSuccess: () => {
      notifySuccess('Email removed');
      invalidate();
    },
    onError: (err) => notifyError('Failed to remove email', err),
  });

  const confirmRemove = (email: Email) =>
    confirmDelete({
      title: 'Remove email',
      children: (
        <Text size="sm">
          Remove <b>{email.address}</b> from this user?
        </Text>
      ),
      confirmLabel: 'Remove',
      onConfirm: () => deleteMutation.mutate(email.id),
    });

  return (
    <QueryBoundary query={query}>
      {(rows) => (
        <Card withBorder radius="md" p="lg">
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Address</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th w={110}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((email) => (
                <Table.Tr key={email.id}>
                  <Table.Td>{email.address}</Table.Td>
                  <Table.Td>
                    <Group gap={6}>
                      {email.is_primary && (
                        <Badge color="indigo" variant="light">
                          Primary
                        </Badge>
                      )}
                      <Badge
                        color={email.is_verified ? 'teal' : 'gray'}
                        variant="light"
                      >
                        {email.is_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>{formatDate(email.created_at)}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Tooltip
                        label={email.is_primary ? 'Primary' : 'Set as primary'}
                      >
                        <ActionIcon
                          variant="subtle"
                          color="indigo"
                          disabled={email.is_primary}
                          loading={
                            primaryMutation.isPending &&
                            primaryMutation.variables === email.id
                          }
                          onClick={() => primaryMutation.mutate(email.id)}
                          aria-label="Set primary"
                        >
                          {email.is_primary ? (
                            <IconStarFilled size={16} />
                          ) : (
                            <IconStar size={16} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remove email">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => confirmRemove(email)}
                          aria-label="Remove email"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center" py="sm">
                      No emails.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <form
            onSubmit={addForm.onSubmit((values) => addMutation.mutate(values))}
          >
            <Group align="flex-end" mt="lg">
              <TextInput
                label="Add email"
                placeholder="new@example.com"
                style={{ flex: 1 }}
                {...addForm.getInputProps('address')}
              />
              <Checkbox
                label="Verified"
                mb={8}
                {...addForm.getInputProps('is_verified', { type: 'checkbox' })}
              />
              <Button type="submit" loading={addMutation.isPending}>
                Add
              </Button>
            </Group>
          </form>
        </Card>
      )}
    </QueryBoundary>
  );
}
