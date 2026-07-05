//! In-memory session state and the low-level Hanko Admin API request logic.
//!
//! Secrets (the API key and any custom headers) live ONLY here, in the Rust
//! process memory, for the lifetime of a connection. They are never written to
//! disk and never handed back to the webview.

use std::collections::BTreeMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use crate::provider::{CachedToken, CliProvider};

/// A single connection to a Hanko Admin API.
pub struct Session {
    /// Base URL of the Admin API, with any trailing slash removed
    /// (e.g. `http://localhost:8001` or `https://<tenant>.hanko.io/admin`).
    pub base_url: String,
    /// Bearer API key. Zeroized on drop.
    pub api_key: String,
    /// Extra headers to send with every request (e.g. Cloudflare Access / WARP).
    pub headers: Vec<(String, String)>,
    /// Optional CLI credential provider (e.g. cloudflared) supplying a dynamic
    /// header whose token is refreshed on demand.
    pub provider: Option<CliProvider>,
}

impl Drop for Session {
    fn drop(&mut self) {
        self.api_key.zeroize();
    }
}

/// Managed Tauri state: the shared HTTP client and current session, if connected.
pub struct AppState {
    /// Reused across all requests so the connection pool and TLS config stay warm.
    pub client: reqwest::Client,
    pub session: Mutex<Option<Session>>,
    /// Most-recent provider token, reused until it nears expiry.
    pub token_cache: Mutex<Option<CachedToken>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            client: build_client(),
            session: Mutex::new(None),
            token_cache: Mutex::new(None),
        }
    }
}

/// Non-secret view of the current connection, safe to return to the frontend.
#[derive(Serialize, Clone)]
pub struct ConnectionInfo {
    pub base_url: String,
    /// Header *names* only — values are withheld because they may be secrets.
    pub header_names: Vec<String>,
}

/// Response of the generic proxy, shaped for easy consumption in TypeScript.
#[derive(Serialize)]
pub struct ProxyResponse {
    pub status: u16,
    pub ok: bool,
    /// Response headers, lower-cased keys. Duplicate headers are comma-joined.
    pub headers: BTreeMap<String, String>,
    /// Parsed JSON body when the response is JSON, otherwise `null`.
    pub json: Option<serde_json::Value>,
    /// Raw body text (always populated).
    pub text: String,
}

/// Body of an `admin_request` call from the frontend.
#[derive(Deserialize)]
pub struct RequestArgs {
    pub method: String,
    /// Path beginning with `/`, e.g. `/users`.
    pub path: String,
    #[serde(default)]
    pub query: Vec<(String, String)>,
    #[serde(default)]
    pub body: Option<serde_json::Value>,
}

/// Normalize a base URL by trimming trailing slashes.
pub fn normalize_base_url(base_url: &str) -> String {
    base_url.trim().trim_end_matches('/').to_string()
}

/// Join a normalized base URL with a request path.
pub fn join_url(base_url: &str, path: &str) -> String {
    if path.is_empty() || path == "/" {
        // The status endpoint lives at the base root.
        format!("{base_url}/")
    } else if path.starts_with('/') {
        format!("{base_url}{path}")
    } else {
        format!("{base_url}/{path}")
    }
}

/// Apply the bearer key and custom headers to a request builder.
pub fn apply_auth(
    mut req: reqwest::RequestBuilder,
    api_key: &str,
    headers: &[(String, String)],
) -> reqwest::RequestBuilder {
    // The API key is optional: some deployments gate the Admin API purely via
    // an access proxy (e.g. Cloudflare Access / WARP) or leave it unauthenticated.
    if !api_key.trim().is_empty() {
        req = req.bearer_auth(api_key);
    }
    for (name, value) in headers {
        if !name.trim().is_empty() {
            req = req.header(name, value);
        }
    }
    req
}

/// Parse an HTTP method string into a `reqwest::Method`.
pub fn parse_method(method: &str) -> Result<reqwest::Method, String> {
    method
        .parse::<reqwest::Method>()
        .map_err(|_| format!("Invalid HTTP method: {method}"))
}

/// Execute a request against the Hanko Admin API and collect a `ProxyResponse`.
///
/// Returns `Err` only on a transport-level failure (DNS, TLS, connection
/// refused, timeout). HTTP error statuses (4xx/5xx) are returned as a normal
/// `ProxyResponse` so the frontend can surface the Admin API error payload.
pub async fn execute(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
    extra_headers: &[(String, String)],
    args: &RequestArgs,
) -> Result<ProxyResponse, String> {
    let method = parse_method(&args.method)?;
    let url = join_url(base_url, &args.path);

    let mut req = client.request(method, &url);
    if !args.query.is_empty() {
        req = req.query(&args.query);
    }
    req = apply_auth(req, api_key, extra_headers);
    if let Some(body) = &args.body {
        req = req.json(body);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Request to {url} failed: {e}"))?;

    let status = resp.status();

    let mut headers: BTreeMap<String, String> = BTreeMap::new();
    for (name, value) in resp.headers().iter() {
        let key = name.as_str().to_ascii_lowercase();
        let val = value.to_str().unwrap_or("").to_string();
        headers
            .entry(key)
            .and_modify(|existing| {
                existing.push_str(", ");
                existing.push_str(&val);
            })
            .or_insert(val);
    }

    let content_type = headers
        .get("content-type")
        .cloned()
        .unwrap_or_default()
        .to_ascii_lowercase();

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    let json = if content_type.contains("application/json") && !text.is_empty() {
        serde_json::from_str::<serde_json::Value>(&text).ok()
    } else {
        None
    };

    Ok(ProxyResponse {
        status: status.as_u16(),
        ok: status.is_success(),
        headers,
        json,
        text,
    })
}

/// Build the shared reqwest client used for all Admin API calls.
pub fn build_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(concat!("hanko-admin/", env!("CARGO_PKG_VERSION")))
        .build()
        .expect("failed to build HTTP client")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_trailing_slashes() {
        assert_eq!(
            normalize_base_url("http://localhost:8001/"),
            "http://localhost:8001"
        );
        assert_eq!(
            normalize_base_url("http://localhost:8001///"),
            "http://localhost:8001"
        );
        assert_eq!(normalize_base_url("  http://x/admin  "), "http://x/admin");
    }

    #[test]
    fn joins_paths() {
        assert_eq!(join_url("http://x/admin", "/users"), "http://x/admin/users");
        assert_eq!(join_url("http://x/admin", "/"), "http://x/admin/");
        assert_eq!(join_url("http://x/admin", ""), "http://x/admin/");
        assert_eq!(join_url("http://x", "users"), "http://x/users");
    }

    #[tokio::test]
    async fn sends_bearer_and_custom_headers_with_query() {
        let server = httpmock::MockServer::start_async().await;
        let mock = server
            .mock_async(|when, then| {
                when.method(httpmock::Method::GET)
                    .path("/users")
                    .query_param("page", "2")
                    .header("authorization", "Bearer secret-key")
                    .header("cf-access-client-id", "cf-id");
                then.status(200)
                    .header("content-type", "application/json")
                    .header("x-total-count", "42")
                    .body("[]");
            })
            .await;

        let client = build_client();
        let args = RequestArgs {
            method: "GET".into(),
            path: "/users".into(),
            query: vec![("page".into(), "2".into())],
            body: None,
        };
        let headers = vec![("CF-Access-Client-Id".to_string(), "cf-id".to_string())];

        let resp = execute(&client, &server.base_url(), "secret-key", &headers, &args)
            .await
            .expect("request should succeed");

        mock.assert_async().await;
        assert_eq!(resp.status, 200);
        assert!(resp.ok);
        assert_eq!(
            resp.headers.get("x-total-count").map(String::as_str),
            Some("42")
        );
        assert!(resp.json.is_some());
    }

    #[tokio::test]
    async fn omits_authorization_header_when_key_is_empty() {
        let server = httpmock::MockServer::start_async().await;
        let mock = server
            .mock_async(|when, then| {
                when.method(httpmock::Method::GET)
                    .path("/")
                    .matches(|req| {
                        // No Authorization header must be present.
                        req.headers
                            .as_ref()
                            .map(|h| {
                                !h.iter()
                                    .any(|(k, _)| k.eq_ignore_ascii_case("authorization"))
                            })
                            .unwrap_or(true)
                    })
                    .header("cf-access-client-id", "cf-id");
                then.status(200).body("ok");
            })
            .await;

        let client = build_client();
        let args = RequestArgs {
            method: "GET".into(),
            path: "/".into(),
            query: vec![],
            body: None,
        };
        let headers = vec![("CF-Access-Client-Id".to_string(), "cf-id".to_string())];

        let resp = execute(&client, &server.base_url(), "", &headers, &args)
            .await
            .expect("request should succeed without an API key");

        mock.assert_async().await;
        assert_eq!(resp.status, 200);
    }

    #[tokio::test]
    async fn error_status_is_returned_not_erred() {
        let server = httpmock::MockServer::start_async().await;
        server
            .mock_async(|when, then| {
                when.method(httpmock::Method::GET).path("/users");
                then.status(401)
                    .header("content-type", "application/json")
                    .body(r#"{"code":401,"message":"unauthorized"}"#);
            })
            .await;

        let client = build_client();
        let args = RequestArgs {
            method: "GET".into(),
            path: "/users".into(),
            query: vec![],
            body: None,
        };

        let resp = execute(&client, &server.base_url(), "bad", &[], &args)
            .await
            .expect("HTTP errors must not be transport errors");

        assert_eq!(resp.status, 401);
        assert!(!resp.ok);
        assert_eq!(resp.json.unwrap()["message"], "unauthorized");
    }
}
