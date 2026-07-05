# Contributing to Hanko Admin

Thanks for your interest in improving Hanko Admin! This document explains how to
set up your environment, the conventions we follow, and how to get a change
merged.

By participating in this project you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Prerequisites

- **[mise](https://mise.jdx.dev)** (recommended) — pins the Node and Rust
  toolchains and provides the task runner used throughout this guide. Without
  mise you'll need **Node 22+** and a **stable Rust** toolchain yourself.
- **Tauri system dependencies** — see the platform-specific list in the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)
  (WebKitGTK on Linux, Xcode Command Line Tools on macOS, WebView2 on Windows).
- **cloudflared** (optional) — only needed to exercise the Cloudflare Access
  CLI-login provider.

## Getting started

```bash
git clone https://github.com/mpecan/hanko-admin-ui.git
cd hanko-admin-ui

mise install     # install the pinned Node + Rust toolchains
mise run install # install frontend dependencies (npm install)
mise run dev      # launch the desktop app in development mode
```

## Common tasks

All tasks are defined in [`mise.toml`](./mise.toml); run `mise tasks` to list
them.

| Task                | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `mise run dev`      | Launch the desktop app with hot reload                  |
| `mise run build`    | Type-check and build the frontend bundle                |
| `mise run bundle`   | Build the production desktop app (installers/binaries)  |
| `mise run test`     | Run all tests (Rust unit tests + frontend type-check)   |
| `mise run lint:rust`| Lint the Rust code with clippy                          |
| `mise run fmt`      | Format the Rust code                                    |
| `mise run check`    | **Everything CI runs**: format check, lint, tests, build|
| `mise run clean`    | Remove build artifacts                                  |

**Before opening a pull request, run `mise run check` and make sure it passes** —
this is exactly what CI runs.

## Project structure

```
src/                 React + TypeScript frontend (Mantine + TanStack Query)
  api/               Typed Admin API client, endpoints, and provider registry
  components/        Shared UI (Layout, ErrorBoundary, QueryBoundary, …)
  pages/             Screens (Connect, Users, UserDetail tabs, Webhooks, …)
src-tauri/src/       Rust backend
  session.rs         In-memory session state + HTTP request execution
  commands.rs        Tauri commands exposed to the frontend
  provider.rs        Pluggable CLI credential providers (e.g. cloudflared)
```

## Architecture & coding guidelines

- **Secrets stay in Rust.** The API key, custom-header values, and provider
  tokens live only in the Rust process memory for the session and are **never**
  written to disk or returned to the webview. All Admin API HTTP goes through
  the Rust `admin_request` command, which injects credentials server-side (this
  also avoids CORS). Please preserve this invariant — never persist secrets or
  send them to the frontend.
- **Match the surrounding style.** Frontend: functional React components,
  TanStack Query for data, Mantine for UI, small shared helpers in `src/lib`.
  Rust: keep commands thin and put testable logic in plain functions.
- **Add tests** for new backend logic. Rust logic lives behind `#[cfg(test)]`
  modules alongside the code (see `provider.rs` / `session.rs`).
- **Adding a new access-proxy CLI** is usually just a new entry in
  `src/api/providers.ts` — no new code required.
- Keep the code formatted and lint-clean (`mise run fmt`, `mise run lint:rust`).

## Submitting changes

1. Fork the repository and create a branch from `main`
   (`git checkout -b my-change`).
2. Make your change, with tests where it makes sense.
3. Run `mise run check` and ensure it passes.
4. Open a pull request describing **what** changed and **why**. Fill in the PR
   template.
5. CI must be green before review. A maintainer will take it from there.

## Reporting bugs & security issues

- **Bugs / feature requests:** open a GitHub issue with steps to reproduce and,
  for the desktop app, your OS and app version.
- **Security vulnerabilities:** please do **not** open a public issue — see
  [SECURITY.md](./SECURITY.md) for how to report privately.
