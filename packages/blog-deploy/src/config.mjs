import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const SITE_FILE = 'deploy/site.env'
export const DEPLOY_SCRIPT = new URL('../server/deploy.sh', import.meta.url)

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

// Values end up in remote shell commands, so each one is validated before use
const RULES = {
  CONTAINER: [true, /^[a-z0-9][\w.-]*$/, 'lowercase letters, digits, dots, dashes'],
  DOMAIN: [true, HOSTNAME, 'a hostname such as example.com'],
  SSH_HOST: [true, /^[\w.-]+$/, 'an ~/.ssh/config alias or a hostname'],
  IMAGE_REPOSITORY: [true, /^[a-z0-9]+(?:[._-][a-z0-9]+)*\/[a-z0-9]+(?:[._-][a-z0-9]+)*$/, 'user/name'],
  ALIASES: [false, /^[a-z0-9.\s-]*$/i, 'space-separated hostnames'],
  PORT: [false, /^\d{4,5}$/, 'a port such as 3004'],
  EMAIL: [false, /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/, 'an email for Let\'s Encrypt']
}

export class DeployError extends Error {}

export function parseEnv(text) {
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]\w*)\s*=(.*)$/i)
    if (!match)
      continue
    let value = match[2].trim()
    if (/^(["']).*\1$/.test(value))
      value = value.slice(1, -1)
    values[match[1]] = value
  }
  return values
}

export function validateSite(values) {
  const errors = []
  for (const [key, [required, pattern, hint]] of Object.entries(RULES)) {
    const value = values[key]
    if (!value) {
      if (required)
        errors.push(`${key} is missing (${hint})`)
      continue
    }
    if (!pattern.test(value))
      errors.push(`${key} is not valid (${hint})`)
  }
  const aliases = (values.ALIASES || '').split(/\s+/).filter(Boolean)
  for (const alias of aliases) {
    if (!HOSTNAME.test(alias))
      errors.push(`ALIASES has an invalid hostname: ${alias}`)
  }
  if (errors.length)
    throw new DeployError(`${SITE_FILE}:\n  - ${errors.join('\n  - ')}`)

  return {
    container: values.CONTAINER,
    domain: values.DOMAIN.toLowerCase(),
    aliases: aliases.map(alias => alias.toLowerCase()),
    sshHost: values.SSH_HOST,
    imageRepository: values.IMAGE_REPOSITORY,
    port: values.PORT ? Number(values.PORT) : undefined,
    email: values.EMAIL || undefined
  }
}

export function loadSite(cwd) {
  const path = join(cwd, SITE_FILE)
  if (!existsSync(path))
    throw new DeployError(`${SITE_FILE} not found in ${cwd}. See the blog-deploy README for its keys.`)
  return validateSite(parseEnv(readFileSync(path, 'utf8')))
}

export function savePort(cwd, port) {
  const path = join(cwd, SITE_FILE)
  const text = readFileSync(path, 'utf8')
  const next = /^PORT=.*$/m.test(text)
    ? text.replace(/^PORT=.*$/m, `PORT=${port}`)
    : `${text.replace(/\s*$/, '')}\nPORT=${port}\n`
  writeFileSync(path, next)
}

export function secretsDir() {
  return process.env.BLOG_DEPLOY_SECRETS || join(homedir(), '.webservices')
}

/** The site's production env file and service account: the repo's own (gitignored) copies first, then ~/.webservices/<container>/. */
export function siteSecretFiles(cwd, container) {
  const external = join(secretsDir(), container)
  const searched = {
    env: [join(cwd, '.env.production'), join(external, '.env')],
    account: [join(cwd, 'service-account.json'), join(external, 'service-account.json')]
  }
  return {
    env: searched.env.find(path => existsSync(path)),
    account: searched.account.find(path => existsSync(path)),
    searched
  }
}

export function expandHome(path) {
  return path.replace(/^~(?=[/\\]|$)/, homedir())
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

/** Keys of `.env.example` that the env file does not define (empty values count as defined: optional keys stay empty). */
export function missingKeys(example, actual, ignore = []) {
  return Object.keys(example).filter(key => !ignore.includes(key) && !(key in actual))
}

/** Keys whose value still points at a local dev server. */
export function localhostKeys(values) {
  return Object.keys(values).filter(key => /\/\/(?:localhost|127\.0\.0\.1)\b/.test(values[key]))
}
