# Hanko Admin

[![CI](https://github.com/mpecan/hanko-admin-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/mpecan/hanko-admin-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](./LICENSE)

A cross-platform desktop console for administering a [Hanko](https://github.com/teamhanko/hanko)
installation — self-hosted or Hanko Cloud — built with **Tauri 2**, **React**, and **Mantine**.

On launch you connect to a Hanko **Admin API** by providing a base URL, an
optional Bearer API key, and access-proxy authentication (manual headers or an
automated CLI login). Credentials live **only in the Rust process memory** for
the session and are **never written to disk**.

## Features

- **Connection screen** — base URL, optional API key, and access-proxy
  authentication:
  - _Manual headers_ — a repeatable header editor with a one-click Cloudflare
    Access / WARP service-token preset.
  - _CLI login_ — automated, **pluggable** login through an external CLI
    (cloudflared ships as a preset; any token-printing CLI can be described in
    config or via the "Custom…" option). See [Access-proxy providers](#access-proxy-providers).
- **Dashboard** — Admin API health, user count, webhook and audit-log totals.
- **Users** — paginated, filterable list; create and delete users.
- **User detail** — tabs for Overview (profile edit + delete), Emails
  (add/remove/set-primary), Metadata (public/private/unsafe JSON), Sessions
  (list/revoke/create token), Passkeys (WebAuthn), Password, and OTP.
- **Audit logs** — filter by event type, actor email, and free-text search.
- **Webhooks** — create, edit (events + enabled), and delete.
- **Metrics** — raw Prometheus output, copyable.

## Architecture

All HTTP to the Admin API goes through a single Rust command, `admin_request`.
The webview never holds the API key: the Rust side keeps the session in managed
state, injects the `Authorization: Bearer` header (only when a key is set) plus
any custom or provider headers, and performs the request with `reqwest`. This
keeps secrets out of JavaScript and sidesteps CORS.

- `src-tauri/src/session.rs` — session state + request execution (unit-tested).
- `src-tauri/src/commands.rs` — `connect`, `disconnect`, `is_connected`,
  `connection_info`, `admin_request`, `cli_check`, `cli_login`.
- `src-tauri/src/provider.rs` — pluggable CLI credential providers (unit-tested).
- `src/api/` — typed TypeScript client (`client.ts`, `endpoints.ts`, `types.ts`)
  and the provider registry (`providers.ts`).
- `src/pages/`, `src/components/` — Mantine UI, TanStack Query, React Router.

### Access-proxy providers

Many deployments sit behind an access proxy (e.g. Cloudflare Access). Hanko
Admin can obtain the proxy token for you by running an external CLI, then inject
it as a header on every request (refreshing it automatically, retrying once on a
`401`).

Providers are **declarative** — a new one is usually just an entry in
`src/api/providers.ts`:

```ts
{
  binary: 'cloudflared',
  loginArgs: ['access', 'login', '--no-verbose', '--auto-close', '{url}'],
  tokenArgs: ['access', 'token', '--app', '{url}'],
  header: 'cf-access-token',
  valueTemplate: '{token}', // e.g. 'Bearer {token}' for Authorization-style headers
}
```

`{url}` is replaced with the Access application URL and `{token}` with the CLI's
output. The **Custom…** option in the UI lets you configure any token-printing
CLI without editing code. Tokens are fetched by the CLI and kept only in memory.

## Development

This project uses [mise](https://mise.jdx.dev) to pin toolchains and run tasks.
You'll also need the [Tauri system prerequisites](https://tauri.app/start/prerequisites/)
for your platform.

```bash
mise install      # install the pinned Node + Rust toolchains
mise run install  # install frontend dependencies
mise run dev      # launch the desktop app
```

Common tasks (`mise tasks` lists them all):

```bash
mise run test     # Rust unit tests + frontend type-check
mise run check    # everything CI runs: format check, lint, tests, build
mise run bundle   # production desktop app (installers/binaries)
```

Not using mise? The equivalents are `npm install`, `npm run tauri dev`,
`npm run build`, `npm run tauri build`, and
`cargo test --manifest-path src-tauri/Cargo.toml`.

## Security notes

- The API key, custom-header values, and CLI-provider tokens are held in memory
  by the Rust process only; `connection_info` returns the base URL and header
  *names* but never values. Disconnecting clears (and zeroizes) the key.
- No secrets are written to `localStorage`, `sessionStorage`, or disk.
- CLI providers run a user-configured local binary — only configure providers
  you trust. See [SECURITY.md](./SECURITY.md).

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for
setup, conventions, and the PR process, and note our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Matjaž Pečan
