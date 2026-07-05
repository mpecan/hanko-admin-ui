import {
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { users } from '../../api/endpoints';
import { notifyError, notifySuccess } from '../../lib/ui';

interface Props {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUserModal({ opened, onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      address: '',
      username: '',
      is_verified: true,
    },
    validate: {
      address: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email'),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      users.create({
        emails: [
          {
            address: values.address.trim(),
            is_primary: true,
            is_verified: values.is_verified,
          },
        ],
        username: values.username.trim() || undefined,
      }),
    onSuccess: (user) => {
      notifySuccess('User created', user.id);
      form.reset();
      onClose();
      onCreated();
      navigate(`/users/${user.id}`);
    },
    onError: (err) => notifyError('Failed to create user', err),
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create user"
      centered
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <TextInput
            label="Primary email"
            placeholder="user@example.com"
            required
            {...form.getInputProps('address')}
          />
          <TextInput
            label="Username"
            placeholder="Optional"
            {...form.getInputProps('username')}
          />
          <Checkbox
            label="Mark email as verified"
            {...form.getInputProps('is_verified', { type: 'checkbox' })}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
