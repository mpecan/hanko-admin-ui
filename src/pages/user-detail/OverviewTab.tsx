import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { users } from '../../api/endpoints';
import type { PatchUserInput, User } from '../../api/types';
import { Sensitive } from '../../components/Sensitive';
import { usePrivacy } from '../../context/PrivacyContext';
import { confirmDelete, formatDate, notifyError, notifySuccess } from '../../lib/ui';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" style={{ textAlign: 'right' }}>
        {value}
      </Text>
    </Group>
  );
}

export function OverviewTab({
  user,
  onChanged,
}: {
  user: User;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { hidden } = usePrivacy();

  const form = useForm({
    initialValues: {
      username: user.username?.username ?? '',
      name: '',
      given_name: '',
      family_name: '',
      picture: '',
    },
  });

  const patchMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      // Only send changed / non-empty fields.
      const payload: PatchUserInput = {};
      if (values.username !== (user.username?.username ?? ''))
        payload.username = values.username || null;
      if (values.name) payload.name = values.name;
      if (values.given_name) payload.given_name = values.given_name;
      if (values.family_name) payload.family_name = values.family_name;
      if (values.picture) payload.picture = values.picture;
      return users.patch(user.id, payload);
    },
    onSuccess: () => {
      notifySuccess('User updated');
      onChanged();
    },
    onError: (err) => notifyError('Failed to update user', err),
  });

  const deleteMutation = useMutation({
    mutationFn: () => users.remove(user.id),
    onSuccess: () => {
      notifySuccess('User deleted');
      navigate('/users', { replace: true });
    },
    onError: (err) => notifyError('Failed to delete user', err),
  });

  const confirmRemove = () =>
    confirmDelete({
      title: 'Delete user',
      children: (
        <Text size="sm">
          Permanently delete this user and all associated credentials? This
          cannot be undone.
        </Text>
      ),
      confirmLabel: 'Delete user',
      onConfirm: () => deleteMutation.mutate(),
    });

  const identities = user.identities ?? [];

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Stack gap="lg">
        <Card withBorder radius="md" p="lg">
          <Title order={5} mb="md">
            Details
          </Title>
          <Stack gap="xs">
            <InfoRow label="User ID" value={<Sensitive>{user.id}</Sensitive>} />
            <InfoRow label="Created" value={formatDate(user.created_at)} />
            <InfoRow label="Updated" value={formatDate(user.updated_at)} />
            <InfoRow
              label="Emails"
              value={user.emails?.length ?? 0}
            />
            <InfoRow
              label="Passkeys"
              value={user.webauthn_credentials?.length ?? 0}
            />
            <InfoRow
              label="Password set"
              value={user.password ? 'Yes' : 'No'}
            />
            <InfoRow label="OTP set" value={user.otp ? 'Yes' : 'No'} />
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Title order={5} mb="md">
            Third-party identities
          </Title>
          {identities.length === 0 ? (
            <Text size="sm" c="dimmed">
              No linked identities.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Provider</Table.Th>
                  <Table.Th>Provider ID</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {identities.map((idn) => (
                  <Table.Tr key={idn.id}>
                    <Table.Td>{idn.provider_name}</Table.Td>
                    <Table.Td>
                      <Sensitive>{idn.provider_id}</Sensitive>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>

      <Stack gap="lg">
        <Card withBorder radius="md" p="lg">
          <Title order={5} mb="md">
            Edit profile
          </Title>
          <form
            onSubmit={form.onSubmit((values) => patchMutation.mutate(values))}
          >
            <Stack gap="sm">
              <TextInput
                label="Username"
                description="Clear to remove the username"
                type={hidden ? 'password' : undefined}
                {...form.getInputProps('username')}
              />
              <TextInput
                label="Display name"
                placeholder="Leave blank to keep unchanged"
                {...form.getInputProps('name')}
              />
              <Group grow>
                <TextInput
                  label="Given name"
                  placeholder="Unchanged"
                  {...form.getInputProps('given_name')}
                />
                <TextInput
                  label="Family name"
                  placeholder="Unchanged"
                  {...form.getInputProps('family_name')}
                />
              </Group>
              <TextInput
                label="Picture URL"
                placeholder="https://…"
                {...form.getInputProps('picture')}
              />
              <Group justify="flex-end">
                <Button type="submit" loading={patchMutation.isPending}>
                  Save changes
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Title order={5} c="red" mb="xs">
            Danger zone
          </Title>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Delete this user permanently.
            </Text>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              onClick={confirmRemove}
              loading={deleteMutation.isPending}
            >
              Delete user
            </Button>
          </Group>
        </Card>
      </Stack>
    </SimpleGrid>
  );
}
