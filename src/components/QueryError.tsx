import { Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import { errorMessage } from '../lib/ui';

export function QueryError({ error }: { error: unknown }) {
  const message = errorMessage(error);
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      color="red"
      variant="light"
      title="Request failed"
    >
      {message}
    </Alert>
  );
}
