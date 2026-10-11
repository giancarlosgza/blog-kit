import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { runScript } from './remote.mjs'

export const REQUIRED_TOOLS = ['docker', 'nginx', 'certbot', 'curl']

const PROXY_PORT = String.raw`proxy_pass https?://(localhost|127\.0\.0\.1):[0-9]+`

// Read-only: everything `site` and `check` need to know about the server in one round trip
const FACTS_SCRIPT = String.raw`
C=$1; D=$2
SUDO=$([ "$(id -u)" = 0 ] || echo sudo)
for t in ${REQUIRED_TOOLS.join(' ')}; do command -v $t >/dev/null && echo "tool $t"; done
echo "listening $(ss -tlnH | awk '{print $4}' | sed -E 's/.*:([0-9]+)$/\1/' | sort -un | tr '\n' ' ')"
echo "proxied $(cat /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null | grep -oE '${PROXY_PORT}' | sed -E 's/.*://' | sort -un | tr '\n' ' ')"
echo "published $(docker ps -a --format '{{.Ports}}' 2>/dev/null | grep -oE ':[0-9]+->' | tr -d ':>-' | sort -un | tr '\n' ' ')"
echo "ipv6 $(ip -6 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | tr '\n' ' ')"
f=/etc/nginx/sites-available/$C
[ -f "$f" ] && echo "site_port $(grep -oE '${PROXY_PORT}' "$f" | head -1 | sed -E 's/.*://')"
docker inspect -f 'container {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}} {{.Config.Image}}' "$C" 2>/dev/null
docker inspect -f '{{range $p, $b := .HostConfig.PortBindings}}{{range $b}}container_port {{.HostPort}} {{.HostIp}}{{"\n"}}{{end}}{{end}}' "$C" 2>/dev/null
for n in deploy.sh $C.env $C-service-account.json; do
  p=$HOME/webservices/$n
  [ -f "$p" ] && echo "file $n $(stat -c %a "$p") $(sha256sum "$p" | cut -c1-64)"
done
$SUDO certbot certificates --cert-name "$D" 2>/dev/null | awk '/Domains:/ {sub(/.*Domains: /, ""); print "cert_domains " $0} /Expiry Date:/ {sub(/.*Expiry Date: /, ""); print "cert_expiry " $0}'
`

export function parseFacts(text) {
  const facts = { tools: new Set(), used: new Set(), ipv6: [], files: {}, sitePort: undefined, container: undefined, containerPort: undefined, cert: undefined }
  for (const line of text.split(/\r?\n/)) {
    const [key, ...parts] = line.trim().split(/\s+/)
    switch (key) {
      case 'tool':
        facts.tools.add(parts[0])
        break
      case 'listening':
      case 'proxied':
      case 'published':
        parts.map(Number).filter(Boolean).forEach(port => facts.used.add(port))
        break
      case 'ipv6':
        facts.ipv6 = parts.filter(Boolean)
        break
      case 'site_port':
        facts.sitePort = Number(parts[0]) || undefined
        break
      case 'container':
        facts.container = { status: parts[0], health: parts[1], image: parts[2] }
        break
      case 'container_port':
        facts.containerPort = { port: Number(parts[0]), ip: parts[1] || '0.0.0.0' }
        break
      case 'file':
        facts.files[parts[0]] = { mode: parts[1], sha: parts[2] }
        break
      case 'cert_domains':
        facts.cert = { ...facts.cert, domains: parts }
        break
      case 'cert_expiry':
        facts.cert = { ...facts.cert, expiry: parts.join(' ') }
        break
    }
  }
  return facts
}

export function readFacts(site) {
  const result = runScript(site.sshHost, FACTS_SCRIPT, [site.container, site.domain])
  return parseFacts(result.stdout)
}

/** The site's port: the requested one if free, the one it already has, or the next free one from 3000. */
export function pickPort({ used, own, requested, from = 3000 }) {
  const taken = port => used.has(port) && port !== own
  if (requested) {
    if (taken(requested))
      return { error: `port ${requested} is already used by another service` }
    return { port: requested }
  }
  if (own)
    return { port: own }
  let port = from
  while (taken(port))
    port++
  return { port }
}

// The system resolver: Node's own DNS client is blocked on some networks (ECONNREFUSED)
async function addresses(name, family) {
  try {
    return (await lookup(name, { all: true, family })).map(entry => entry.address)
  } catch {
    return []
  }
}

/** Whether every name resolves only to the server (Let's Encrypt validates each one over HTTP). */
export async function dnsStatus(names, serverHost, serverIpv6 = []) {
  const serverIpv4 = isIP(serverHost) === 4 ? [serverHost] : await addresses(serverHost, 4)
  return Promise.all(names.map(async (name) => {
    const a = await addresses(name, 4)
    const aaaa = await addresses(name, 6)
    const ready = a.length > 0 && a.every(ip => serverIpv4.includes(ip)) && aaaa.every(ip => serverIpv6.includes(ip))
    return { name, a, aaaa, ready }
  }))
}
