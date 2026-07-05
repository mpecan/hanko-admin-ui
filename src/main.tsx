import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionProvider } from './context/ConnectionContext';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ConnectionProvider>
            <ModalsProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ModalsProvider>
          </ConnectionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </MantineProvider>
  </React.StrictMode>,
);
