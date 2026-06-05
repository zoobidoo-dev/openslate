use axum::{Json, extract::State, http::StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::SqlitePool;

#[derive(Deserialize)]
pub struct UpdatePreferences {
    pub theme: Option<String>,
}

pub async fn get_preferences(State(db): State<SqlitePool>) -> Result<Json<Value>, StatusCode> {
    let rows: Vec<(String, String)> = sqlx::query_as("SELECT key, value FROM preferences")
        .fetch_all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut map = serde_json::Map::new();
    for (key, value) in rows {
        map.insert(key, Value::String(value));
    }

    Ok(Json(Value::Object(map)))
}

pub async fn update_preferences(
    State(db): State<SqlitePool>,
    Json(body): Json<UpdatePreferences>,
) -> Result<Json<Value>, StatusCode> {
    if let Some(theme) = &body.theme {
        sqlx::query("INSERT OR REPLACE INTO preferences (key, value) VALUES ('theme', ?)")
            .bind(theme)
            .execute(&db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    Ok(Json(json!({ "success": true })))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn setup_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("failed to create pool");

        sqlx::query(
            "CREATE TABLE preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_set_and_get_theme() {
        let db = setup_db().await;

        let _ = update_preferences(
            State(db.clone()),
            Json(UpdatePreferences {
                theme: Some("dark".into()),
            }),
        )
        .await
        .unwrap();

        let prefs = get_preferences(State(db)).await.unwrap();
        assert_eq!(prefs.get("theme").unwrap(), &json!("dark"));
    }

    #[tokio::test]
    async fn test_get_empty_preferences() {
        let db = setup_db().await;
        let prefs = get_preferences(State(db)).await.unwrap();
        assert!(prefs.as_object().unwrap().is_empty());
    }
}
