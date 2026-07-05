//! Pluggable CLI credential providers.
//!
//! A `CliProvider` describes, declaratively, how to obtain an auth token from an
//! external CLI (e.g. `cloudflared access token`) and which header to inject it
//! as. The provider is generic: any tool that logs in and prints a token to
//! stdout can be described by config alone — cloudflared is just the first
//! preset shipped by the frontend.

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::Engine;
use serde::{Deserialize, Serialize};

/// Declarative description of an external login CLI.
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CliProvider {
    /// Executable to run, e.g. "cloudflared".
    pub binary: String,
    /// Args for the interactive login step. `{url}` is substituted.
    pub login_args: Vec<String>,
    /// Args for the (non-interactive) token refresh step. `{url}` is substituted.
    pub token_args: Vec<String>,
    /// Header the token is injected as, e.g. "cf-access-token".
    pub header: String,
    /// Template for the header value; `{token}` is replaced with the CLI output.
    /// Defaults to the raw token (`{token}`). Use e.g. `Bearer {token}` for
    /// Authorization-style headers.
    #[serde(default)]
    pub value_template: Option<String>,
    /// The Access application URL the CLI authenticates against.
    pub url: String,
}

/// Apply a provider's value template to a raw token.
pub fn format_value(template: Option<&str>, token: &str) -> String {
    match template {
        Some(t) if t.contains("{token}") => t.replace("{token}", token),
        _ => token.to_string(),
    }
}

/// A token obtained from a provider, with its parsed expiry (if any).
#[derive(Clone)]
pub struct CachedToken {
    pub header: String,
    pub value: String,
    pub expires_at: Option<SystemTime>,
}

impl CachedToken {
    /// Whether the token is still usable, leaving a 30s clock-skew margin.
    pub fn valid(&self) -> bool {
        match self.expires_at {
            Some(exp) => SystemTime::now() + Duration::from_secs(30) < exp,
            None => true, // no exp claim; rely on refresh-on-401 instead
        }
    }
}

/// Result of a login, returned to the frontend to display token status.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    /// Unix-seconds expiry of the token, if the JWT carried an `exp` claim.
    pub expires_at: Option<u64>,
}

/// Substitute `{url}` in each arg template.
pub fn substitute(args: &[String], url: &str) -> Vec<String> {
    args.iter().map(|a| a.replace("{url}", url)).collect()
}

/// Parse the `exp` claim (unix seconds) from a JWT without verifying it.
pub fn jwt_expiry(token: &str) -> Option<SystemTime> {
    let payload = token.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload.trim())
        .ok()?;
    let claims: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    let exp = claims.get("exp")?.as_u64()?;
    Some(UNIX_EPOCH + Duration::from_secs(exp))
}

/// Run a CLI and return its trimmed stdout, or a friendly error on failure.
pub async fn run_cli(binary: &str, args: &[String], timeout: Duration) -> Result<String, String> {
    let run = tokio::process::Command::new(binary)
        .args(args)
        .kill_on_drop(true)
        .output();

    let output = tokio::time::timeout(timeout, run)
        .await
        .map_err(|_| format!("`{binary}` timed out after {}s.", timeout.as_secs()))?
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                format!("`{binary}` was not found. Is it installed and on your PATH?")
            } else {
                format!("Failed to run `{binary}`: {e}")
            }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let msg = stderr.trim();
        return Err(if msg.is_empty() {
            format!("`{binary}` exited with a non-zero status.")
        } else {
            format!("`{binary}` failed: {msg}")
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Build a `CachedToken` from a raw CLI token: expiry parsed from the raw JWT,
/// value formatted via the provider's template.
fn wrap_token(provider: &CliProvider, raw: &str) -> CachedToken {
    CachedToken {
        header: provider.header.clone(),
        value: format_value(provider.value_template.as_deref(), raw),
        expires_at: jwt_expiry(raw),
    }
}

/// Fetch a fresh token via the provider's token command and wrap it.
pub async fn fetch_token(provider: &CliProvider) -> Result<CachedToken, String> {
    let token = run_cli(
        &provider.binary,
        &substitute(&provider.token_args, &provider.url),
        Duration::from_secs(30),
    )
    .await?;
    if token.is_empty() {
        return Err(format!("`{}` returned an empty token.", provider.binary));
    }
    Ok(wrap_token(provider, &token))
}

/// Run the interactive login command (opens a browser) and wrap the token.
pub async fn login(provider: &CliProvider) -> Result<CachedToken, String> {
    let token = run_cli(
        &provider.binary,
        &substitute(&provider.login_args, &provider.url),
        Duration::from_secs(300),
    )
    .await?;
    if token.is_empty() {
        return Err(format!(
            "`{}` did not return a token after login.",
            provider.binary
        ));
    }
    Ok(wrap_token(provider, &token))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn substitutes_url_placeholder() {
        let args = vec![
            "access".to_string(),
            "token".to_string(),
            "--app".to_string(),
            "{url}".to_string(),
        ];
        assert_eq!(
            substitute(&args, "https://x.hanko.io/admin"),
            vec!["access", "token", "--app", "https://x.hanko.io/admin"]
        );
    }

    #[test]
    fn formats_header_value() {
        // No template → raw token.
        assert_eq!(format_value(None, "abc"), "abc");
        // Bearer-style template.
        assert_eq!(format_value(Some("Bearer {token}"), "abc"), "Bearer abc");
        // Template without placeholder → raw token (avoids dropping the token).
        assert_eq!(format_value(Some("static"), "abc"), "abc");
    }

    #[test]
    fn parses_jwt_exp_claim() {
        // Header {"alg":"HS256"} . Payload {"exp":4102444800} . sig
        // 4102444800 = 2100-01-01T00:00:00Z
        let token = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2ln";
        let exp = jwt_expiry(token).expect("should parse exp");
        let secs = exp.duration_since(UNIX_EPOCH).unwrap().as_secs();
        assert_eq!(secs, 4_102_444_800);
    }

    #[test]
    fn missing_exp_yields_none() {
        // Payload {"sub":"abc"} has no exp.
        let token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhYmMifQ.c2ln";
        assert!(jwt_expiry(token).is_none());
    }

    #[test]
    fn cached_token_validity() {
        let future = CachedToken {
            header: "cf-access-token".into(),
            value: "t".into(),
            expires_at: Some(SystemTime::now() + Duration::from_secs(3600)),
        };
        assert!(future.valid());

        let past = CachedToken {
            header: "cf-access-token".into(),
            value: "t".into(),
            expires_at: Some(SystemTime::now()),
        };
        assert!(!past.valid());

        let no_exp = CachedToken {
            header: "cf-access-token".into(),
            value: "t".into(),
            expires_at: None,
        };
        assert!(no_exp.valid());
    }
}
