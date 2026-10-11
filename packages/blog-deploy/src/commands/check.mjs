import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEPLOY_SCRIPT, loadSite, secretsDir, sha256 } from '../config.mjs'
import { listSecrets, listVariables, repoFromGit } from '../github.mjs'
import { heading, row } from '../output.mjs'
import { runScript, sshTarget } from '../remote.mjs'
import { dnsStatus, readFacts } from '../server.mjs'

const SECRETS = ['DOCKER_USER', 'DOCKER_PASS', 'SSH_KEY', 'SSH_HOST', 'SSH_USER', 'SSH_PORT']

/** Read-only status of everything a deploy needs. Returns false when something is missing. */
export async function check({ cwd, skipGithub }) {
  const config = loadSite(cwd)
  const target = sshTarget(config.sshHost)
  heading(`${config.container} -> https://${config.domain} on ${config.sshHost} (${target.user}@${target.hostname})`)
  const facts = readFacts(config)
  let ok = true
  const status = (label, good, text) => {
    ok &&= good
    row(label, `${good ? 'ok' : '!!'}  ${text}`)
  }

  const local = join(secretsDir(), config.container)
  status('local secrets', existsSync(join(local, '.env')) && existsSync(join(local, 'service-account.json')), local)

  const deploy = facts.files['deploy.sh']
  const current = deploy?.sha === sha256(readFileSync(DEPLOY_SCRIPT))
  status('~/webservices/deploy.sh', current, !deploy ? 'missing' : current ? 'current' : 'differs from this version')
  for (const name of [`${config.container}.env`, `${config.container}-service-account.json`]) {
    const file = facts.files[name]
    status(`~/webservices/${name}`, file?.mode === '600', file ? `mode ${file.mode} sha256 ${file.sha.slice(0, 8)}` : 'missing')
  }

  status('nginx site', Boolean(facts.sitePort), facts.sitePort ? `-> 127.0.0.1:${facts.sitePort}` : 'missing')
  if (facts.container) {
    const binding = facts.containerPort ? `${facts.containerPort.ip}:${facts.containerPort.port}` : 'no port'
    status('container', facts.container.health === 'healthy' || (facts.container.health === '-' && facts.container.status === 'running'), `${facts.container.status}/${facts.container.health} ${facts.container.image}`)
    status('container port', facts.containerPort?.ip === '127.0.0.1' && facts.containerPort.port === facts.sitePort, binding)
  } else {
    row('container', 'not deployed yet')
  }

  const names = [config.domain, ...config.aliases]
  for (const entry of await dnsStatus(names, target.hostname, facts.ipv6))
    status(`dns ${entry.name}`, entry.ready, [...entry.a, ...entry.aaaa].join(', ') || 'no records')
  const covered = facts.cert?.domains && names.every(name => facts.cert.domains.includes(name))
  status('certificate', Boolean(covered), covered ? `valid until ${facts.cert.expiry}` : 'missing')
  if (covered) {
    const https = runScript(config.sshHost, `curl -sS -o /dev/null -w '%{http_code}' --max-time 15 --resolve "$1:443:127.0.0.1" "https://$1/"`, [config.domain])
    status('https', https.stdout.trim().startsWith('2') || https.stdout.trim().startsWith('3'), `HTTP ${https.stdout.trim() || https.stderr}`)
  }

  if (!skipGithub) {
    const repo = repoFromGit(cwd)
    const variables = listVariables(repo)
    const wanted = { IMAGE_REPOSITORY: config.imageRepository, DEPLOY_CONTAINER: config.container, DEPLOY_PORT: String(facts.sitePort ?? config.port ?? '') }
    for (const [name, value] of Object.entries(wanted))
      status(`${repo} ${name}`, variables[name] === value, variables[name] ?? 'missing')
    const present = new Set(listSecrets(repo).map(secret => secret.name))
    const absent = SECRETS.filter(name => !present.has(name))
    status(`${repo} secrets`, absent.length === 0, absent.length ? `missing ${absent.join(', ')}` : SECRETS.join(', '))
  }
  return ok
}
