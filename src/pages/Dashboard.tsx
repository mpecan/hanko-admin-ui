import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconCircleCheck,
  IconCircleX,
  IconUsers,
  IconWebhook,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { auditLogs, status, users, webhooks } from '../api/endpoints';

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Text fw={700} size="1.6rem">
            {loading ? '…' : value}
          </Text>
        </Stack>
        <ThemeIcon variant="light" size={44} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}

export function Dashboard() {
  const statusQuery = useQuery({
    queryKey: ['status'],
    queryFn: status.get,
  });
  const usersQuery = useQuery({
    queryKey: ['users', 'count'],
    queryFn: () => users.list({ per_page: 1 }),
  });
  const webhooksQuery = useQuery({
    queryKey: ['webhooks'],
    queryFn: webhooks.list,
  });
  const auditQuery = useQuery({
    queryKey: ['audit_logs', 'count'],
    queryFn: () => auditLogs.list({ per_page: 1 }),
  });

  const healthy = statusQuery.isSuccess;
  const statusColor = healthy ? 'teal' : statusQuery.isLoading ? 'gray' : 'red';

  return (
    <Stack gap="lg">
      <Title order={2}>Dashboard</Title>

      <Card withBorder radius="md" p="lg">
        <Group justify="space-between">
          <Group>
            <ThemeIcon size={44} radius="md" color={statusColor} variant="light">
              {healthy ? (
                <IconCircleCheck size={26} />
              ) : (
                <IconCircleX size={26} />
              )}
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={600}>Admin API status</Text>
              <Text size="sm" c="dimmed">
                {statusQuery.isLoading
                  ? 'Checking…'
                  : healthy
                    ? 'The Admin API is responding.'
                    : 'The Admin API did not respond as expected.'}
              </Text>
            </Stack>
          </Group>
          <Badge color={statusColor} variant="light" size="lg">
            {statusQuery.isLoading
              ? 'Checking'
              : healthy
                ? 'Healthy'
                : 'Unhealthy'}
          </Badge>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <StatCard
          label="Total users"
          value={usersQuery.data?.total ?? 0}
          loading={usersQuery.isLoading}
          icon={<IconUsers size={24} />}
        />
        <StatCard
          label="Webhooks"
          value={webhooksQuery.data?.length ?? 0}
          loading={webhooksQuery.isLoading}
          icon={<IconWebhook size={24} />}
        />
        <StatCard
          label="Audit log entries"
          value={auditQuery.data?.total ?? 0}
          loading={auditQuery.isLoading}
          icon={<IconUsers size={24} />}
        />
      </SimpleGrid>
    </Stack>
  );
}
