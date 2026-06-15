# CLAUDE.md — working notes for this fork

Personal fork of **OpenSlate** (upstream: `github.com/MrSheerluck/openslate`), self-hosted by the owner.
This file gives any Claude Code session the project's workflow and conventions.
It is a **fork-only** file — never include it in an upstream PR.

## What this is
OpenSlate: self-hosted, single-user markdown notes app.
Stack: **Rust (Axum)** API + **SvelteKit** frontend + **SQLite** + **Caddy**, all in one Docker container.
Deployed live for the owner's personal use.

## Git: fork + upstream workflow
Remotes (on the owner's primary machine):
- `origin`   → this fork (`zoobidoo-dev/openslate`) — push here
- `upstream` → `MrSheerluck/openslate` — pull from / PR to

Three flows:
1. **Add a private feature** → branch off `main`, build, merge to `main`, `git push origin main` (auto-deploys).
2. **Pull upstream updates** → `git fetch upstream && git merge upstream/main && git push origin main`.
3. **Contribute to upstream** → branch off `upstream/main`, fix ONLY the issue, push to `origin`, open PR → `MrSheerluck:main` with `Fixes #NNN`.

## Customization conventions (IMPORTANT)
- Private features **stay in this fork; never PR'd upstream**.
- Put custom code in **NEW files** under `custom/` dirs (`web/src/lib/custom/`, `api/src/custom/`) — new files never conflict on upstream merges.
- When a custom change must go **inside a shared upstream file**, keep it tiny (ideally just a hook calling your new file) and wrap it:
  ```
  // zoobidoo:start — why this exists
  ...
  // zoobidoo:end
  ```
  List every customization with: `grep -rn "zoobidoo:" .`
- **Upstream contributions are the opposite:** clean, native code in upstream's style, branched off `upstream/main`, with **NO** `zoobidoo:` markers and **NO** `custom/` folder.

## Commit preference
Before committing, **give the owner the commit message + the exact command — they run the commit/push themselves.**
Do not run `git commit` / `git push` for them unless explicitly told to. (Writing/editing files is fine.)

## Deploy (auto-update) architecture
Push to fork `main` → GitHub Actions (`.github/workflows/ci.yml`, authenticates to GHCR with the built-in `GITHUB_TOKEN`) builds & pushes a Docker image to `ghcr.io/zoobidoo-dev/openslate:latest` → a 2-minute cron on the droplet pulls it → live at **https://notes.zoobidoo.dev**.
Server/SSH/secret details are configured on the owner's primary machine (intentionally **not** in this repo).

## Local development
```bash
cd api && cargo run        # backend on :3001
cd web && bun run dev      # frontend on :5173
```
```bash
docker compose up -d       # full app on :8080 (first build compiles Rust — slow)
```
