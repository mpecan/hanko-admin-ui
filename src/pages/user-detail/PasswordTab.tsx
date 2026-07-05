import {
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { password } from '../../api/endpoints';
import { QueryBoundary } from '../../components/QueryBoundary';
import { confirmDelete, formatDate, notifyError, notifySuccess } from '../../lib/ui';

export function PasswordTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const key = ['user', userId, 'password'];
  const [value, setValue] = useState('');

  const query = useQuery({ queryKey: key, queryFn: () => password.get(userId) });
  const hasPassword = query.data != null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
  };

  const saveMutation = useMutation({
    mutationFn: (pw: string) =>
      hasPassword ? password.update(userId, pw) : password.create(userId, pw),
    onSuccess: () => {
      notifySuccess(hasPassword ? 'Password updated' : 'Password set');
      setValue('');
      invalidate();
    },
    onError: (err) => notifyError('Failed to save password', err),
  });

  const deleteMutation = useMutation({
    mutationFn: () => password.remove(userId),
    onSuccess: () => {
      notifySuccess('Password removed');
      invalidate();
    },
    onError: (err) => notifyError('Failed to remove password', err),
  });

  const confirmRemove = () =>
    confirmDelete({
      title: 'Remove password',
      children: (
        <Text size="sm">Remove this user&apos;s password credential?</Text>
      ),
      confirmLabel: 'Remove',
      onConfirm: () => deleteMutation.mutate(),
    });

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <Card withBorder radius="md" p="lg" maw={520}>
          <Stack>
            <Group>
              <Text fw={600}>Password credential</Text>
              <Badge variant="light" color={hasPassword ? 'teal' : 'gray'}>
                {hasPassword ? 'Set' : 'Not set'}
              </Badge>
            </Group>

            {data && (
              <Text size="sm" c="dimmed">
                Last updated {formatDate(data.updated_at)}
              </Text>
            )}

            <PasswordInput
              label={hasPassword ? 'New password' : 'Set password'}
              placeholder="Enter a new password"
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />

            <Group justify="space-between">
              {hasPassword ? (
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={confirmRemove}
                  loading={deleteMutation.isPending}
                >
                  Remove password
                </Button>
              ) : (
                <span />
              )}
              <Button
                disabled={value.length === 0}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(value)}
              >
                {hasPassword ? 'Update password' : 'Set password'}
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
    </QueryBoundary>
  );
}
