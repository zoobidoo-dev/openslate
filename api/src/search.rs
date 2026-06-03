use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Deserialize)]
pub struct SearchParams {
    q: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct SearchResult {
    id: String,
    title: String,
    slug: String,
    created_at: String,
    updated_at: String,
    title_highlight: Option<String>,
    content_snippet: Option<String>,
}

pub async fn search_notes(
    State(db): State<SqlitePool>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<SearchResult>>, StatusCode> {
    let query = params.q.trim();
    if query.is_empty() {
        return Ok(Json(vec![]));
    }

    let results = sqlx::query_as::<_, SearchResult>(
        "SELECT n.id, n.title, n.slug, n.created_at, n.updated_at,
                highlight(notes_fts, 1, '<mark>', '</mark>') as title_highlight,
                snippet(notes_fts, 2, '<mark>', '</mark>', '...', 64) as content_snippet
         FROM notes_fts
         JOIN notes n ON n.id = notes_fts.id
         WHERE notes_fts MATCH ?
         ORDER BY rank
         LIMIT 20",
    )
    .bind(query)
    .fetch_all(&db)
    .await
    .unwrap_or_default();

    Ok(Json(results))
}
