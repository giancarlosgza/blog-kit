import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DeployError } from './config.mjs'

// On Windows only the system OpenSSH talks to the ssh-agent service; Git Bash's ssh does not
function sshBinary() {
  if (process.env.BLOG_DEPLOY_SSH)
    return process.env.BLOG_DEPLOY_SSH
  if (process.platform === 'win32') {
    const system = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'OpenSSH', 'ssh.exe')
    if (existsSync(system))
      return system
  }
  return 'ssh'
}

const SSH = sshBinary()
const SSH_OPTIONS = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20']

function ssh(host, command, input) {
  const result = spawnSync(SSH, [...SSH_OPTIONS, host, command], { input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  if (result.error)
    throw new DeployError(`Could not run ssh: ${result.error.message}`)
  if (result.status === 255)
    throw new DeployError(`Could not connect to ${host}: ${result.stderr.trim()}\n  Check that \`ssh ${host}\` works without a prompt (key loaded in ssh-agent).`)
  return { ok: result.status === 0, stdout: result.stdout, stderr: result.stderr.trim() }
}

/** Runs a bash script on the server; `args` must already be validated (they join a shell command). */
export function runScript(host, script, args = []) {
  return ssh(host, ['bash', '-s', '--', ...args].join(' '), script)
}

/** Writes `content` to `remotePath` atomically, readable only by its owner unless `mode` says otherwise. */
export function upload(host, remotePath, content, mode = '600') {
  const command = `umask 077 && mkdir -p "$(dirname ${remotePath})" && cat > ${remotePath}.tmp && chmod ${mode} ${remotePath}.tmp && mv ${remotePath}.tmp ${remotePath}`
  const result = ssh(host, command, content)
  if (!result.ok)
    throw new DeployError(`Could not write ${remotePath}: ${result.stderr}`)
}

/** Hostname, user and port that `ssh <alias>` resolves to (from ~/.ssh/config). */
export function sshTarget(host) {
  const result = spawnSync(SSH, ['-G', host], { encoding: 'utf8' })
  if (result.status !== 0)
    throw new DeployError(`ssh -G ${host} failed: ${result.stderr.trim()}`)
  const values = Object.fromEntries(result.stdout.split(/\r?\n/).map(line => line.split(' ')).map(([key, ...rest]) => [key, rest.join(' ')]))
  return { hostname: values.hostname, user: values.user, port: values.port || '22' }
}
