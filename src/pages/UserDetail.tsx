import {
  Anchor,
  Breadcrumbs,
  Card,
  Group,
  Loader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconFingerprint,
  IconId,
  IconKey,
  IconMail,
  IconNumbers,
  IconDeviceLaptop,
  IconTags,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import type { ReactNode } from 'react';

import { users } from '../api/endpoints';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { QueryError } from '../components/QueryError';
import { Sensitive } from '../components/Sensitive';
import { primaryEmail } from '../lib/ui';

/** A tab panel whose contents are isolated by an ErrorBoundary, so a failing
 *  tab shows an inline error instead of unmounting the whole tab view. */
function TabPanel({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Tabs.Panel value={value} pt="lg">
      <ErrorBoundary label={`the ${label} tab`}>{children}</ErrorBoundary>
    </Tabs.Panel>
  );
}
import { EmailsTab } from './user-detail/EmailsTab';
import { MetadataTab } from './user-detail/MetadataTab';
import { OtpTab } from './user-detail/OtpTab';
import { OverviewTab } from './user-detail/OverviewTab';
import { PasswordTab } from './user-detail/PasswordTab';
import { SessionsTab } from './user-detail/SessionsTab';
import { WebAuthnTab } from './user-detail/WebAuthnTab';

export function UserDetail() {
  const { id = '' } = useParams();

  const query = useQuery({
    queryKey: ['user', id],
    queryFn: () => users.get(id),
  });

  return (
    <Stack gap="lg">
      <Breadcrumbs>
        <Anchor component={Link} to="/users">
          Users
        </Anchor>
        <Text>
          <Sensitive>{primaryEmail(query.data, id)}</Sensitive>
        </Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>
            <Sensitive>{primaryEmail(query.data, id)}</Sensitive>
          </Title>
          <Text size="sm" c="dimmed">
            <Sensitive>{id}</Sensitive>
          </Text>
        </Stack>
      </Group>

      {query.isLoading && (
        <Card withBorder radius="md" p="xl">
          <Group justify="center">
            <Loader />
          </Group>
        </Card>
      )}

      {query.isError && <QueryError error={query.error} />}

      {query.data && (
        <Tabs defaultValue="overview" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconId size={16} />}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="emails" leftSection={<IconMail size={16} />}>
              Emails
            </Tabs.Tab>
            <Tabs.Tab value="metadata" leftSection={<IconTags size={16} />}>
              Metadata
            </Tabs.Tab>
            <Tabs.Tab
              value="sessions"
              leftSection={<IconDeviceLaptop size={16} />}
            >
              Sessions
            </Tabs.Tab>
            <Tabs.Tab
              value="passkeys"
              leftSection={<IconFingerprint size={16} />}
            >
              Passkeys
            </Tabs.Tab>
            <Tabs.Tab value="password" leftSection={<IconKey size={16} />}>
              Password
            </Tabs.Tab>
            <Tabs.Tab value="otp" leftSection={<IconNumbers size={16} />}>
              OTP
            </Tabs.Tab>
          </Tabs.List>

          <TabPanel value="overview" label="Overview">
            <OverviewTab user={query.data} onChanged={query.refetch} />
          </TabPanel>
          <TabPanel value="emails" label="Emails">
            <EmailsTab userId={id} />
          </TabPanel>
          <TabPanel value="metadata" label="Metadata">
            <MetadataTab userId={id} />
          </TabPanel>
          <TabPanel value="sessions" label="Sessions">
            <SessionsTab userId={id} />
          </TabPanel>
          <TabPanel value="passkeys" label="Passkeys">
            <WebAuthnTab userId={id} />
          </TabPanel>
          <TabPanel value="password" label="Password">
            <PasswordTab userId={id} />
          </TabPanel>
          <TabPanel value="otp" label="OTP">
            <OtpTab userId={id} />
          </TabPanel>
        </Tabs>
      )}
    </Stack>
  );
}
