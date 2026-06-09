# openslate

A self-hosted markdown note-taking app. Fast, simple, private. Access your notes from any device.

**Single user only.** No sign-ups, no sharing, no complexity. Just notes.

## Deploy

### Docker (local)

```bash
git clone https://github.com/MrSheerluck/openslate
cd openslate
cp .env.example .env     # set JWT_SECRET
docker compose up -d     # open http://localhost:8080
```

### DigitalOcean VPS

**Recommended:** Build the image on your machine (the $4 droplet has too little RAM to compile Rust), push to GitHub Container Registry (free), then pull on the VPS:

```bash
# On your machine
docker buildx build --platform linux/amd64 -t ghcr.io/you/openslate:latest --push .

# On the VPS (after Docker is installed)
git clone https://github.com/MrSheerluck/openslate /opt/openslate
cd /opt/openslate
cp .env.example .env && sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
sed -i 's#build: .#image: ghcr.io/you/openslate:latest#' docker-compose.yml
echo "your-token" | docker login ghcr.io -u you --password-stdin
docker compose up -d
```

**Custom domain:** Add `DOMAIN=notes.example.com` to `.env`, point an A record to your IP, restart. Caddy auto-provisions HTTPS.

Full step-by-step guide: [docs/deployment.md](docs/deployment.md)

---

## Features

- **Rich text editing**. Tiptap editor with markdown support, syntax highlighting, tables, task lists
- **Tags**. Organize notes with tags, filter by tag
- **Keyboard shortcuts**. Cmd+Shift+P command palette, full keyboard nav
- **Full-text search**. Search across all notes instantly (SQLite FTS5)
- **Media**. Upload images and files, stored in Cloudflare R2 (optional)
- **Six themes**. Light, dark, sepia, nord, monokai, tokyo-night
- **Simple auth**. Single password, log in from any device (JWT cookies)
- **Self-contained**. One Docker container, SQLite database

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit + Tailwind CSS + Tiptap |
| Backend | Rust (Axum) |
| Database | SQLite |
| Auth | JWT (httpOnly cookies) |
| Media | Cloudflare R2 (optional) |
| Reverse proxy | Caddy (auto HTTPS) |

---

## Documentation

- [Setup Guide](docs/setup.md). Prerequisites, env vars, running without Docker
- [Architecture](docs/architecture.md). Project structure, data flow, design decisions
- [Features](docs/features.md). Editor, tags, search, media, themes
- [API Reference](docs/api-reference.md). Full REST API docs
- [Deployment](docs/deployment.md). Docker, VPS, custom domain + HTTPS

---

## Development

```bash
# Backend
cd api && cargo run

# Frontend (separate terminal)
cd web && bun run dev
```

---

## LICENSE

MIT
