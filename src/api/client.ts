import { invoke } from '@tauri-apps/api/core';

import type { CliProvider } from './providers';
import type { ApiError, ConnectionInfo, ProxyResponse } from './types';

/** Error thrown when the Admin API returns a non-2xx status. */
export class AdminApiError extends Error {
  status: number;
  code?: number;
  body: unknown;

  constructor(status: number, message: string, code?: number, body?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export interface HeaderInput {
  name: string;
  value: string;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null | string[]>;
  body?: unknown;
}

/** A paged list result: the parsed items plus the total count header. */
export interface Paged<T> {
  items: T[];
  total: number;
}

function buildQueryPairs(
  query: RequestOptions['query'],
): [string, string][] {
  const pairs: [string, string][] = [];
  if (!query) return pairs;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) pairs.push([key, String(v)]);
    } else {
      pairs.push([key, String(value)]);
    }
  }
  return pairs;
}

function errorFromResponse(resp: ProxyResponse): AdminApiError {
  const body = resp.json as Partial<ApiError> | null;
  const message =
    (body && typeof body.message === 'string' && body.message) ||
    resp.text ||
    `Request failed with status ${resp.status}`;
  return new AdminApiError(resp.status, message, body?.code, resp.json);
}

/** Perform a raw request via the Rust proxy, throwing on non-2xx. */
export async function request(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<ProxyResponse> {
  const resp = await invoke<ProxyResponse>('admin_request', {
    args: {
      method,
      path,
      query: buildQueryPairs(opts.query),
      body: opts.body ?? null,
    },
  });
  if (!resp.ok) throw errorFromResponse(resp);
  return resp;
}

/** GET returning parsed JSON of type T. */
export async function get<T>(path: string, opts?: RequestOptions): Promise<T> {
  const resp = await request('GET', path, opts);
  return resp.json as T;
}

/** GET returning T, or null when the resource does not exist (HTTP 404). */
export async function getOrNull<T>(
  path: string,
  opts?: RequestOptions,
): Promise<T | null> {
  try {
    return await get<T>(path, opts);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) return null;
    throw err;
  }
}

/** GET a plain array, coercing any non-array body to `[]`. */
export async function getArray<T>(
  path: string,
  opts?: RequestOptions,
): Promise<T[]> {
  const resp = await request('GET', path, opts);
  return Array.isArray(resp.json) ? (resp.json as T[]) : [];
}

/** GET a list, returning items plus X-Total-Count. */
export async function getList<T>(
  path: string,
  opts?: RequestOptions,
): Promise<Paged<T>> {
  const resp = await request('GET', path, opts);
  const items = Array.isArray(resp.json) ? (resp.json as T[]) : [];
  const totalHeader = resp.headers['x-total-count'];
  const total = totalHeader ? parseInt(totalHeader, 10) : items.length;
  return { items, total: Number.isNaN(total) ? items.length : total };
}

/** GET returning raw text (e.g. Prometheus metrics). */
export async function getText(path: string, opts?: RequestOptions): Promise<string> {
  const resp = await request('GET', path, opts);
  return resp.text;
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const resp = await request('POST', path, { body });
  return resp.json as T;
}

export async function patch<T>(path: string, body?: unknown): Promise<T> {
  const resp = await request('PATCH', path, { body });
  return resp.json as T;
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const resp = await request('PUT', path, { body });
  return resp.json as T;
}

export async function del(path: string): Promise<void> {
  await request('DELETE', path);
}

// ---- Connection lifecycle (Rust-managed session) ----

export function connect(
  baseUrl: string,
  apiKey: string,
  headers: HeaderInput[],
  provider?: CliProvider | null,
): Promise<ConnectionInfo> {
  return invoke<ConnectionInfo>('connect', {
    baseUrl,
    apiKey,
    headers,
    provider: provider ?? null,
  });
}

export function disconnect(): Promise<void> {
  return invoke('disconnect');
}

/** Whether a CLI binary is available on PATH. */
export function cliCheck(binary: string): Promise<boolean> {
  return invoke<boolean>('cli_check', { binary });
}

/** Run a provider's interactive login (opens a browser); resolves on success. */
export function cliLogin(
  provider: CliProvider,
): Promise<{ expiresAt: number | null }> {
  return invoke<{ expiresAt: number | null }>('cli_login', { provider });
}

export function isConnected(): Promise<boolean> {
  return invoke<boolean>('is_connected');
}

export function connectionInfo(): Promise<ConnectionInfo | null> {
  return invoke<ConnectionInfo | null>('connection_info');
}
