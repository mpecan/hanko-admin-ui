// Typed wrappers for every Hanko Admin API operation, grouped by resource.

import {
  del,
  get,
  getArray,
  getList,
  getOrNull,
  getText,
  patch,
  post,
  put,
} from './client';
import type {
  AuditLog,
  CreateSessionResponse,
  CreateUserInput,
  Email,
  OtpSecret,
  PasswordCredential,
  PatchUserInput,
  Session,
  User,
  UserBase,
  UserMetadata,
  UUID,
  WebAuthnCredential,
  Webhook,
} from './types';

// ---- Status ----
export const status = {
  /** GET / — returns the status HTML/text. */
  get: () => getText('/'),
};

// ---- Users ----
export interface ListUsersParams {
  page?: number;
  per_page?: number;
  user_id?: string;
  email?: string;
  sort_direction?: 'asc' | 'desc';
}

export const users = {
  list: (params: ListUsersParams = {}) =>
    getList<UserBase>('/users', { query: { ...params } }),
  get: (id: UUID) => get<User>(`/users/${id}`),
  create: (input: CreateUserInput) => post<User>('/users', input),
  patch: (id: UUID, input: PatchUserInput) => patch<User>(`/users/${id}`, input),
  remove: (id: UUID) => del(`/users/${id}`),
};

// ---- Emails ----
export const emails = {
  list: (userId: UUID) => getArray<Email>(`/users/${userId}/emails`),
  create: (
    userId: UUID,
    input: { address: string; is_primary?: boolean; is_verified?: boolean },
  ) => post<Email>(`/users/${userId}/emails`, input),
  remove: (userId: UUID, emailId: UUID) =>
    del(`/users/${userId}/emails/${emailId}`),
  setPrimary: (userId: UUID, emailId: UUID) =>
    post<void>(`/users/${userId}/emails/${emailId}/set_primary`),
};

// ---- Metadata ----
export const metadata = {
  get: (userId: UUID) => get<UserMetadata>(`/users/${userId}/metadata`),
  patch: (userId: UUID, input: UserMetadata) =>
    patch<UserMetadata>(`/users/${userId}/metadata`, input),
};

// ---- Sessions ----
export const sessions = {
  list: (userId: UUID) => getArray<Session>(`/users/${userId}/sessions`),
  create: (
    userId: UUID,
    input: { user_agent?: string; ip_address?: string } = {},
  ) =>
    post<CreateSessionResponse>(`/users/${userId}/sessions`, {
      user_id: userId,
      ...input,
    }),
  remove: (userId: UUID, sessionId: UUID) =>
    del(`/users/${userId}/sessions/${sessionId}`),
};

// ---- OTP ----
export const otp = {
  get: (userId: UUID) => getOrNull<OtpSecret>(`/users/${userId}/otp`),
  remove: (userId: UUID) => del(`/users/${userId}/otp`),
};

// ---- WebAuthn credentials ----
export const webauthn = {
  list: (userId: UUID) =>
    getArray<WebAuthnCredential>(`/users/${userId}/webauthn_credentials`),
  get: (userId: UUID, credentialId: UUID) =>
    get<WebAuthnCredential>(
      `/users/${userId}/webauthn_credentials/${credentialId}`,
    ),
  remove: (userId: UUID, credentialId: UUID) =>
    del(`/users/${userId}/webauthn_credentials/${credentialId}`),
};

// ---- Password ----
export const password = {
  get: (userId: UUID) =>
    getOrNull<PasswordCredential>(`/users/${userId}/password`),
  create: (userId: UUID, newPassword: string) =>
    post<void>(`/users/${userId}/password`, { password: newPassword }),
  update: (userId: UUID, newPassword: string) =>
    put<void>(`/users/${userId}/password`, { password: newPassword }),
  remove: (userId: UUID) => del(`/users/${userId}/password`),
};

// ---- Audit logs ----
export interface ListAuditLogsParams {
  page?: number;
  per_page?: number;
  start_time?: string;
  end_time?: string;
  actor_user_id?: string;
  actor_email?: string;
  meta_source_ip?: string;
  q?: string;
  type?: string[];
}

export const auditLogs = {
  list: (params: ListAuditLogsParams = {}) =>
    getList<AuditLog>('/audit_logs', { query: { ...params } }),
};

// ---- Webhooks ----
export const webhooks = {
  list: () => getArray<Webhook>('/webhooks'),
  get: (id: UUID) => get<Webhook>(`/webhooks/${id}`),
  create: (input: { callback: string; events: string[] }) =>
    post<Webhook>('/webhooks', input),
  update: (
    id: UUID,
    input: { callback: string; events: string[]; enabled: boolean },
  ) => put<Webhook>(`/webhooks/${id}`, input),
  remove: (id: UUID) => del(`/webhooks/${id}`),
};

// ---- Metrics ----
export const metrics = {
  get: () => getText('/metrics'),
};
