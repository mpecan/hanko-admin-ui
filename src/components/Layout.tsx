import {
  ActionIcon,
  AppShell,
  Badge,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChartBar,
  IconLogout,
  IconMoon,
  IconShieldLock,
  IconSun,
  IconUsers,
  IconWebhook,
  IconClipboardList,
  IconGauge,
} from '@tabler/icons-react';
import {
  NavLink as RouterNavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useConnection } from '../context/ConnectionContext';
import { ErrorBoundary } from './ErrorBoundary';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: IconGauge, end: true },
  { label: 'Users', to: '/users', icon: IconUsers, end: false },
  { label: 'Audit logs', to: '/audit-logs', icon: IconClipboardList, end: false },
  { label: 'Webhooks', to: '/webhooks', icon: IconWebhook, end: false },
  { label: 'Metrics', to: '/metrics', icon: IconChartBar, end: false },
];

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const { info, disconnect } = useConnection();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const handleDisconnect = async () => {
    await disconnect();
    navigate('/connect', { replace: true });
  };

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconShieldLock size={22} stroke={1.5} />
            <Title order={4}>Hanko Admin</Title>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {info && (
              <Tooltip
                label={
                  info.header_names.length
                    ? `Custom headers: ${info.header_names.join(', ')}`
                    : 'No custom headers'
                }
              >
                <Badge
                  variant="light"
                  color="indigo"
                  size="lg"
                  style={{ maxWidth: 360, textTransform: 'none' }}
                >
                  <Text truncate size="xs" fw={500}>
                    {info.base_url}
                  </Text>
                </Badge>
              </Tooltip>
            )}
            <Tooltip label="Toggle color scheme">
              <ActionIcon
                variant="subtle"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
              >
                {colorScheme === 'dark' ? (
                  <IconSun size={18} />
                ) : (
                  <IconMoon size={18} />
                )}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Disconnect">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={handleDisconnect}
                aria-label="Disconnect"
              >
                <IconLogout size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <ScrollArea>
          {NAV_ITEMS.map((item) => {
            const active =
              item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                component={RouterNavLink}
                to={item.to}
                end={item.end}
                label={item.label}
                leftSection={<item.icon size={18} stroke={1.5} />}
                active={active}
                onClick={() => opened && toggle()}
                mb={4}
              />
            );
          })}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
}
