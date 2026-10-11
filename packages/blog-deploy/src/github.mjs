import { spawnSync } from 'node:child_process'
import { DeployError } from './config.mjs'

function gh(args, input) {
  const result = spawnSync('gh', args, { input, encoding: 'utf8' })
  if (result.error)
    throw new DeployError('GitHub CLI not found. Install it (`winget install GitHub.cli`) and run `gh auth login`.')
  if (result.status !== 0)
    throw new DeployError(`gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr.trim()}`)
  return result.stdout
}

export function repoFromGit(cwd) {
  const result = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' })
  const match = result.stdout?.trim().match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)
  if (!match)
    throw new DeployError('The origin remote is not a GitHub repository.')
  return match[1]
}

export function listVariables(repo) {
  return Object.fromEntries(JSON.parse(gh(['variable', 'list', '--repo', repo, '--json', 'name,value'])).map(v => [v.name, v.value]))
}

export function listSecrets(repo) {
  return JSON.parse(gh(['secret', 'list', '--repo', repo, '--json', 'name,updatedAt']))
}

export function setVariable(repo, name, value) {
  gh(['variable', 'set', name, '--repo', repo, '--body', value])
}

/** The value goes through stdin: it never appears in the process list or shell history. */
export function setSecret(repo, name, value) {
  gh(['secret', 'set', name, '--repo', repo], value)
}
