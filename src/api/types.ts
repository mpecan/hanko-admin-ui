// TypeScript models mirroring the Hanko Admin API (openapi-admin.yaml v1.2.0).

export type UUID = string;

export interface ConnectionInfo {
  base_url: string;
  header_names: string[];
}

/** Raw proxy response returned by the Rust `admin_request` command. */
export interface ProxyResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  json: unknown | null;
  text: string;
}

/** Admin API error payload ({ code, message }). */
export interface ApiError {
  code: number;
  message: string;
}

export interface Username {
  id: UUID;
  created_at: string;
  updated_at: string;
  username: string;
}

export interface Email {
  id: UUID;
  address: string;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebAuthnCredential {
  id: UUID;
  name?: string;
  public_key: string;
  attestation_type: string;
  aaguid: string;
  transports?: string[];
  created_at: string;
  last_used_at?: string;
  backup_eligible: boolean;
  backup_state: boolean;
  mfa_only: boolean;
}

export interface Identity {
  id: UUID;
  email_id: UUID;
  provider_id: string;
  provider_name: string;
  created_at: string;
  updated_at: string;
}

export interface PasswordCredential {
  id: UUID;
  created_at: string;
  updated_at: string;
}

export interface OtpSecret {
  id: UUID;
  created_at: string;
}

export interface UserMetadata {
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
  unsafe_metadata?: Record<string, unknown>;
}

export interface UserBase {
  id: UUID;
  created_at: string;
  updated_at: string;
  webauthn_credentials?: WebAuthnCredential[];
  emails?: Email[];
  username?: Username | null;
}

export interface User extends UserBase {
  otp?: OtpSecret | null;
  password?: PasswordCredential | null;
  identities?: Identity[];
  metadata?: UserMetadata;
}

export interface Session {
  id: UUID;
  user_id: UUID;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
  last_used: string;
  expires_at?: string;
}

export interface CreateSessionResponse {
  session_token: string;
}

export interface Webhook {
  id?: UUID;
  callback: string;
  enabled?: boolean;
  failures?: number;
  expires_at?: string;
  events: string[] | { id: string; event: string }[];
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: UUID;
  type: string;
  error?: string;
  meta_http_request_id: string;
  meta_source_ip: string;
  meta_user_agent: string;
  actor_user_id?: UUID;
  actor_email?: string;
  created_at: string;
  updated_at?: string;
}

/** Input for creating a user. */
export interface CreateUserInput {
  id?: UUID;
  emails: { address: string; is_primary: boolean; is_verified?: boolean }[];
  username?: string;
  created_at?: string;
}

/** Patch payload for updating a user. `null` clears a field. */
export interface PatchUserInput {
  username?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
}

/** The full set of webhook event triggers (openapi enum). */
export const WEBHOOK_EVENTS = [
  'user',
  'user.login',
  'user.create',
  'user.delete',
  'user.update',
  'user.update.email',
  'user.update.email.create',
  'user.update.email.delete',
  'user.update.email.primary',
  'user.update.username',
  'user.update.username.create',
  'user.update.username.delete',
  'user.update.username.update',
  'email.send',
] as const;

/** The full set of audit-log types (openapi enum). */
export const AUDIT_LOG_TYPES = [
  'user_logged_out',
  'password_set_succeeded',
  'password_set_failed',
  'password_login_succeeded',
  'password_login_failed',
  'passcode_login_init_succeeded',
  'passcode_login_init_failed',
  'passcode_login_final_succeeded',
  'passcode_login_final_failed',
  'webauthn_registration_init_succeeded',
  'webauthn_registration_init_failed',
  'webauthn_registration_final_succeeded',
  'webauthn_registration_final_failed',
  'webauthn_authentication_init_succeeded',
  'webauthn_authentication_init_failed',
  'webauthn_authentication_final_succeeded',
  'webauthn_authentication_final_failed',
  'webauthn_credential_updated',
  'webauthn_credential_deleted',
  'thirdparty_signup_succeeded',
  'thirdparty_signin_succeeded',
  'thirdparty_linking_succeeded',
  'thirdparty_signin_signup_failed',
  'token_exchange_succeeded',
  'token_exchange_failed',
  'user_created',
  'email_created',
  'email_verified',
  'email_deleted',
  'primary_email_changed',
  'user_deleted',
  'login_success',
  'login_failure',
  'otp_created',
  'passkey_created',
  'passkey_deleted',
  'security_key_created',
  'username_changed',
  'username_deleted',
  'password_changed',
  'password_deleted',
] as const;
