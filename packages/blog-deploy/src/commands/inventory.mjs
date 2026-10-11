import { heading } from '../output.mjs'
import { runScript } from '../remote.mjs'

// Read-only overview of the server: sites, ports, certificates and resources
const INVENTORY_SCRIPT = String.raw`
SUDO=$([ "$(id -u)" = 0 ] || echo sudo)
. /etc/os-release
echo "$PRETTY_NAME, $(nproc) CPU, disk $(df -h / | awk 'NR==2 {print $3 " of " $2}')"
free -h | awk '/Mem:/ {print "memory " $3 " of " $2 " used, " $7 " available"} /Swap:/ {print "swap   " $3 " of " $2 " used"}'
echo
echo "CONTAINERS"
docker ps -a --format '{{.Names}}|{{.Status}}|{{.Ports}}' | while IFS='|' read -r name status ports; do
  mem=$(docker stats --no-stream --format '{{.MemUsage}}' "$name" 2>/dev/null | cut -d/ -f1)
  printf '  %-28s %-26s %-10s %s\n' "$name" "$status" "$mem" "$(echo "$ports" | grep -oE '[0-9.]+:[0-9]+->' | head -1 | tr -d '>-')"
done
echo
echo "NGINX SITES"
for f in /etc/nginx/sites-enabled/*; do
  names=$(grep -hoE 'server_name [^;]+' "$f" | head -1 | cut -d' ' -f2-)
  port=$(grep -hoE 'proxy_pass https?://[^;]+' "$f" | head -1 | sed -E 's/.*:([0-9]+).*/\1/')
  printf '  %-24s %-6s %s\n' "$(basename "$f")" "${'$'}{port:--}" "$names"
done
echo
echo "CERTIFICATES"
$SUDO certbot certificates 2>/dev/null | awk '/Certificate Name:/ {n=$3} /Expiry Date:/ {sub(/.*Expiry Date: /, ""); printf "  %-28s %s\n", n, $0}'
echo
echo "DOCKER DISK"
docker system df --format '  {{.Type}}: {{.Size}} ({{.Reclaimable}} reclaimable)'
`

export async function inventory({ host }) {
  heading(`Inventory of ${host}`)
  const result = runScript(host, INVENTORY_SCRIPT)
  console.log(result.stdout.replace(/^/gm, '  '))
  return result.ok
}
