use axum::{Json, extract::State, http::StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::SqlitePool;

#[derive(Deserialize)]
pub struct UpdatePreferences {
    pub theme: Option<String>,
}

pub async fn get_preferences(
    State(db): State<SqlitePool>,
) -> Result<Json<Value>, StatusCode> {
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
