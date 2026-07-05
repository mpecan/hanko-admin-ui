//! Tauri commands exposed to the frontend.

use std::time::{Duration, UNIX_EPOCH};

use tauri::State;

use crate::provider::{self, CachedToken, CliProvider, LoginResult};
use crate::session::{self, AppState, ConnectionInfo, ProxyResponse, RequestArgs, Session};

/// A single custom header supplied from the UI.
#[derive(serde::Deserialize)]
pub struct HeaderInput {
    pub name: String,
    pub value: String,
}

fn to_pairs(headers: Vec<HeaderInput>) -> Vec<(String, String)> {
    headers
        .into_iter()
        .filter(|h| !h.name.trim().is_empty())
        .map(|h| (h.name.trim().to_string(), h.value))
        .collect()
}

fn expires_unix(token: &CachedToken) -> Option<u64> {
    token
        .expires_at
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
}

/// Header names to report to the UI: static headers plus the provider header.
fn header_names(headers: &[(String, String)], provider: &Option<CliProvider>) -> Vec<String> {
    let mut names: Vec<String> = headers.iter().map(|(n, _)| n.clone()).collect();
    if let Some(p) = provider {
        names.push(p.header.clone());
    }
    names
}

/// Return the provider header, using the cache when still valid, otherwise
/// refreshing via the provider's token command. `force` bypasses the cache.
async fn provider_header(
    state: &AppState,
    provider: &CliProvider,
    force: bool,
) -> Result<(String, String), String> {
    if !force {
        let guard = state.token_cache.lock().unwrap();
        if let Some(cached) = guard.as_ref() {
            if cached.header == provider.header && cached.valid() {
                return Ok((cached.header.clone(), cached.value.clone()));
            }
        }
    }

    let fresh = provider::fetch_token(provider).await?;
    let pair = (fresh.header.clone(), fresh.value.clone());
    *state.token_cache.lock().unwrap() = Some(fresh);
    Ok(pair)
}

/// Establish a session. Validates connectivity + auth by hitting the status
/// endpoint (`GET /`). Stores the session in memory on success.
#[tauri::command]
pub async fn connect(
    state: State<'_, AppState>,
    base_url: String,
    api_key: String,
    headers: Vec<HeaderInput>,
    provider: Option<CliProvider>,
) -> Result<ConnectionInfo, String> {
    let base_url = session::normalize_base_url(&base_url);
    if base_url.is_empty() {
        return Err("Base URL is required.".into());
    }
    if !base_url.starts_with("http://") && !base_url.starts_with("https://") {
        return Err("Base URL must start with http:// or https://".into());
    }
    // The API key is optional — access may be gated by proxy headers instead.

    let static_headers = to_pairs(headers);

    // Assemble the headers for the probe: static headers plus, if a CLI provider
    // is configured, its (dynamic) token header.
    let mut probe_headers = static_headers.clone();
    if let Some(p) = &provider {
        probe_headers.push(provider_header(state.inner(), p, false).await?);
    }

    let probe = RequestArgs {
        method: "GET".into(),
        path: "/".into(),
        query: vec![],
        body: None,
    };
    let resp = session::execute(&state.client, &base_url, &api_key, &probe_headers, &probe).await?;

    match resp.status {
        401 | 403 => {
            return Err(format!(
                "Authentication failed (HTTP {}). Check the API key and any access headers.",
                resp.status
            ));
        }
        404 => {
            return Err(
                "The status endpoint was not found (HTTP 404). Is the base URL pointing at the Hanko Admin API?"
                    .into(),
            );
        }
        _ => {}
    }

    let info = ConnectionInfo {
        base_url: base_url.clone(),
        header_names: header_names(&static_headers, &provider),
    };

    // Store only the static headers; the provider header is re-fetched per request.
    *state.session.lock().unwrap() = Some(Session {
        base_url,
        api_key,
        headers: static_headers,
        provider,
    });

    Ok(info)
}

/// Clear the current session and any cached token, zeroizing the API key.
#[tauri::command]
pub fn disconnect(state: State<'_, AppState>) {
    *state.session.lock().unwrap() = None;
    *state.token_cache.lock().unwrap() = None;
}

/// Whether a session is currently established.
#[tauri::command]
pub fn is_connected(state: State<'_, AppState>) -> bool {
    state.session.lock().unwrap().is_some()
}

/// Non-secret details about the current connection (base URL + header names).
#[tauri::command]
pub fn connection_info(state: State<'_, AppState>) -> Option<ConnectionInfo> {
    state
        .session
        .lock()
        .unwrap()
        .as_ref()
        .map(|s| ConnectionInfo {
            base_url: s.base_url.clone(),
            header_names: header_names(&s.headers, &s.provider),
        })
}

/// Generic proxy: perform an authenticated request against the Admin API.
#[tauri::command]
pub async fn admin_request(
    state: State<'_, AppState>,
    args: RequestArgs,
) -> Result<ProxyResponse, String> {
    // Extract the session data while holding the lock, then release it before
    // the await point (std Mutex guards are not Send across await).
    let (base_url, api_key, headers, provider) = {
        let guard = state.session.lock().unwrap();
        let session = guard.as_ref().ok_or_else(|| {
            "Not connected. Please connect to a Hanko Admin API first.".to_string()
        })?;
        (
            session.base_url.clone(),
            session.api_key.clone(),
            session.headers.clone(),
            session.provider.clone(),
        )
    };

    let Some(p) = provider else {
        return session::execute(&state.client, &base_url, &api_key, &headers, &args).await;
    };

    let with_token = |token: (String, String)| {
        let mut all = headers.clone();
        all.push(token);
        all
    };

    let token = provider_header(state.inner(), &p, false).await?;
    let resp = session::execute(
        &state.client,
        &base_url,
        &api_key,
        &with_token(token),
        &args,
    )
    .await?;

    // On 401 the token may have expired — refresh once and retry.
    if resp.status == 401 {
        if let Ok(fresh) = provider_header(state.inner(), &p, true).await {
            return session::execute(
                &state.client,
                &base_url,
                &api_key,
                &with_token(fresh),
                &args,
            )
            .await;
        }
    }

    Ok(resp)
}

/// Check whether a CLI binary is available on PATH.
#[tauri::command]
pub async fn cli_check(binary: String) -> bool {
    provider::run_cli(&binary, &["--version".to_string()], Duration::from_secs(10))
        .await
        .is_ok()
}

/// Run the provider's interactive login (opens a browser) and cache the token.
#[tauri::command]
pub async fn cli_login(
    state: State<'_, AppState>,
    provider: CliProvider,
) -> Result<LoginResult, String> {
    let token = provider::login(&provider).await?;
    let expires_at = expires_unix(&token);
    *state.token_cache.lock().unwrap() = Some(token);
    Ok(LoginResult { expires_at })
}
