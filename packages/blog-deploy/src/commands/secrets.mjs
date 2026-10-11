import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DeployError, expandHome, loadSite, localhostKeys, missingKeys, parseEnv, secretsDir, sha256, siteSecretFiles } from '../config.mjs'
import { repoFromGit, setSecret } from '../github.mjs'
import { heading, plan, row } from '../output.mjs'
import { sshTarget, upload } from '../remote.mjs'
import { readFacts } from '../server.mjs'

const SHARED_KEYS = ['DOCKER_USER', 'DOCKER_PASS', 'CI_SSH_KEY']

/**
 * Uploads the site's production env file and service account, and sets the GitHub secrets.
 * Prints names, checksums and checks only: never a value.
 */
export async function secrets({ cwd, dryRun, skipGithub }) {
  const config = loadSite(cwd)
  const dir = secretsDir()
  heading(`Secrets for ${config.container}${dryRun ? ' [dry run]' : ''}`)

  const { env: envPath, account: accountPath, searched } = siteSecretFiles(cwd, config.container)
  if (!envPath)
    throw new DeployError(`No production env file. Create one of:\n    ${searched.env.join('\n    ')}`)
  if (!accountPath)
    throw new DeployError(`No service account key. Add one of:\n    ${searched.account.join('\n    ')}`)

  const env = readFileSync(envPath)
  const values = parseEnv(env.toString('utf8'))
  const examplePath = join(cwd, '.env.example')
  const missing = existsSync(examplePath)
    ? missingKeys(parseEnv(readFileSync(examplePath, 'utf8')), values, ['GOOGLE_APPLICATION_CREDENTIALS'])
    : []
  const local = localhostKeys(values)
  row('env file', `${envPath} (${Object.keys(values).length} keys)`)
  if (missing.length)
    row('', `not defined (from .env.example): ${missing.join(', ')}`)
  if (local.length)
    throw new DeployError(`${envPath} still points at localhost: ${local.join(', ')}`)

  const account = readFileSync(accountPath)
  let projectId
  try {
    const parsed = JSON.parse(account.toString('utf8'))
    if (parsed.type !== 'service_account')
      throw new Error('not a service account')
    projectId = parsed.project_id
  } catch (error) {
    throw new DeployError(`${accountPath} is not a service account key (${error.message})`)
  }
  row('service account', `${accountPath} (project ${projectId})`)

  const facts = readFacts(config)
  const files = [
    [`${config.container}.env`, env],
    [`${config.container}-service-account.json`, account]
  ]
  for (const [name, content] of files) {
    const hash = sha256(content)
    const remote = facts.files[name]
    if (remote?.sha === hash && remote.mode === '600') {
      row(`~/webservices/${name}`, `up to date (sha256 ${hash.slice(0, 8)})`)
      continue
    }
    if (!dryRun)
      upload(config.sshHost, `$HOME/webservices/${name}`, content)
    row(`~/webservices/${name}`, `${plan(dryRun, remote ? 'update' : 'upload')} (sha256 ${hash.slice(0, 8)}, mode 600)`)
  }

  if (skipGithub)
    return
  const sharedPath = join(dir, 'secrets.env')
  if (!existsSync(sharedPath))
    throw new DeployError(`Missing ${sharedPath} (${SHARED_KEYS.join(', ')})`)
  const shared = parseEnv(readFileSync(sharedPath, 'utf8'))
  const absent = SHARED_KEYS.filter(key => !shared[key])
  if (absent.length)
    throw new DeployError(`${sharedPath} is missing: ${absent.join(', ')}`)
  const keyPath = expandHome(shared.CI_SSH_KEY)
  if (!existsSync(keyPath))
    throw new DeployError(`CI_SSH_KEY points to a missing file: ${keyPath}`)

  const target = sshTarget(config.sshHost)
  const repo = repoFromGit(cwd)
  const githubSecrets = {
    DOCKER_USER: shared.DOCKER_USER,
    DOCKER_PASS: shared.DOCKER_PASS,
    SSH_KEY: readFileSync(keyPath, 'utf8'),
    SSH_HOST: target.hostname,
    SSH_USER: target.user,
    SSH_PORT: target.port
  }
  for (const [name, value] of Object.entries(githubSecrets)) {
    if (!dryRun)
      setSecret(repo, name, value)
    row(`${repo} ${name}`, plan(dryRun, 'set'))
  }
}
