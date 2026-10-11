import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DeployError, localhostKeys, missingKeys, parseEnv, siteSecretFiles, validateSite } from '../src/config.mjs'
import { createSiteScript, renderSite } from '../src/nginx.mjs'
import { parseFacts, pickPort } from '../src/server.mjs'

const SITE = {
  CONTAINER: 'drarebe-admin-prod',
  DOMAIN: 'admin.example.com',
  SSH_HOST: 'linode',
  IMAGE_REPOSITORY: 'giancarlosgza/drarebe-admin'
}

describe('parseEnv', () => {
  it('reads keys, strips quotes and skips comments', () => {
    expect(parseEnv('# comment\nA=1\nB="two words"\r\nC=\nD=\'x=y\'\n')).toEqual({ A: '1', B: 'two words', C: '', D: 'x=y' })
  })
})

describe('validateSite', () => {
  it('normalizes a valid site', () => {
    expect(validateSite({ ...SITE, ALIASES: 'www.Example.com', PORT: '3004' })).toMatchObject({
      container: 'drarebe-admin-prod',
      aliases: ['www.example.com'],
      port: 3004
    })
  })

  it('rejects values that could reach a remote shell', () => {
    expect(() => validateSite({ ...SITE, CONTAINER: 'x; rm -rf /' })).toThrow(DeployError)
    expect(() => validateSite({ ...SITE, ALIASES: 'ok.com $(id)' })).toThrow(DeployError)
    expect(() => validateSite({ ...SITE, DOMAIN: undefined })).toThrow(/DOMAIN is missing/)
  })
})

describe('env checks', () => {
  it('reports keys the example defines and the file does not', () => {
    expect(missingKeys({ A: '', B: '', C: '' }, { A: '1', B: '' }, ['C'])).toEqual([])
    expect(missingKeys({ A: '', B: '' }, { A: '1' })).toEqual(['B'])
  })

  it('flags local URLs', () => {
    expect(localhostKeys({ A: 'http://localhost:3000', B: 'https://example.com', C: 'http://127.0.0.1' })).toEqual(['A', 'C'])
  })
})

describe('siteSecretFiles', () => {
  afterEach(() => {
    delete process.env.BLOG_DEPLOY_SECRETS
  })

  it('prefers the repo copies and falls back to ~/.webservices/<container>', () => {
    const repo = mkdtempSync(join(tmpdir(), 'blog-deploy-repo-'))
    const secrets = mkdtempSync(join(tmpdir(), 'blog-deploy-secrets-'))
    process.env.BLOG_DEPLOY_SECRETS = secrets
    mkdirSync(join(secrets, 'site-prod'))
    writeFileSync(join(secrets, 'site-prod', '.env'), 'A=1')
    writeFileSync(join(secrets, 'site-prod', 'service-account.json'), '{}')

    expect(siteSecretFiles(repo, 'site-prod')).toMatchObject({
      env: join(secrets, 'site-prod', '.env'),
      account: join(secrets, 'site-prod', 'service-account.json')
    })

    writeFileSync(join(repo, '.env.production'), 'A=2')
    writeFileSync(join(repo, 'service-account.json'), '{}')
    expect(siteSecretFiles(repo, 'site-prod')).toMatchObject({
      env: join(repo, '.env.production'),
      account: join(repo, 'service-account.json')
    })
  })

  it('reports where it looked when nothing exists', () => {
    process.env.BLOG_DEPLOY_SECRETS = mkdtempSync(join(tmpdir(), 'blog-deploy-secrets-'))
    const files = siteSecretFiles(mkdtempSync(join(tmpdir(), 'blog-deploy-repo-')), 'site-prod')
    expect(files.env).toBeUndefined()
    expect(files.searched.env).toHaveLength(2)
  })
})

describe('pickPort', () => {
  const used = new Set([22, 80, 443, 3000, 3001, 3002, 3003])

  it('picks the next free port for a new site', () => {
    expect(pickPort({ used })).toEqual({ port: 3004 })
  })

  it('keeps the port a site already has', () => {
    expect(pickPort({ used: new Set([...used, 3004]), own: 3004 })).toEqual({ port: 3004 })
  })

  it('accepts a free requested port and refuses a taken one', () => {
    expect(pickPort({ used, requested: 3010 })).toEqual({ port: 3010 })
    expect(pickPort({ used, requested: 3001 }).error).toMatch(/already used/)
    expect(pickPort({ used: new Set([...used, 3004]), own: 3004, requested: 3004 })).toEqual({ port: 3004 })
  })
})

describe('parseFacts', () => {
  it('collects tools, used ports, files and the certificate', () => {
    const facts = parseFacts([
      'tool docker',
      'tool nginx',
      'listening 22 80 443 3000 ',
      'proxied 3000 3004',
      'published 3000',
      'site_port 3004',
      'container running healthy giancarlosgza/x:production-abc',
      'container_port 3004 127.0.0.1',
      'file deploy.sh 755 abc123',
      'cert_domains example.com www.example.com',
      'cert_expiry 2026-12-27 09:20:39+00:00 (VALID: 76 days)'
    ].join('\n'))
    expect([...facts.tools]).toEqual(['docker', 'nginx'])
    expect([...facts.used].sort((a, b) => a - b)).toEqual([22, 80, 443, 3000, 3004])
    expect(facts.sitePort).toBe(3004)
    expect(facts.container).toEqual({ status: 'running', health: 'healthy', image: 'giancarlosgza/x:production-abc' })
    expect(facts.containerPort).toEqual({ port: 3004, ip: '127.0.0.1' })
    expect(facts.files['deploy.sh']).toEqual({ mode: '755', sha: 'abc123' })
    expect(facts.cert.domains).toEqual(['example.com', 'www.example.com'])
  })

  it('treats a binding without host IP as public', () => {
    expect(parseFacts('container_port 3003').containerPort).toEqual({ port: 3003, ip: '0.0.0.0' })
  })
})

describe('nginx', () => {
  it('proxies to localhost and redirects aliases to the main domain', () => {
    const config = renderSite({ domain: 'example.com', aliases: ['www.example.com'], port: 3004 })
    expect(config).toContain('server_name example.com www.example.com;')
    expect(config).toContain('if ($host = www.example.com) {\n        return 301 $scheme://example.com$request_uri;')
    expect(config).toContain('proxy_pass http://127.0.0.1:3004;')
  })

  it('embeds the site in a quoted heredoc so nginx variables are not expanded', () => {
    const script = createSiteScript(renderSite({ domain: 'example.com', aliases: [], port: 3004 }))
    expect(script).toContain('<<\'BLOG_DEPLOY_SITE\'\nserver {')
    expect(script).toContain('\n}\nBLOG_DEPLOY_SITE\n')
  })
})
