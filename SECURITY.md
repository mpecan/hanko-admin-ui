# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately** — do not open a public
GitHub issue.

- Preferred: use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  ("Report a vulnerability" under the repository's **Security** tab).
- Alternatively, email **matjaz.pecan@gmail.com** with details and, if possible,
  a proof of concept.

We will acknowledge your report as soon as we can and keep you informed of the
fix and disclosure timeline.

## Scope & design notes

Hanko Admin is a desktop client for the Hanko Admin API. A few things worth
knowing when assessing security:

- **Secrets are kept in memory only.** The API key, custom-header values, and
  any CLI-provider tokens live in the Rust process for the duration of a session
  and are never written to disk or exposed to the webview. `connection_info`
  returns the base URL and header *names* only — never values.
- **CLI providers execute local commands.** The optional CLI-login feature runs
  a user-configured local binary (e.g. `cloudflared`) to obtain an access token.
  This is intentional and runs Rust-side, but means a malicious provider
  configuration could run an arbitrary local command. Only configure providers
  and binaries you trust.
- **All Admin API traffic is proxied through Rust**, which injects credentials
  server-side and never trusts the webview with them.

Reports about these mechanisms — or ways they can be bypassed — are especially
welcome.
