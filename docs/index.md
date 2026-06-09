# OpenSlate Documentation

OpenSlate is a self-hosted markdown note-taking app. Fast, simple, private. Access your notes from any device.

**Single user only.** No sign-ups, no sharing, no complexity. Just notes.

## Getting Started

- [Deployment](deployment.md). Docker, VPS, custom domain + HTTPS
- [Setup Guide](setup.md). Prerequisites, environment variables, running without Docker
- [Architecture](architecture.md). Project structure, data flow, design decisions
- [Features](features.md). Editor, tags, search, media, themes, shortcuts
- [API Reference](api-reference.md). Full REST API endpoint documentation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit + Tailwind CSS + Tiptap |
| Backend | Rust (Axum) |
| Database | SQLite (via SQLx) |
| Auth | JWT in httpOnly cookie |
| Media | Cloudflare R2 (optional) |
| Reverse proxy | Caddy (auto HTTPS) |

## Quick Links

- [Contributing Guide](../CONTRIBUTING.md)
- [Project Roadmap](../roadmap.md)
- [License](../LICENSE)
