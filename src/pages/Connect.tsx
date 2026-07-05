import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBrandCloudflare,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconLock,
  IconPlus,
  IconShieldLock,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cliCheck, cliLogin } from '../api/client';
import { CLI_PROVIDERS, type CliProvider } from '../api/providers';
import { useConnection } from '../context/ConnectionContext';
import { errorMessage } from '../lib/ui';

interface HeaderRow {
  name: string;
  value: string;
}

type AuthMode = 'manual' | 'cli';

function formatExpiry(unixSeconds: number | null): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toLocaleString();
}

/** Split a textarea (one argument per line) into a trimmed, non-empty list. */
function parseArgs(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function Connect() {
  const { connect, connected } = useConnection();
  const navigate = useNavigate();

  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<AuthMode>('manual');
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // CLI-login provider state (the editable command IS the provider; presets seed it).
  const [presetId, setPresetId] = useState(CLI_PROVIDERS[0].id);
  const preset = useMemo(
    () => CLI_PROVIDERS.find((p) => p.id === presetId) ?? CLI_PROVIDERS[0],
    [presetId],
  );
  const [binary, setBinary] = useState(preset.binary);
  const [header, setHeader] = useState(preset.header);
  const [valueTemplate, setValueTemplate] = useState(preset.valueTemplate);
  const [loginArgsText, setLoginArgsText] = useState(preset.loginArgs.join('\n'));
  const [tokenArgsText, setTokenArgsText] = useState(preset.tokenArgs.join('\n'));
  const [showAdvanced, setShowAdvanced] = useState(!!preset.custom);
  const [accessUrl, setAccessUrl] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [binaryFound, setBinaryFound] = useState<boolean | null>(null);

  // If a session already exists (e.g. after a reload), go straight in.
  useEffect(() => {
    if (connected) navigate('/', { replace: true });
  }, [connected, navigate]);

  // Seed the editable command fields whenever the preset changes.
  useEffect(() => {
    setBinary(preset.binary);
    setHeader(preset.header);
    setValueTemplate(preset.valueTemplate);
    setLoginArgsText(preset.loginArgs.join('\n'));
    setTokenArgsText(preset.tokenArgs.join('\n'));
    setShowAdvanced(!!preset.custom);
    setExpiresAt(null);
  }, [preset]);

  // Check whether the CLI binary is on PATH (only in CLI mode).
  useEffect(() => {
    if (mode !== 'cli' || !binary.trim()) {
      setBinaryFound(null);
      return;
    }
    let cancelled = false;
    setBinaryFound(null);
    const t = setTimeout(() => {
      cliCheck(binary.trim()).then((ok) => {
        if (!cancelled) setBinaryFound(ok);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mode, binary]);

  const resolveProvider = (): CliProvider => ({
    binary: binary.trim(),
    loginArgs: parseArgs(loginArgsText),
    tokenArgs: parseArgs(tokenArgsText),
    header: header.trim(),
    valueTemplate: valueTemplate.trim() || '{token}',
    url: accessUrl.trim() || baseUrl.trim(),
  });

  const cliReady =
    binary.trim() !== '' &&
    header.trim() !== '' &&
    (accessUrl.trim() !== '' || baseUrl.trim() !== '');

  const updateHeader = (index: number, patch: Partial<HeaderRow>) =>
    setHeaders((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const addHeader = () => setHeaders((rows) => [...rows, { name: '', value: '' }]);

  const removeHeader = (index: number) =>
    setHeaders((rows) => rows.filter((_, i) => i !== index));

  const addWarpPreset = () =>
    setHeaders((rows) => {
      const existing = new Set(rows.map((r) => r.name.toLowerCase()));
      const rowsToAdd: HeaderRow[] = [];
      if (!existing.has('cf-access-client-id'))
        rowsToAdd.push({ name: 'CF-Access-Client-Id', value: '' });
      if (!existing.has('cf-access-client-secret'))
        rowsToAdd.push({ name: 'CF-Access-Client-Secret', value: '' });
      return [...rows, ...rowsToAdd];
    });

  const handleLogin = async () => {
    setError(null);
    setLoggingIn(true);
    try {
      const result = await cliLogin(resolveProvider());
      setExpiresAt(result.expiresAt);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoggingIn(false);
    }
  };

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'cli') {
        await connect(baseUrl, apiKey, [], resolveProvider());
      } else {
        await connect(
          baseUrl,
          apiKey,
          headers.filter((h) => h.name.trim() !== ''),
          null,
        );
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const expiry = formatExpiry(expiresAt);

  return (
    <Center mih="100vh" p="lg">
      <Card withBorder shadow="sm" radius="lg" p="xl" w={600} maw="100%">
        <Stack gap="lg">
          <Stack gap={4} align="center">
            <IconShieldLock size={40} stroke={1.5} />
            <Title order={2}>Hanko Admin</Title>
            <Text c="dimmed" size="sm" ta="center">
              Connect to a Hanko Admin API to manage users, sessions, webhooks
              and more.
            </Text>
          </Stack>

          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              title="Could not connect"
            >
              {error}
            </Alert>
          )}

          <form onSubmit={submit}>
            <Stack gap="md">
              <TextInput
                label="Admin API base URL"
                placeholder="http://localhost:8001"
                description="Self-hosted (e.g. http://localhost:8001) or Cloud (e.g. https://<tenant>.hanko.io/admin)"
                required
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.currentTarget.value)}
                autoFocus
              />

              <PasswordInput
                label="API key (optional)"
                placeholder="Your Admin API bearer token"
                description="Sent as an Authorization: Bearer header. Leave blank if access is gated by an access proxy."
                leftSection={<IconLock size={16} />}
                value={apiKey}
                onChange={(e) => setApiKey(e.currentTarget.value)}
              />

              <Divider label="Access proxy authentication" labelPosition="left" />

              <SegmentedControl
                fullWidth
                value={mode}
                onChange={(v) => setMode(v as AuthMode)}
                data={[
                  { label: 'Manual headers', value: 'manual' },
                  { label: 'CLI login', value: 'cli' },
                ]}
              />

              {mode === 'manual' ? (
                <ManualHeaders
                  headers={headers}
                  onAdd={addHeader}
                  onRemove={removeHeader}
                  onUpdate={updateHeader}
                  onWarpPreset={addWarpPreset}
                />
              ) : (
                <Stack gap="sm">
                  <Select
                    label="Provider"
                    data={CLI_PROVIDERS.map((p) => ({
                      value: p.id,
                      label: p.label,
                    }))}
                    value={presetId}
                    onChange={(v) => v && setPresetId(v)}
                    allowDeselect={false}
                  />
                  <Text size="xs" c="dimmed">
                    {preset.description}
                  </Text>

                  <Group grow align="flex-start">
                    <TextInput
                      label="CLI binary"
                      placeholder="e.g. cloudflared"
                      value={binary}
                      onChange={(e) => setBinary(e.currentTarget.value)}
                      rightSection={
                        binaryFound === null ? null : binaryFound ? (
                          <Tooltip label="Found on PATH">
                            <IconCheck size={16} color="var(--mantine-color-teal-6)" />
                          </Tooltip>
                        ) : (
                          <Tooltip label="Not found on PATH">
                            <IconX size={16} color="var(--mantine-color-red-6)" />
                          </Tooltip>
                        )
                      }
                    />
                    <TextInput
                      label="Access application URL"
                      placeholder="Defaults to the base URL"
                      value={accessUrl}
                      onChange={(e) => setAccessUrl(e.currentTarget.value)}
                    />
                  </Group>

                  <Button
                    variant="subtle"
                    size="xs"
                    w="fit-content"
                    px={4}
                    leftSection={
                      showAdvanced ? (
                        <IconChevronDown size={14} />
                      ) : (
                        <IconChevronRight size={14} />
                      )
                    }
                    onClick={() => setShowAdvanced((s) => !s)}
                  >
                    Edit command
                  </Button>

                  {showAdvanced && (
                    <Stack gap="sm">
                      <Textarea
                        label="Login command arguments"
                        description="One argument per line. {url} is replaced with the Access application URL."
                        autosize
                        minRows={3}
                        value={loginArgsText}
                        onChange={(e) => setLoginArgsText(e.currentTarget.value)}
                        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                      />
                      <Textarea
                        label="Token command arguments"
                        description="Run non-interactively on each refresh; must print the token to stdout."
                        autosize
                        minRows={3}
                        value={tokenArgsText}
                        onChange={(e) => setTokenArgsText(e.currentTarget.value)}
                        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                      />
                      <Group grow align="flex-start">
                        <TextInput
                          label="Header name"
                          placeholder="e.g. cf-access-token"
                          value={header}
                          onChange={(e) => setHeader(e.currentTarget.value)}
                        />
                        <TextInput
                          label="Header value template"
                          description="{token} is the CLI output"
                          placeholder="{token}"
                          value={valueTemplate}
                          onChange={(e) => setValueTemplate(e.currentTarget.value)}
                        />
                      </Group>
                      <Alert
                        icon={<IconAlertTriangle size={16} />}
                        color="yellow"
                        variant="light"
                        p="xs"
                      >
                        <Text size="xs">
                          Connecting will run this local command to obtain a
                          token. Only use binaries and arguments you trust.
                        </Text>
                      </Alert>
                    </Stack>
                  )}

                  <Group justify="space-between" align="center">
                    <Button
                      variant="light"
                      leftSection={<IconBrandCloudflare size={16} />}
                      loading={loggingIn}
                      disabled={!cliReady || parseArgs(loginArgsText).length === 0}
                      onClick={handleLogin}
                    >
                      Log in
                    </Button>
                    {loggingIn ? (
                      <Group gap={6}>
                        <Loader size="xs" />
                        <Text size="xs" c="dimmed">
                          Complete the login in your browser…
                        </Text>
                      </Group>
                    ) : expiresAt !== null ? (
                      <Badge color="teal" variant="light" size="lg">
                        {expiry ? `Logged in · expires ${expiry}` : 'Logged in'}
                      </Badge>
                    ) : null}
                  </Group>
                  <Text size="xs" c="dimmed">
                    You can log in here, or connect directly if the CLI already
                    has a valid cached token. The token is fetched by the CLI and
                    refreshed automatically; it is never stored on disk by this
                    app.
                  </Text>
                </Stack>
              )}

              <Button
                type="submit"
                loading={submitting}
                disabled={mode === 'cli' && !cliReady}
                size="md"
                mt="xs"
              >
                Connect
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                Credentials are kept in memory for this session only and are
                never saved to disk. See the{' '}
                <Anchor
                  href="https://github.com/teamhanko/hanko"
                  target="_blank"
                  size="xs"
                >
                  Hanko docs
                </Anchor>
                .
              </Text>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Center>
  );
}

function ManualHeaders({
  headers,
  onAdd,
  onRemove,
  onUpdate,
  onWarpPreset,
}: {
  headers: HeaderRow[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<HeaderRow>) => void;
  onWarpPreset: () => void;
}) {
  return (
    <Stack gap="xs">
      {headers.length === 0 && (
        <Text size="xs" c="dimmed">
          Add headers required by an access proxy in front of your Hanko
          instance (e.g. Cloudflare Access service tokens).
        </Text>
      )}
      {headers.map((row, i) => (
        <Group key={i} gap="xs" wrap="nowrap">
          <TextInput
            placeholder="Header name"
            value={row.name}
            onChange={(e) => onUpdate(i, { name: e.currentTarget.value })}
            style={{ flex: '0 0 40%' }}
          />
          <TextInput
            placeholder="Value"
            value={row.value}
            onChange={(e) => onUpdate(i, { value: e.currentTarget.value })}
            style={{ flex: 1 }}
          />
          <Tooltip label="Remove header">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onRemove(i)}
              aria-label="Remove header"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ))}
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={onAdd}
        >
          Add header
        </Button>
        <Tooltip label="Adds empty CF-Access-Client-Id / CF-Access-Client-Secret rows">
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconShieldLock size={14} />}
            onClick={onWarpPreset}
          >
            Cloudflare Access / WARP
          </Button>
        </Tooltip>
      </Group>
    </Stack>
  );
}
