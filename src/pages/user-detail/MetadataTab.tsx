import { Button, Card, Group, JsonInput, Stack, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { metadata } from '../../api/endpoints';
import type { UserMetadata } from '../../api/types';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useSensitiveInputStyles } from '../../components/Sensitive';
import { notifyError, notifySuccess } from '../../lib/ui';

function stringify(value: unknown): string {
  if (value == null) return '';
  return JSON.stringify(value, null, 2);
}

function parseOrThrow(
  label: string,
  text: string,
): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    throw new Error(
      `${label} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

const SCOPES: { key: keyof UserMetadata; label: string; description: string }[] = [
  {
    key: 'public_metadata',
    label: 'Public metadata',
    description: 'Readable by the frontend SDK and included in tokens.',
  },
  {
    key: 'private_metadata',
    label: 'Private metadata',
    description: 'Only accessible via the Admin API.',
  },
  {
    key: 'unsafe_metadata',
    label: 'Unsafe metadata',
    description: 'Writable by the end user via the public API.',
  },
];

function MetadataForm({
  userId,
  initial,
}: {
  userId: string;
  initial: UserMetadata;
}) {
  const queryClient = useQueryClient();
  const inputStyles = useSensitiveInputStyles();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    public_metadata: stringify(initial.public_metadata),
    private_metadata: stringify(initial.private_metadata),
    unsafe_metadata: stringify(initial.unsafe_metadata),
  }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UserMetadata = {
        public_metadata: parseOrThrow('Public metadata', values.public_metadata),
        private_metadata: parseOrThrow(
          'Private metadata',
          values.private_metadata,
        ),
        unsafe_metadata: parseOrThrow('Unsafe metadata', values.unsafe_metadata),
      };
      return metadata.patch(userId, payload);
    },
    onSuccess: () => {
      notifySuccess('Metadata saved');
      queryClient.invalidateQueries({ queryKey: ['user', userId, 'metadata'] });
    },
    onError: (err) => notifyError('Failed to save metadata', err),
  });

  return (
    <Card withBorder radius="md" p="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Edit metadata as JSON objects. An empty field clears that scope.
          Provided keys are merged into existing metadata.
        </Text>
        {SCOPES.map((scope) => (
          <JsonInput
            key={scope.key}
            label={scope.label}
            description={scope.description}
            value={values[scope.key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [scope.key]: v }))}
            styles={inputStyles}
            formatOnBlur
            autosize
            minRows={4}
            validationError="Invalid JSON"
            placeholder="{}"
          />
        ))}
        <Group justify="flex-end">
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Save metadata
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export function MetadataTab({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: ['user', userId, 'metadata'],
    queryFn: () => metadata.get(userId),
  });

  return (
    <QueryBoundary query={query}>
      {(data) => <MetadataForm userId={userId} initial={data} />}
    </QueryBoundary>
  );
}
