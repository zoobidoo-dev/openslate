# Setup Guide

This guide covers running OpenSlate without Docker (for development or bare-metal). For the easiest setup, use Docker; see [Deployment](deployment.md).

## Prerequisites

- **Rust** (latest stable). [rustup.rs](https://rustup.rs/)
- **Bun** v1.x. [bun.sh](https://bun.sh/) (or Node.js + npm)
- **Cloudflare R2** account (optional, only needed for media uploads)

## Clone and Install

```bash
git clone https://github.com/MrSheerluck/openslate.git
cd openslate
```

## Backend Setup

### 1. Configure environment variables

```bash
cp api/.env.example api/.env
```

Edit `api/.env` and fill in the values:

| Variable | Description |
|----------|------------|
| `DATABASE_URL` | SQLite path. Default: `sqlite:data.db?mode=rwc` |
| `HOST` | Bind address. Default: `0.0.0.0` |
| `PORT` | Server port. Default: `3001` |
| `FRONTEND_URL` | Frontend origin for CORS. Default: `http://localhost:5173` |
| `JWT_SECRET` | Random string for signing JWT tokens. Generate with `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | Password for login (only used on first run) |
| `R2_BUCKET` | Cloudflare R2 bucket name (optional) |
| `R2_ACCOUNT_ID` | Cloudflare account ID (optional) |
| `R2_ACCESS_KEY` | R2 access key (optional) |
| `R2_SECRET_KEY` | R2 secret key (optional) |

> R2 credentials are optional. Leave them commented out to disable media uploads; notes, search, and themes still work.

### 2. Run the backend

```bash
cd api
cargo run
```

The API starts on `http://localhost:3001`. Verify with:

```bash
curl http://localhost:3001/api/health
# → {"status":"ok"}
```

On first run, SQLite migrations run automatically. The database file (`data.db`) is created in the `api/` directory.

## Frontend Setup

### 1. Configure environment

```bash
cp web/.env.example web/.env
```

The default value (`VITE_API_URL=http://localhost:3001`) points at the local backend.

### 2. Install dependencies and run

```bash
cd web
bun install
bun run dev
```

The frontend starts on `http://localhost:5173`. Open it in your browser, log in with the password from `api/.env`.

## Quick start: Docker

```bash
cp .env.example .env
# set JWT_SECRET in .env
docker compose up -d
```

Browse to `http://localhost:8080`. See [Deployment](deployment.md) for full guide.

## Project Structure

```
openslate/
├── api/                # Rust backend
│   ├── src/            # Source code (routes, auth, db)
│   ├── migrations/     # SQL migrations (auto-run on startup)
│   ├── .env.example    # Environment template
│   └── Cargo.toml
├── web/                # SvelteKit frontend
│   ├── src/
│   │   ├── lib/        # Shared modules (api client, auth, theme, components)
│   │   └── routes/     # SvelteKit pages
│   ├── .env.example
│   └── package.json
└── docs/               # Documentation
```
