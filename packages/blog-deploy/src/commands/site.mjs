import { readFileSync } from 'node:fs'
import { DEPLOY_SCRIPT, DeployError, loadSite, savePort, sha256, SITE_FILE } from '../config.mjs'
import { listVariables, repoFromGit, setVariable } from '../github.mjs'
import { CERTBOT_SCRIPT, createSiteScript, renderSite, UPDATE_PORT_SCRIPT } from '../nginx.mjs'
import { heading, plan, row } from '../output.mjs'
import { runScript, sshTarget, upload } from '../remote.mjs'
import { dnsStatus, pickPort, readFacts, REQUIRED_TOOLS } from '../server.mjs'

/** Everything except secrets: port, deploy script, nginx site, TLS and GitHub variables. Safe to rerun. */
export async function site({ cwd, dryRun, skipGithub }) {
  const config = loadSite(cwd)
  const target = sshTarget(config.sshHost)
  heading(`${config.container} -> https://${config.domain} on ${config.sshHost} (${target.user}@${target.hostname})${dryRun ? ' [dry run]' : ''}`)

  const facts = readFacts(config)
  const missing = REQUIRED_TOOLS.filter(tool => !facts.tools.has(tool))
  if (missing.length)
    throw new DeployError(`The server is missing: ${missing.join(', ')}`)
  row('server', `${REQUIRED_TOOLS.join(', ')} ok`)

  const own = facts.sitePort ?? facts.containerPort?.port
  const { port, error } = pickPort({ used: facts.used, own, requested: config.port })
  if (error)
    throw new DeployError(`${SITE_FILE}: ${error}. Remove PORT to pick a free one.`)
  if (port !== config.port) {
    if (!dryRun)
      savePort(cwd, port)
    row('port', `${port} (${plan(dryRun, `save to ${SITE_FILE}`)})`)
  } else {
    row('port', `${port}`)
  }

  const script = readFileSync(DEPLOY_SCRIPT)
  if (facts.files['deploy.sh']?.sha === sha256(script)) {
    row('~/webservices/deploy.sh', 'up to date')
  } else {
    if (!dryRun)
      upload(config.sshHost, '$HOME/webservices/deploy.sh', script, '755')
    row('~/webservices/deploy.sh', plan(dryRun, facts.files['deploy.sh'] ? 'update' : 'install'))
  }

  const sitePath = `/etc/nginx/sites-available/${config.container}`
  if (!facts.sitePort) {
    if (!dryRun)
      expectOk(runScript(config.sshHost, createSiteScript(renderSite({ ...config, port })), [config.container]), 'nginx site')
    row(sitePath, plan(dryRun, `create (${[config.domain, ...config.aliases].join(', ')} -> 127.0.0.1:${port})`))
  } else if (facts.sitePort !== port) {
    if (!dryRun)
      expectOk(runScript(config.sshHost, UPDATE_PORT_SCRIPT, [config.container, String(port)]), 'nginx port')
    row(sitePath, plan(dryRun, `move from port ${facts.sitePort} to ${port}`))
  } else {
    row(sitePath, 'up to date')
  }

  await tls(config, facts, target, dryRun)

  if (skipGithub)
    return
  const repo = repoFromGit(cwd)
  const wanted = { IMAGE_REPOSITORY: config.imageRepository, DEPLOY_CONTAINER: config.container, DEPLOY_PORT: String(port) }
  const current = listVariables(repo)
  for (const [name, value] of Object.entries(wanted)) {
    if (current[name] === value) {
      row(`${repo} ${name}`, `${value} (up to date)`)
      continue
    }
    if (!dryRun)
      setVariable(repo, name, value)
    row(`${repo} ${name}`, plan(dryRun, `set to ${value}`))
  }
}

async function tls(config, facts, target, dryRun) {
  const names = [config.domain, ...config.aliases]
  const covered = facts.cert?.domains && names.every(name => facts.cert.domains.includes(name))
  if (covered) {
    row('certificate', `valid until ${facts.cert.expiry}`)
    return
  }
  const dns = await dnsStatus(names, target.hostname, facts.ipv6)
  const pending = dns.filter(entry => !entry.ready)
  if (pending.length) {
    for (const entry of pending)
      row(`dns ${entry.name}`, `points to ${[...entry.a, ...entry.aaaa].join(', ') || 'nothing'}, expected ${target.hostname}`)
    row('certificate', 'waiting for DNS; rerun after pointing the names above at the server')
    return
  }
  if (!dryRun)
    expectOk(runScript(config.sshHost, CERTBOT_SCRIPT, [config.domain, config.email || '-', ...names]), 'certbot')
  row('certificate', plan(dryRun, `issue for ${names.join(', ')} and redirect HTTP to HTTPS`))
}

function expectOk(result, step) {
  if (!result.ok)
    throw new DeployError(`${step} failed:\n${result.stderr || result.stdout}`)
}
