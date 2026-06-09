use axum::{Json, extract::Request, http::StatusCode, middleware::Next, response::Response};
use axum_extra::extract::cookie::{Cookie, CookieJar};
use jsonwebtoken::{DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};
use serde_json::json;
use time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
}

pub fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").expect("JWT_SECRET must be set")
}

pub async fn logout(jar: CookieJar) -> (CookieJar, Json<serde_json::Value>) {
    let cookie = Cookie::build(("token", ""))
        .path("/")
        .http_only(true)
        .max_age(Duration::seconds(0))
        .build();

    (jar.add(cookie), Json(json!({ "success": true })))
}

pub async fn auth_middleware(
    cookie_jar: CookieJar,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = cookie_jar
        .get("token")
        .map(|c| c.value().to_string())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let secret = jwt_secret();

    decode::<Claims>(
        &token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(next.run(request).await)
}

pub async fn me() -> Json<serde_json::Value> {
    Json(json!({ "authenticated": true }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Router, body::Body, middleware, routing::get};
    use http::header;
    use jsonwebtoken::{EncodingKey, Header, encode};
    use serial_test::serial;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tower::ServiceExt;

    fn now_secs() -> usize {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize
    }

    fn make_valid_token(secret: &str) -> String {
        let claims = Claims {
            sub: "test".to_string(),
            exp: now_secs() + 3600,
            iat: now_secs(),
        };
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap()
    }

    fn test_app() -> Router {
        Router::new()
            .route("/", get(|| async { StatusCode::OK }))
            .layer(middleware::from_fn(auth_middleware))
    }

    #[tokio::test]
    #[serial]
    async fn test_me_returns_authenticated() {
        let response = me().await;
        assert_eq!(response.0.get("authenticated"), Some(&json!(true)));
    }

    // #107
    #[tokio::test]
    #[serial]
    async fn auth_middleware_returns_401_when_no_cookie() {
        unsafe { std::env::set_var("JWT_SECRET", "test_secret") };
        let response = test_app()
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // #108
    #[tokio::test]
    #[serial]
    async fn auth_middleware_returns_401_when_token_invalid() {
        unsafe { std::env::set_var("JWT_SECRET", "test_secret") };
        let response = test_app()
            .oneshot(
                Request::builder()
                    .uri("/")
                    .header(header::COOKIE, "token=not.a.valid.jwt")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // #109
    #[tokio::test]
    #[serial]
    async fn auth_middleware_passes_with_valid_jwt() {
        let secret = "test_secret";
        unsafe { std::env::set_var("JWT_SECRET", secret) };
        let token = make_valid_token(secret);
        let response = test_app()
            .oneshot(
                Request::builder()
                    .uri("/")
                    .header(header::COOKIE, format!("token={token}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // #110
    #[tokio::test]
    #[serial]
    async fn logout_clears_auth_cookie() {
        let app = Router::new().route("/logout", axum::routing::post(logout));
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/logout")
                    .method("POST")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let set_cookie = response
            .headers()
            .get(header::SET_COOKIE)
            .expect("Set-Cookie header should be present")
            .to_str()
            .unwrap();
        assert!(set_cookie.contains("token="), "cookie name should be token");
        assert!(
            set_cookie.contains("Max-Age=0"),
            "max_age should be 0 to expire the cookie"
        );
    }
}
