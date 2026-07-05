import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { otp } from '../../api/endpoints';
import { QueryBoundary } from '../../components/QueryBoundary';
import { confirmDelete, formatDate, notifyError, notifySuccess } from '../../lib/ui';

export function OtpTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const key = ['user', userId, 'otp'];

  const query = useQuery({ queryKey: key, queryFn: () => otp.get(userId) });

  const deleteMutation = useMutation({
    mutationFn: () => otp.remove(userId),
    onSuccess: () => {
      notifySuccess('OTP secret removed');
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (err) => notifyError('Failed to remove OTP secret', err),
  });

  const confirmRemove = () =>
    confirmDelete({
      title: 'Remove OTP secret',
      children: (
        <Text size="sm">
          Remove this user&apos;s OTP (authenticator app) secret?
        </Text>
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
              <Text fw={600}>OTP secret</Text>
              <Badge variant="light" color={data ? 'teal' : 'gray'}>
                {data ? 'Configured' : 'Not configured'}
              </Badge>
            </Group>

            {data ? (
              <>
                <Text size="sm" c="dimmed">
                  Created {formatDate(data.created_at)}
                </Text>
                <Group justify="flex-end">
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={confirmRemove}
                    loading={deleteMutation.isPending}
                  >
                    Remove OTP secret
                  </Button>
                </Group>
              </>
            ) : (
              <Text size="sm" c="dimmed">
                This user has not set up an authenticator app.
              </Text>
            )}
          </Stack>
        </Card>
      )}
    </QueryBoundary>
  );
}
