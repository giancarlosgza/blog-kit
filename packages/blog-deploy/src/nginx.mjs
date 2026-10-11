/** HTTP-only site; `certbot --nginx --redirect` later adds the 443 block and the HTTPS redirect. */
export function renderSite({ domain, aliases, port }) {
  const redirects = aliases.map(alias => [
    `    if ($host = ${alias}) {`,
    `        return 301 $scheme://${domain}$request_uri;`,
    '    }',
    ''
  ].join('\n')).join('\n')

  return `server {
    listen 80;
    listen [::]:80;
    server_name ${[domain, ...aliases].join(' ')};

${redirects}    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`
}

const TEST_AND_RELOAD = String.raw`
if ! $SUDO nginx -t 2>/tmp/blog-deploy-nginx; then
  restore
  cat /tmp/blog-deploy-nginx >&2
  exit 1
fi
$SUDO systemctl reload nginx
`

/** Creates the site and enables it; removes it again if `nginx -t` fails. Args: container. */
export function createSiteScript(config) {
  return String.raw`set -euo pipefail
SUDO=$([ "$(id -u)" = 0 ] || echo sudo)
f=/etc/nginx/sites-available/$1
restore() { $SUDO rm -f "/etc/nginx/sites-enabled/$1" "$f"; }
$SUDO tee "$f" >/dev/null <<'BLOG_DEPLOY_SITE'
${config}BLOG_DEPLOY_SITE
$SUDO ln -sf "$f" "/etc/nginx/sites-enabled/$1"
${TEST_AND_RELOAD}`
}

/** Points the existing site at a new port; restores the previous file if `nginx -t` fails. Args: container, port. */
export const UPDATE_PORT_SCRIPT = String.raw`set -euo pipefail
SUDO=$([ "$(id -u)" = 0 ] || echo sudo)
f=/etc/nginx/sites-available/$1
$SUDO cp "$f" "$f.bak"
restore() { $SUDO mv "$f.bak" "$f"; }
$SUDO sed -i -E "s#proxy_pass https?://(localhost|127\.0\.0\.1):[0-9]+#proxy_pass http://127.0.0.1:$2#" "$f"
${TEST_AND_RELOAD}
$SUDO rm -f "$f.bak"
`

/** Issues or expands the certificate and lets certbot add HTTPS and the redirect. Args: domain, email or -, names... */
export const CERTBOT_SCRIPT = String.raw`set -euo pipefail
SUDO=$([ "$(id -u)" = 0 ] || echo sudo)
name=$1; email=$2; shift 2
args=(); for n in "$@"; do args+=(-d "$n"); done
if [ "$email" = - ]; then contact=(); else contact=(-m "$email"); fi
$SUDO certbot --nginx --non-interactive --agree-tos --redirect --expand --cert-name "$name" "${'$'}{contact[@]}" "${'$'}{args[@]}"
`
