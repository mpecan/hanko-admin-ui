// Declarative CLI credential providers. Adding support for another login CLI
// is just another entry here — or the user can pick "Custom…" and fill the
// fields in. `{url}` in the arg templates is substituted with the Access
// application URL, and `{token}` in the value template with the CLI's output,
// both by the Rust backend.

/** Config sent to the Rust `connect`/`cli_login` commands. */
export interface CliProvider {
  binary: string;
  loginArgs: string[];
  tokenArgs: string[];
  header: string;
  valueTemplate: string;
  url: string;
}

/** A selectable preset shown on the Connection screen. */
export interface CliProviderPreset {
  id: string;
  label: string;
  description: string;
  binary: string;
  loginArgs: string[];
  tokenArgs: string[];
  header: string;
  valueTemplate: string;
  /** When true, the command fields start expanded and empty for editing. */
  custom?: boolean;
}

export const CLI_PROVIDERS: CliProviderPreset[] = [
  {
    id: 'cloudflared',
    label: 'Cloudflare Access (cloudflared)',
    description:
      'Logs in through your identity provider in the browser and injects a cf-access-token header on every request.',
    binary: 'cloudflared',
    loginArgs: ['access', 'login', '--no-verbose', '--auto-close', '{url}'],
    tokenArgs: ['access', 'token', '--app', '{url}'],
    header: 'cf-access-token',
    valueTemplate: '{token}',
  },
  {
    id: 'gcloud-iap',
    label: 'Google Cloud IAP (gcloud)',
    description:
      'Uses a gcloud identity token as a Bearer credential for an IAP-protected backend. Add --audiences=<OAuth client ID> to the token command for your IAP resource.',
    binary: 'gcloud',
    loginArgs: ['auth', 'login'],
    tokenArgs: ['auth', 'print-identity-token'],
    header: 'Proxy-Authorization',
    valueTemplate: 'Bearer {token}',
  },
  {
    id: 'custom',
    label: 'Custom…',
    description:
      'Describe any login CLI that prints a token to stdout. Use {url} in the arguments and {token} in the header value template.',
    binary: '',
    loginArgs: [],
    tokenArgs: [],
    header: 'Authorization',
    valueTemplate: 'Bearer {token}',
    custom: true,
  },
];
