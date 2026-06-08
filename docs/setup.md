# Setup Guide

This guide walks through setting up OpenSlate for local development.

## Prerequisites

- **Rust** (latest stable) — [rustup.rs](https://rustup.rs/)
- **Bun** v1.x — [bun.sh](https://bun.sh/) (or Node.js + npm, but Bun is preferred)
- **Cloudflare R2** account (required for media uploads)

## Clone and Install

```bash
git clone https://github.com/anomalyco/openslate.git
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
| `ADMIN_PASSWORD_HASH` | bcrypt hash of your password (recommended) |
| `ADMIN_PASSWORD` | Plaintext password — will be hashed at startup if `ADMIN_PASSWORD_HASH` is not set |
| `R2_BUCKET` | Cloudflare R2 bucket name |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY` | R2 access key |
| `R2_SECRET_KEY` | R2 secret key |

> **Note:** R2 credentials are currently required at startup. Media features won't work without them.

To generate a bcrypt hash for `ADMIN_PASSWORD_HASH`:

```bash
# Using htpasswd (Apache tools)
htpasswd -bnBC 12 "" your-password | tr -d ':\n'

# Or use the ADMIN_PASSWORD option instead (simpler for dev)
```

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

On first run, SQLite migrations run automatically — the database file (`data.db`) is created in the `api/` directory.

## Frontend Setup

### 1. Configure environment

```bash
cp web/.env.example web/.env
```

The default value (`VITE_API_URL=http://localhost:3001`) points at the local backend. Adjust if needed.

### 2. Install dependencies and run

```bash
cd web
bun install
bun run dev
```

The frontend starts on `http://localhost:5173`. Open it in your browser — you'll see the login page. Enter the password you configured in the backend `.env`.

## Verifying Everything Works

1. Backend: `curl http://localhost:3001/api/health` returns `{"status":"ok"}`
2. Frontend: `http://localhost:5173` shows the login page
3. Login with your configured password
4. Create a note — it should save and appear in the sidebar
5. Upload an image in the Media tab — it should upload to R2 and appear in the gallery

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
└── docs/               # Documentation (you are here)
```
