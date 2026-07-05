import {
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  Loader,
  Stack,
  Title,
} from '@mantine/core';
import { IconCheck, IconCopy, IconRefresh } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { metrics } from '../api/endpoints';
import { QueryError } from '../components/QueryError';

export function Metrics() {
  const query = useQuery({
    queryKey: ['metrics'],
    queryFn: metrics.get,
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Metrics</Title>
        <Group>
          <CopyButton value={query.data ?? ''}>
            {({ copied, copy }) => (
              <Button
                variant="default"
                leftSection={
                  copied ? <IconCheck size={16} /> : <IconCopy size={16} />
                }
                onClick={copy}
                disabled={!query.data}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </CopyButton>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => query.refetch()}
            loading={query.isFetching}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      <Card withBorder radius="md" p="md">
        {query.isLoading ? (
          <Group justify="center" py="lg">
            <Loader />
          </Group>
        ) : query.isError ? (
          <QueryError error={query.error} />
        ) : (
          <Code
            block
            style={{
              maxHeight: '70vh',
              overflow: 'auto',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {query.data || 'No metrics returned.'}
          </Code>
        )}
      </Card>
    </Stack>
  );
}
