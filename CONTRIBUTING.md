# Contributing to OpenSlate

Thanks for your interest in contributing! OpenSlate is a self-hosted markdown note-taking app built with SvelteKit (frontend) and Rust/Axum (backend).

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) v1.x (or Node.js + npm)
- SQLite (bundled via libsqlite3-sys)

### Setup

```bash
# Backend
cd api
cp .env.example .env   # create from template (see below)
cargo run              # starts on localhost:3001

# Frontend (in a second terminal)
cd web
bun install
bun run dev            # starts on localhost:5173
```

The API runs on port 3001, the SvelteKit dev server on port 5173 with API requests proxied automatically.

> **Note:** The `.env` files contain secrets like `JWT_SECRET` and `ADMIN_PASSWORD` - never commit real secrets. Always use `.env.example` as a template and keep `.env` in `.gitignore`.

### Environment Variables

Copy `api/.env.example` to `api/.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite database path | `sqlite:data.db` |
| `JWT_SECRET` | Secret for signing JWT tokens | (generate a random string) |
| `ADMIN_PASSWORD` | Password for login | (choose a strong one) |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of password | (auto-generated from ADMIN_PASSWORD) |
| `R2_*` | Cloudflare R2 credentials (optional for dev) | - |

## Project Structure

```
openslate/
├── api/              # Rust backend (Axum + SQLite)
│   ├── migrations/   # SQL migrations
│   ├── src/          # Route handlers and DB logic
│   │   ├── main.rs
│   │   ├── auth.rs
│   │   ├── notes.rs
│   │   ├── search.rs
│   │   ├── media.rs
│   │   ├── preferences.rs
│   │   └── config.rs
│   └── Cargo.toml
├── web/              # SvelteKit frontend
│   └── src/
│       ├── lib/
│       │   ├── api.ts              # API client
│       │   ├── auth.svelte.ts      # Auth state
│       │   ├── theme.svelte.ts     # Theme state
│       │   └── components/         # UI components
│       └── routes/                 # SvelteKit pages
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Code Style

- **Rust:** Follow `cargo fmt` conventions. Use `sqlx::query_as` for typed rows. Prefer `map_err` + `StatusCode` over unwrap/panic in route handlers.
- **TypeScript/Svelte:** Use Svelte 5 Runes (`$state`, `$derived`, `$effect`, `$props`). No classes - use module-level functions and runes. Type everything with TypeScript.
- **CSS:** Tailwind utility classes + CSS custom properties for theming. Don't add new color literals - use theme variables.

## Making Changes

1. **Open an issue first** for bugs or feature requests so we can discuss before you write code.
2. **Fork and branch** - use a descriptive branch name like `fix/search-highlight-encoding` or `feat/tag-endpoints`.
3. **Keep PRs focused** - one feature or fix per PR. Small PRs are reviewed faster.
4. **Test your changes** - verify the app still builds and runs:

```bash
cd api && cargo build      # backend compiles
cd web && bun run check    # frontend type-checks
```

(We don't have automated tests yet - help add them!)

## Pull Request Process

1. Ensure your code compiles (`cargo build`) and type-checks (`bun run check`).
2. Update the roadmap or README if your change affects functionality.
3. PRs need at least one maintainer review before merging.


## Good First Issues

Check the issues labeled `good first issue` for well-scoped starter tasks.

## AI Usage Policy

Using AI assistants (Copilot, ChatGPT, Claude, etc.) is completely fine. However, you are responsible for every change you submit. Make sure you understand what the AI generated, why it works, and that it fits the project's code style. Blindly accepting AI output without review is not acceptable.

## Code of Conduct

Be respectful and constructive. We're building something cool - let's keep it fun for everyone.
