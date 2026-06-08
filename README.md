# openslate

A self-hosted markdown note-taking app. Fast, simple, private. Access your notes from any device.

**Single user only.** No sign-ups, no sharing, no complexity. Just notes.

## Features

- **Rich text editing** - Tiptap editor with markdown support, syntax highlighting, tables, task lists
- **Tags** - Organize notes with tags, filter by tag
- **Keyboard shortcuts** - Cmd+Shift+P command palette, full keyboard nav
- **Full-text search** - Search across all notes instantly (SQLite FTS5)
- **Media** - Upload images and files, stored in Cloudflare R2
- **Six themes** - Light, dark, sepia, nord, monokai, tokyo-night
- **Simple auth** - Single password, log in from any device (JWT cookies)
- **Self-contained** - One binary + SQLite

## Stack

- **Frontend:** SvelteKit + Tailwind CSS + Tiptap
- **Backend:** Rust (Axum)
- **Database:** SQLite
- **Auth:** JWT via httpOnly cookies
- **Media:** Cloudflare R2

## Documentation

Full documentation is in the [docs/](docs/index.md) directory:

- [Setup Guide](docs/setup.md) — Prerequisites, env vars, running locally
- [Architecture](docs/architecture.md) — Project structure, data flow, design decisions
- [Features](docs/features.md) — Editor, tags, search, media, themes
- [API Reference](docs/api-reference.md) — Full REST API docs
- [Deployment](docs/deployment.md) — Coming soon

## Development

```bash
cd api && cargo run
```

```bash
cd web && bun run dev
```

## LICENSE
MIT
