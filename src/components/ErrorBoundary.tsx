import { Alert, Button, Code, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconRefresh } from '@tabler/icons-react';
import { Component, type ReactNode } from 'react';

interface Props {
  /** What to render normally. */
  children: ReactNode;
  /** Optional label naming the area that failed (e.g. "Webhooks"). */
  label?: string;
  /** Called when the user clicks "Try again", in addition to clearing state. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
  showDetails: boolean;
}

/**
 * Catches render/runtime errors in its subtree and shows a recoverable
 * message instead of letting the error unmount the whole app. Placed around
 * page content so the surrounding shell (menu/header) always stays mounted.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface the failure for debugging; also visible in the UI below.
    console.error('ErrorBoundary caught an error:', error, info);
  }

  reset = () => {
    this.setState({ error: null, showDetails: false });
    this.props.onReset?.();
  };

  render() {
    const { error, showDetails } = this.state;
    if (!error) return this.props.children;

    const title = this.props.label
      ? `Something went wrong in ${this.props.label}`
      : 'Something went wrong';

    return (
      <Alert
        icon={<IconAlertTriangle size={18} />}
        color="red"
        variant="light"
        title={title}
        radius="md"
      >
        <Stack gap="sm" mt={4}>
          <Text size="sm">
            This page hit an unexpected error and could not be displayed. The
            rest of the app is still usable — you can retry, or switch to
            another section from the menu.
          </Text>

          <Text size="sm" fw={500} c="red">
            {error.message || String(error)}
          </Text>

          <Group gap="xs">
            <Button
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={this.reset}
            >
              Try again
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              rightSection={<IconChevronDown size={14} />}
              onClick={() =>
                this.setState((s) => ({ showDetails: !s.showDetails }))
              }
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </Button>
          </Group>

          {showDetails && (
            <Code
              block
              style={{ maxHeight: 260, overflow: 'auto', fontSize: 11 }}
            >
              {error.stack || error.message}
            </Code>
          )}
        </Stack>
      </Alert>
    );
  }
}
