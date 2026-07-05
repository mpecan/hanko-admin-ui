import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet } from 'react-router-dom';

import { useConnection } from '../context/ConnectionContext';

/** Redirects to /connect unless a session is established. */
export function ConnectionGuard() {
  const { connected, loading } = useConnection();

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!connected) {
    return <Navigate to="/connect" replace />;
  }

  return <Outlet />;
}
