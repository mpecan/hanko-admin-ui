import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { webhooks } from '../api/endpoints';
import { WEBHOOK_EVENTS, type Webhook } from '../api/types';
import { QueryError } from '../components/QueryError';
import { confirmDelete, formatDate, notifyError, notifySuccess } from '../lib/ui';

/** Webhook events may come back as strings or {id, event} objects. */
function eventStrings(webhook: Webhook): string[] {
  const events = Array.isArray(webhook.events) ? webhook.events : [];
  return events.map((e) => (typeof e === 'string' ? e : e.event));
}

/** Editor target: null = closed, 'new' = creating, a Webhook = editing. */
type EditorTarget = Webhook | 'new' | null;

export function Webhooks() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorTarget>(null);

  const query = useQuery({ queryKey: ['webhooks'], queryFn: webhooks.list });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooks.remove(id),
    onSuccess: () => {
      notifySuccess('Webhook deleted');
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (err) => notifyError('Failed to delete webhook', err),
  });

  const confirmRemove = (webhook: Webhook) =>
    confirmDelete({
      title: 'Delete webhook',
      children: (
        <Text size="sm">
          Delete the webhook to <b>{webhook.callback}</b>?
        </Text>
      ),
      onConfirm: () => webhook.id && deleteMutation.mutate(webhook.id),
    });

  const rows = query.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Webhooks</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setEditor('new')}
        >
          Create webhook
        </Button>
      </Group>

      <Card withBorder radius="md" p="md">
        {query.isLoading ? (
          <Group justify="center" py="lg">
            <Loader />
          </Group>
        ) : query.isError ? (
          <QueryError error={query.error} />
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Callback URL</Table.Th>
                  <Table.Th>Events</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th w={90}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((webhook) => (
                  <Table.Tr key={webhook.id ?? webhook.callback}>
                    <Table.Td>
                      <Text size="sm" lineClamp={1} maw={320}>
                        {webhook.callback}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray">
                        {eventStrings(webhook).length} events
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={webhook.enabled ? 'teal' : 'gray'}
                      >
                        {webhook.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDate(webhook.created_at)}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => setEditor(webhook)}
                            aria-label="Edit webhook"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => confirmRemove(webhook)}
                            aria-label="Delete webhook"
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
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="md">
                        No webhooks configured.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {editor && (
        <WebhookEditor
          webhook={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={() =>
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
          }
        />
      )}
    </Stack>
  );
}

function WebhookEditor({
  webhook,
  onClose,
  onSaved,
}: {
  webhook: Webhook | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = webhook != null;
  const form = useForm({
    initialValues: {
      callback: webhook?.callback ?? '',
      events: webhook ? eventStrings(webhook) : ([] as string[]),
      enabled: webhook?.enabled ?? true,
    },
    validate: {
      callback: (v) =>
        /^https?:\/\/.+/.test(v) ? null : 'Enter a valid http(s) URL',
      events: (v) => (v.length > 0 ? null : 'Select at least one event'),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      isEdit && webhook?.id
        ? webhooks.update(webhook.id, {
            callback: values.callback.trim(),
            events: values.events,
            enabled: values.enabled,
          })
        : webhooks.create({
            callback: values.callback.trim(),
            events: values.events,
          }),
    onSuccess: () => {
      notifySuccess(isEdit ? 'Webhook updated' : 'Webhook created');
      onClose();
      onSaved();
    },
    onError: (err) => notifyError('Failed to save webhook', err),
  });

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEdit ? 'Edit webhook' : 'Create webhook'}
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <TextInput
            label="Callback URL"
            placeholder="https://example.com/hanko-webhook"
            required
            {...form.getInputProps('callback')}
          />
          <MultiSelect
            label="Events"
            placeholder="Select events"
            data={[...WEBHOOK_EVENTS]}
            searchable
            required
            maxDropdownHeight={260}
            {...form.getInputProps('events')}
          />
          {isEdit && (
            <Switch
              label="Enabled"
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
