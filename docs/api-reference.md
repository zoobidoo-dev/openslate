# API Reference

Base URL: `http://localhost:3001`

All responses are JSON. Protected routes require a valid JWT cookie (`token`).

---

## Authentication

### `POST /api/auth/login`

Log in with the admin password. Returns a JWT cookie.

**Request body:**
```json
{ "password": "your-password" }
```

**Response** (200):
```json
{ "success": true }
```
Sets httpOnly cookie `token` (30-day expiry).

**Errors:** 401 (wrong password), 500 (server error)

### `POST /api/auth/logout`

Clears the auth cookie.

**Response** (200):
```json
{ "success": true }
```

### `GET /api/auth/me`

*Requires auth.*

Check if the current session is authenticated.

**Response** (200):
```json
{ "authenticated": true }
```

---

## Health

### `GET /api/health`

Check if the server and database are running.

**Response** (200):
```json
{ "status": "ok" }
```
**Errors:** 503 (database unavailable)

---

## Notes

*All notes endpoints require auth.*

### `GET /api/notes`

List all notes, ordered by most recently updated.

**Response** (200):
```json
[
  {
    "id": "uuid",
    "title": "My Note",
    "slug": "my-note",
    "content": "...",
    "tags": ["tag1", "tag2"],
    "created_at": "2026-01-01T00:00:00",
    "updated_at": "2026-01-01T00:00:00"
  }
]
```

### `POST /api/notes`

Create a new note.

**Request body:**
```json
{
  "title": "My Note",
  "content": "Optional content with [[wiki-link]]",
  "tags": ["optional", "tags"]
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "title": "My Note",
  "slug": "my-note",
  "content": "...",
  "tags": ["optional", "tags"],
  "created_at": "2026-01-01T00:00:00",
  "updated_at": "2026-01-01T00:00:00"
}
```

- `title` is required, `content` and `tags` are optional
- Slug is auto-generated from title
- Wiki links (`[[slug]]`) in content are parsed and stored in `note_links`

### `GET /api/notes/{slug}`

Get a single note with tags and backlinks.

**Response** (200):
```json
{
  "id": "uuid",
  "title": "My Note",
  "slug": "my-note",
  "content": "...",
  "tags": ["tag1"],
  "backlinks": [
    { "id": "uuid", "title": "Other Note", "slug": "other-note" }
  ],
  "created_at": "2026-01-01T00:00:00",
  "updated_at": "2026-01-01T00:00:00"
}
```

**Errors:** 404 (note not found)

### `PUT /api/notes/{slug}`

Update a note. All fields optional. Only provided fields are updated.

**Request body:**
```json
{
  "title": "Updated Title",
  "content": "New content with [[wiki-link]]",
  "tags": ["updated", "tags"]
}
```

**Response** (200): Updated note object (same shape as GET).

- Wiki links are re-parsed on every update
- Passing a `tags` array replaces all existing tags for the note

### `DELETE /api/notes/{slug}`

Delete a note.

**Response** (204): No content.

**Errors:** 404 (note not found)

### `POST /api/notes/import`

Import one or many Markdown files (single or multi-file upload).

**Request:** `multipart/form-data`
| Field | Description |
|-------|------------|
| `file` | A `.md` or `.markdown` file (repeatable; one field per file) |

**Response** (200):
```json
{
  "imported": 3,
  "failed": 1,
  "results": [
    { "file": "note-a.md", "slug": "note-a", "title": "Note A", "status": "ok" },
    { "file": "bad.md", "slug": "", "title": "", "status": "error" }
  ]
}
```

- Title is taken from frontmatter `title`, else from the first `# H1`, else from the filename
- Slug is auto-generated from the title and made unique
- Frontmatter `tags` and inline `#hashtags` in the body are merged into the note's tags
- `created_at` / `updated_at` from frontmatter are preserved if present
- Filenames with non-`.md` extensions are rejected (per file, not the whole request)

### `GET /api/notes/export`

Download all notes as a single flat zip file (`openslate-export.zip`).

**Response** (200): `application/zip` containing:
- `README.md` with re-import instructions
- `{slug}.md` for every note (all flat at the zip root, no subfolders)

Each Markdown file has YAML frontmatter with `title`, `slug`, `tags`, `created_at`, `updated_at`, so the export can be re-imported to recreate the full note state.

### `GET /api/notes/export-by-tag`

Download all notes as a single zip file (`openslate-export-by-tag.zip`), organized by tag.

**Response** (200): `application/zip` containing:
- `README.md` with re-import instructions
- `tags/{tag}/{slug}.md` for tagged notes (using the first tag)
- `untagged/{slug}.md` for notes with no tags

Each Markdown file has the same frontmatter shape as the flat export.

---

## Search

*Requires auth.*

### `GET /api/search?q={query}`

Full-text search across all notes using SQLite FTS5.

**Query parameters:**
| Param | Description |
|-------|------------|
| `q` | Search query (required). Supports prefix matching. |

**Response** (200):
```json
[
  {
    "id": "uuid",
    "title": "My Note",
    "slug": "my-note",
    "snippet": "text with <b>match</b> highlighted...",
    "updated_at": "2026-01-01T00:00:00"
  }
]
```

- Results include FTS5 `snippet()` with `<b>` tags around matches
- Empty query returns empty array

---

## Media

*All media endpoints require auth.*

### `GET /api/media`

List media files with optional filters.

**Query parameters:**
| Param | Description |
|-------|------------|
| `type` | Filter by MIME type prefix: `image`, `video`, `pdf` |
| `note_id` | Filter by associated note |
| `q` | Search by filename |

**Response** (200):
```json
[
  {
    "id": "uuid",
    "filename": "abc123.png",
    "original_name": "screenshot.png",
    "mime_type": "image/png",
    "size": 123456,
    "note_id": "uuid-or-null",
    "tags": ["screenshot"],
    "created_at": "2026-01-01T00:00:00"
  }
]
```

### `POST /api/media`

Upload a file to R2.

**Request:** `multipart/form-data`
| Field | Description |
|-------|------------|
| `file` | The file to upload (required) |
| `note_id` | Associate with a note (optional) |
| `tags` | Comma-separated tag names (optional) |

**Response** (201): Created media object (same shape as list item).

### `POST /api/media/from-url`

Import a file from a remote URL.

**Request body:**
```json
{
  "url": "https://example.com/image.png",
  "note_id": "optional-note-uuid",
  "tags": ["optional-tag"]
}
```

**Response** (201): Created media object.

- Downloads the file (30-second timeout)
- Uploads to R2 and creates a database record

### `GET /api/media/{id}`

Get a single media item with tags.

**Response** (200): Media object with tags.

**Errors:** 404 (not found)

### `GET /api/media/{id}/file`

Serve the actual file from R2.

Returns the file with correct `Content-Type` header and the original filename in `Content-Disposition`.

**Errors:** 404 (not found)

### `PUT /api/media/{id}`

Update media metadata.

**Request body:**
```json
{
  "note_id": "uuid-or-null",
  "tags": ["new", "tags"]
}
```

**Response** (200): Updated media object.

- Passing a `tags` array replaces all existing tags

### `DELETE /api/media/{id}`

Delete a media file from R2 and database.

**Response** (204): No content.

**Errors:** 404 (not found)

---

## Preferences

*Requires auth.*

### `GET /api/preferences`

Get all preferences as key-value pairs.

**Response** (200):
```json
{
  "theme": "dark"
}
```

### `PUT /api/preferences`

Update preferences. Currently only `theme` is supported.

**Request body:**
```json
{
  "theme": "nord"
}
```

Valid theme values: `light`, `dark`, `sepia`, `nord`, `monokai`, `tokyo-night`

**Response** (200):
```json
{
  "theme": "nord"
}
```
