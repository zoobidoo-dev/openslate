# Deployment

OpenSlate runs in a single Docker container: Rust backend + SvelteKit frontend + Caddy reverse proxy. SQLite stores all data in a persistent Docker volume.

---

## Option 1: Local Docker

Run entirely on your own machine. No domain, no cloud accounts.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac/Windows) or Docker Engine (Linux)

### Steps

```bash
git clone https://github.com/MrSheerluck/openslate.git
cd openslate
cp .env.example .env
```

Edit `.env` and set a `JWT_SECRET`:

```
JWT_SECRET=your-random-secret-here
```

Start:

```bash
docker compose up -d
```

The first build compiles Rust (10–20 min on Apple Silicon, longer on Intel). Open **http://localhost:8080** and set your admin password on first visit.

### Custom port

```bash
docker compose up -d   # default: http://localhost:8080
```

Or edit `docker-compose.yml` to change the left-hand port number.

### Media uploads (optional)

Add R2 credentials to `.env`:
```
R2_BUCKET=your-bucket
R2_ACCOUNT_ID=your-id
R2_ACCESS_KEY=your-key
R2_SECRET_KEY=your-secret
```

Then restart: `docker compose down && docker compose up -d`.

> **Note for local use:** The repo's `docker-compose.yml` uses `build: .` (local build). For VPS deployments using the GHCR image, edit the compose file to replace `build: .` with `image: ghcr.io/YOUR_USERNAME/openslate:latest`.

---

## Option 2: Cloud VPS

### DigitalOcean

#### Method A: Cloud-init (automatic)

1. Log into [DigitalOcean](https://cloud.digitalocean.com), click **Create → Droplets**.
2. Choose **Ubuntu 24.04 LTS**.
3. Pick the cheapest plan: **$4/mo Basic** (1 vCPU, 512 MB RAM, 10 GB SSD).
4. Scroll to **Advanced Options → User Data** and paste the entire contents of [`scripts/cloud-init.yaml`](../scripts/cloud-init.yaml).
5. Click **Create Droplet**. Wait 3–5 minutes.

Open `http://<droplet-ip>:8080`. On first visit, set your admin password.

> **Note:** The $4 droplet has 512 MB RAM which is **not enough to compile Rust** during `docker build`. The cloud-init script will fail at the build step. See [Solving the RAM problem](#solving-the-ram-problem-on-the-4-droplet) below.

#### Method B: Manual (with GHCR)

Follow the [generic GHCR setup](#setup-with-ghcr-image-recommended-for-any-vps) below.

### Hetzner

**Recommended plan:** CX23 (2 vCPU, 4 GB RAM, 40 GB SSD, ~€5/mo). The 4 GB RAM means you can build directly if you want, but using the GHCR pre-built image is still faster.

1. Create a server at [Hetzner Cloud Console](https://console.hetzner.cloud):
   - Image: **Ubuntu 24.04**
   - Plan: **CX23**
   - Add your SSH key under **Security → SSH Keys** (generate one with `ssh-keygen -t ed25519`)
   - Enable IPv4 (required for public access, ~€0.50/mo extra)

2. SSH into the server:
   ```bash
   ssh root@<server-ip>
   ```

3. Follow the [generic GHCR setup](#setup-with-ghcr-image-recommended-for-any-vps) below.

### Setup with GHCR image (recommended for any VPS)

If your repo has CI/CD set up (GitHub Actions builds and pushes to GHCR on every push to `main`), you can pull the pre-built image directly with no Rust compilation needed.

SSH into your server and run:

```bash
apt update && apt install -y docker.io docker-compose-v2 git
systemctl enable --now docker
git clone https://github.com/YOUR_USERNAME/openslate /opt/openslate
cd /opt/openslate
cp .env.example .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
sed -i 's#build: .#image: ghcr.io/YOUR_USERNAME/openslate:latest#' docker-compose.yml
echo "YOUR_GH_PAT" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
docker compose up -d
```

Open `http://<server-ip>:8080` and set your admin password.

To create a GitHub PAT: **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**. Check `read:packages` scope (only read is needed for pulling).

---

## Custom Domain + HTTPS

### 1. Point DNS

In your domain's DNS provider (Cloudflare, Namecheap, GoDaddy, etc.), add an **A record**:

| Type | Name  | Value             |
|------|-------|-------------------|
| A    | notes | `<server-ip>`    |

This routes `notes.yourdomain.com` to your server. DNS propagation takes 2–5 minutes.

### 2. Update .env on the VPS

```bash
cd /opt/openslate
sed -i 's/DOMAIN=/DOMAIN=notes.yourdomain.com/' .env
```

### 3. Restart

```bash
docker compose down && docker compose up -d
```

Caddy automatically contacts Let's Encrypt, proves you own the domain, and provisions a TLS certificate. No manual cert setup, no renewal cron jobs. Caddy handles everything.

Your app is now at `https://notes.yourdomain.com`.

### How it works

- The entrypoint script detects `DOMAIN` is set and rewrites the Caddy config from `:8080` to `notes.yourdomain.com`.
- Caddy (with a proper domain name) automatically uses ports 80/443 and provisions TLS.
- `docker-compose.yml` already exposes ports 80, 443, and 8080 with no changes needed.
- Caddy stores certificates in `/data/caddy/` (persisted in the Docker volume).

---

## Solving the RAM problem (DigitalOcean $4 droplet only)

The cheapest DigitalOcean droplet (512 MB RAM) cannot compile Rust. The compiler needs 1–2 GB. Hetzner CX23 (4 GB RAM) does not have this issue. Solutions, in order of simplicity:

### 1. Build on your machine, push to registry (recommended)

As shown in [Method B](#method-b-manual-with-docker-hubghcr) above. Build once locally, push to GitHub Container Registry (free for public repos), pull on the VPS. The VPS never compiles anything.

```bash
# Local: build once
docker buildx build --platform linux/amd64 -t ghcr.io/you/openslate:latest --push .

# VPS: just pull
docker compose pull && docker compose up -d
```

### 2. Upgrade to a larger plan

2 GB RAM or more, enough to compile. Simplest approach but costs more per month.

### 3. Use swap space

Add 2 GB of swap as a fallback (much slower builds, but works):

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Environment Variables

All config lives in `/opt/openslate/.env`:

| Variable       | Required | Description                          |
|----------------|----------|--------------------------------------|
| `JWT_SECRET`   | Yes      | Random string for signing auth tokens |
| `DOMAIN`       | No       | Your domain for HTTPS (e.g. `notes.example.com`) |
| `R2_BUCKET`    | No       | Cloudflare R2 bucket for media       |
| `R2_ACCOUNT_ID`| No       | Cloudflare account ID                |
| `R2_ACCESS_KEY`| No       | R2 access key                        |
| `R2_SECRET_KEY`| No       | R2 secret key                        |

After changing any value, run: `docker compose down && docker compose up -d`

---

## Updates

### Option A: Automated (CI + cron job) (recommended)

Once set up, updates are fully hands-off: push to `main` and the VPS updates itself within minutes.

**How it works:**
- A GitHub Actions workflow builds and pushes the Docker image to GHCR on every push to `main`.
- A cron job on the VPS runs every 2 minutes, pulls the latest GHCR image, and restarts the container if a new version was found.

**One-time setup:**

1. Add a GitHub personal access token as a repo secret (so CI can push the image):
   - **GitHub → Repo Settings → Secrets and variables → Actions → New repository secret**
   - Name: `GHCR_PAT`
   - Value: a [classic PAT](https://github.com/settings/tokens) with `read:packages` and `write:packages` scopes.

2. On your VPS, add a cron job that pulls the latest image every 2 minutes:

   ```bash
   (crontab -l 2>/dev/null; echo '*/2 * * * * cd /opt/openslate && docker compose pull openslate && docker compose up -d openslate') | crontab -
   ```

3. On your VPS, edit `/opt/openslate/docker-compose.yml` and replace `build: .` with `image: ghcr.io/YOUR_USERNAME/openslate:latest` so the cron job pulls from GHCR instead of rebuilding locally.

From then on: `git push` to `main` → CI builds & pushes → cron pulls within 2 min → auto-updates. Nothing else needed.

### Option B: Manual (push from your machine)

Build and push from your local machine, then pull on the VPS:

```bash
# On your machine
docker buildx build --platform linux/amd64 -t ghcr.io/you/openslate:latest --push .

# On the VPS
cd /opt/openslate && docker compose pull && docker compose up -d
```

### Option C: Build on VPS (only if you have enough RAM)

```bash
cd /opt/openslate && git pull && docker compose up -d --build
```

Your SQLite database in the Docker volume is preserved across all update methods.

---

## Backups

The SQLite database lives in a Docker volume. Back it up:

```bash
cd /opt/openslate
docker compose exec openslate cp /data/data.db /data/data-backup.db
docker compose cp openslate:/data/data-backup.db ./backup-$(date +%Y%m%d).db
```

Or find the volume location directly:

```bash
docker compose down
cp $(docker volume inspect openslate_data --format '{{.Mountpoint}}')/data.db ./backup.db
docker compose up -d
```

---

## Troubleshooting

**"This site can't be reached"**: Run `docker compose logs --tail 30` and check for errors. Common causes:
- R2 credentials as empty strings (fixed in latest). Update the image.
- Caddyfile error. The entrypoint now handles this.
- Port not exposed. Verify `docker compose ps` shows port mappings.

**Can't log in**: The first visit to the app should show "Set your admin password." You create the account yourself. If you already did, use the same password.

**Build fails on VPS**: Out of memory. See [Solving the RAM problem](#solving-the-ram-problem-on-the-4-droplet).

**Wrong platform error**: `linux/arm64/v8` vs `linux/amd64/v3`. You built on Apple Silicon but need AMD64. Use `--platform linux/amd64` in your build command.

**Media uploads don't work**: Check `docker compose logs | grep -i r2`. Verify all four `R2_*` variables are set in `.env` with non-empty values.
