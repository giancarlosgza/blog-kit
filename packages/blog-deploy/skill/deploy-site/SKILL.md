---
name: deploy-site
description: Check, provision and deploy a site that uses @giancarlosgza/blog-deploy (repos with deploy/site.env, e.g. the blog-kit starters and sites built from them) on a Docker VPS with nginx and certbot. Use when the user asks to deploy a site, set up its server, check why a deploy is missing or failing, issue its TLS certificate after a DNS change, read its CI deploy, or runs /deploy-site.
---

# Deploy a blog-deploy site

The repo describes its deploy in `deploy/site.env` (container, domain, aliases, `SSH_HOST` alias,
Docker Hub repository, port). `npx blog-deploy` does the work; this skill decides what to run and in what
order, and reads the CI. Run every command from the site's repo root.

If the repo has no `deploy/site.env`, stop and point to the blog-deploy README (keys:
`CONTAINER`, `DOMAIN`, `ALIASES`, `SSH_HOST`, `IMAGE_REPOSITORY`). If `npx blog-deploy` is missing, the repo
needs `npm install -D @giancarlosgza/blog-deploy`.

## Rules

- **Secrets never pass through you.** Never read, print, copy or `cat` `.env.production`, `.env`,
  `service-account.json`, `~/.webservices/**` or `~/.ssh/*` private keys. `npx blog-deploy secrets` moves
  them; the user runs it (suggest typing `! npx blog-deploy secrets` in the prompt). You may run `check`,
  which only reports file names, modes and checksums.
- **Ask before changing anything.** `check` and `--dry-run` are read-only and need no confirmation. Before
  `npx blog-deploy site` without `--dry-run`, show the dry run and get a yes: it writes nginx sites, reloads
  nginx, installs `~/webservices/deploy.sh` and sets GitHub variables.
- **Never push, merge, or re-run CI** unless the user asks. Never run raw server commands that change state
  (docker rm/prune, nginx edits, certbot) outside blog-deploy without showing the command and getting a yes.
- Other sites on the same server are not this skill's business: never touch their containers, nginx files
  or env files.

## Workflow

1. **Status.** Run `npx blog-deploy check` and summarize only the `!!` rows, grouped as:
   - *Site setup* (nginx site, `~/webservices/deploy.sh`, GitHub variables, certificate with DNS ready)
     -> step 2.
   - *Secrets* (local env file or service account, server `.env`/key files, GitHub secrets) -> step 3.
   - *DNS* (names not resolving to the server) -> step 4.
   - *Container* (not deployed, unhealthy, wrong port binding) -> step 5.
   If everything is `ok`, say so and stop.

2. **Site setup.** Run `npx blog-deploy site --dry-run`, show the planned changes, and after a yes run
   `npx blog-deploy site`. Rerun `check` afterwards. If `site` picked a port, `deploy/site.env` changed:
   mention it should be committed.

3. **Secrets.** Tell the user what is missing and how to fix it, without opening any file:
   - Production env: `cp .env .env.production` in the repo, then set the production URLs
     (`NUXT_SITE_URL`, and for admins `NUXT_BLOG_URL`). `secrets` refuses localhost URLs.
   - Service account: the repo's `service-account.json`, or `~/.webservices/<container>/service-account.json`.
   - Shared values in `~/.webservices/secrets.env`: `DOCKER_USER`, `DOCKER_PASS` (Docker Hub access token,
     Read & Write), `CI_SSH_KEY` (path of the key the CI deploys with). Watch for Notepad saving it as
     `secrets.env.txt`.
   Then ask the user to run `npx blog-deploy secrets` (or `--dry-run` first) and rerun `check`.

4. **DNS.** List the A records to create: each name in `DOMAIN` and `ALIASES` pointing at the server IP
   (`check` prints the expected address). Once they resolve, step 2 issues the certificate
   (`site` runs certbot only when every name points at the server). For admins, remind the user to add the
   domain to Firebase Authentication > Settings > Authorized domains.

5. **Deploy and CI.** Deploys happen when CI runs on `main` (lint, image build and push, SSH deploy).
   - Repo: from `git remote get-url origin`. Latest runs: `gh run list --repo <owner/repo> --limit 5`.
     Failure details: `gh run view <id> --repo <owner/repo> --log-failed`.
   - `npm error code ETARGET ... with a date before ...` in the Docker build's `audit:signatures` step,
     right after a blog-kit release, is the one-day rule (`min-release-age=1`; the lint job can still pass
     because the runner's npm does not apply it): check the publish time with
     `npm view @giancarlosgza/<package> time --json --prefer-online` (the version's timestamp) and tell the
     user when it is a day old; re-running CI then fixes it.
   - Deploy job failures: missing GitHub secrets (step 3), SSH errors (wrong `SSH_KEY`/host), or the server
     script. `deploy.sh` waits for the container's health check and rolls back to the previous image if it
     does not become healthy; its log in the CI step shows the container's last 50 log lines.
   - After a deploy, rerun `check`: the container should be `running/healthy` on `127.0.0.1:<port>` and
     `https` should answer 2xx/3xx.

## Server overview

`npx blog-deploy inventory` lists the server's containers (ports, memory), nginx sites, certificates and
disk. Use it when the user asks what runs on the server, which ports are taken, or why memory or disk is
tight. Memory matters: every Nuxt container uses roughly 70-130 MB.

## Environment notes

- Windows: blog-deploy calls the system OpenSSH (`C:\Windows\System32\OpenSSH\ssh.exe`), which uses the
  ssh-agent service. If it reports it cannot connect, the user must load the key once:
  `ssh-add $env:USERPROFILE\.ssh\<key>` (and `ssh <alias> "echo ok"` must work without a prompt).
- If `gh` is "not found" (a session started before it was installed), add it to PATH for the command:
  in Bash `PATH="$PATH:/c/Program Files/GitHub CLI" npx blog-deploy check`; in PowerShell
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`.
