# @giancarlosgza/blog-deploy

Provisions a blog site (or any Nuxt app built with the starters' Dockerfile and CI) on a Docker VPS with
nginx and certbot: the port, the nginx site, the TLS certificate, the server deploy script, the production
env file and service account, and the repository's GitHub variables and secrets. Every command can be
rerun: it only changes what differs.

```bash
npx blog-deploy check            # read-only: what is missing
npx blog-deploy site --dry-run   # what `site` would change
npx blog-deploy site             # port, deploy.sh, nginx, TLS, GitHub variables
npx blog-deploy secrets          # env file, service account, GitHub secrets
npx blog-deploy inventory        # read-only overview of the server
```

Run it from the site's repository. It needs `ssh <alias>` to work without a prompt (on Windows, load the
key in the ssh-agent service; the system OpenSSH is used because Git Bash's `ssh` cannot reach that agent)
and the GitHub CLI signed in (`gh auth login`).

## Claude Code skill

`skill/deploy-site` is a [Claude Code](https://claude.com/claude-code) skill that runs this workflow:
it reads `check`, proposes `site` with a dry run first, explains missing secrets and DNS records without
opening secret files, and reads the CI runs. Install it once per machine:

```bash
cp -r node_modules/@giancarlosgza/blog-deploy/skill/deploy-site ~/.claude/skills/
```

Then ask Claude Code to deploy the site, or run `/deploy-site`, from the site's repo.

## The site: `deploy/site.env`

Committed with the site; it has no secrets.

```bash
CONTAINER=my-blog-prod                 # container name, also names the nginx site and the server files
DOMAIN=example.com                     # main domain
ALIASES=www.example.com                # optional: names that redirect to DOMAIN
SSH_HOST=my-vps                        # ~/.ssh/config alias of the server
IMAGE_REPOSITORY=you/my-blog           # Docker Hub repository the CI pushes to
PORT=3004                              # optional: written by `site` when it picks a free port
EMAIL=you@example.com                  # optional: Let's Encrypt contact when the server has no account yet
```

## Secrets

Never committed. Each site's files are read from the repo first, where `.gitignore` and `.dockerignore`
already exclude them, then from `~/.webservices/<container>/` (or `BLOG_DEPLOY_SECRETS`) for anyone who
prefers to keep production values outside every repo:

| File | In the repo | Or |
| :--- | :--- | :--- |
| Production env file | `.env.production` (e.g. `cp .env .env.production`, then the production URLs) | `~/.webservices/<container>/.env` |
| Firebase service account key | `service-account.json` | `~/.webservices/<container>/service-account.json` |

The values every site shares live only in `~/.webservices/secrets.env`:

```bash
DOCKER_USER=you                # Docker Hub user
DOCKER_PASS=dckr_pat_...       # Docker Hub access token with Read & Write
CI_SSH_KEY=~/.ssh/deploy_key   # private key the CI deploys with (its public key in the server's authorized_keys)
```

`secrets` checks the env file against the repo's `.env.example` (missing keys, URLs still on localhost) and the
key file, uploads both to `~/webservices/<container>.env` and `~/webservices/<container>-service-account.json`
with mode 600 (skipped when the checksums already match), and sets `DOCKER_USER`, `DOCKER_PASS`, `SSH_KEY`,
`SSH_HOST`, `SSH_USER` and `SSH_PORT` on the repository; the SSH values come from `ssh -G <alias>`. Values go
through stdin and are never printed: the output shows key names, project ids and checksums only.

## What `site` does on the server

- **Port:** keeps the site's current port, or takes the next free one from 3000 (listening ports, ports in
  nginx sites and published container ports all count) and saves it as `PORT`.
- **Deploy script:** installs `server/deploy.sh` as `~/webservices/deploy.sh`, the script the CI runs:
  pulls the image, replaces the container, waits for its `HEALTHCHECK`, rolls back to the previous image if
  it does not become healthy, then removes the site's older images (it keeps the running one and the
  previous one). Containers listen on `127.0.0.1` only, so the bare port is not reachable from outside,
  and keep at most 3 log files of 10 MB. The service account is mounted only when
  `~/webservices/<container>-service-account.json` exists, so apps without the Admin SDK can use it too:
  `deploy.sh <image:tag> <container> <port>` from any CI.
- **nginx:** creates `/etc/nginx/sites-available/<container>` (proxy to `127.0.0.1:<port>`, aliases
  redirected to the main domain), enables it and reloads nginx; a failing `nginx -t` removes it again.
- **TLS:** once every name resolves to the server, runs `certbot --nginx --redirect`. Until then it reports
  the DNS records to change; rerun it after the change.
- **GitHub variables:** `IMAGE_REPOSITORY`, `DEPLOY_CONTAINER` and `DEPLOY_PORT`, which the CI's deploy job reads.

The server needs Docker, nginx, certbot and curl, and an SSH user that is root or has passwordless sudo.
