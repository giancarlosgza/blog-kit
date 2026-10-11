#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { check } from '../src/commands/check.mjs'
import { inventory } from '../src/commands/inventory.mjs'
import { secrets } from '../src/commands/secrets.mjs'
import { site } from '../src/commands/site.mjs'
import { DeployError, loadSite, SITE_FILE } from '../src/config.mjs'

const USAGE = `Usage: blog-deploy <command> [options]   (run from the site's repo)

Commands:
  site        nginx site, TLS certificate, port, ~/webservices/deploy.sh and GitHub variables
  secrets     upload the production .env and service account, set the GitHub secrets
  check       read-only status of everything a deploy needs
  inventory   read-only overview of the server (containers, ports, sites, certificates, disk)

Options:
  --dry-run       show what would change, change nothing (site, secrets)
  --skip-github   leave GitHub variables and secrets alone
  --host <alias>  server for inventory (default: SSH_HOST of ${SITE_FILE})`

const COMMANDS = { site, secrets, check, inventory }

const [command, ...args] = process.argv.slice(2)
const options = {
  cwd: process.cwd(),
  dryRun: args.includes('--dry-run'),
  skipGithub: args.includes('--skip-github'),
  host: args[args.indexOf('--host') + 1]
}

if (!COMMANDS[command]) {
  console.log(USAGE)
  process.exit(command ? 1 : 0)
}

async function main() {
  if (command === 'inventory' && !args.includes('--host'))
    options.host = existsSync(join(options.cwd, SITE_FILE)) ? loadSite(options.cwd).sshHost : undefined
  if (command === 'inventory' && !options.host)
    throw new DeployError(`Pass --host <alias> or run it next to a ${SITE_FILE}.`)
  const ok = await COMMANDS[command](options)
  console.log('')
  process.exit(ok === false ? 1 : 0)
}

main().catch((error) => {
  if (!(error instanceof DeployError))
    throw error
  process.stderr.write(`\n  ${error.message}\n\n`)
  process.exit(1)
})
