import { Navigate, Route, Routes } from 'react-router-dom';

import { ConnectionGuard } from './components/ConnectionGuard';
import { Layout } from './components/Layout';
import { AuditLogs } from './pages/AuditLogs';
import { Connect } from './pages/Connect';
import { Dashboard } from './pages/Dashboard';
import { Metrics } from './pages/Metrics';
import { UserDetail } from './pages/UserDetail';
import { Users } from './pages/Users';
import { Webhooks } from './pages/Webhooks';

export default function App() {
  return (
    <Routes>
      <Route path="/connect" element={<Connect />} />
      <Route element={<ConnectionGuard />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route path="metrics" element={<Metrics />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
