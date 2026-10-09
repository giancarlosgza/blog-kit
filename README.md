# blog-kit

Reusable Firebase blog, published as npm packages. Each blog is its own thin repo that installs
these packages and only keeps its brand, assets and deploy config.

| Package | Status | What it is |
| :--- | :--- | :--- |
| [`@giancarlosgza/blog-layer`](packages/blog-layer) | 0.1.0 | Public blog Nuxt layer (pages, API, RSS, sitemap, SEO, PWA) |
| `@giancarlosgza/blog-core` | planned | Shared models, sanitizer, SEO and date helpers (today inside the blog layer's `shared/`) |
| `@giancarlosgza/blog-admin-layer` | planned | Admin Nuxt layer (editor, workflow, media) |
| `@giancarlosgza/blog-firebase` | planned | Firestore/Storage rules, indexes and Cloud Functions |

The Firestore data contract is in [`docs/schema.md`](docs/schema.md).

## Layout

```
packages/blog-layer   the layer (published)
playground            minimal site that extends the layer, for development
docs                  Firestore schema
```

## Development

Requires Node 24 and pnpm 10.

```bash
pnpm install
cp playground/.env.example playground/.env   # point it at a Firebase service account
pnpm dev                                     # playground on http://localhost:3030
```

| Command | What it does |
| :--- | :--- |
| `pnpm dev` / `pnpm build` / `pnpm preview` | Run, build or preview the playground |
| `pnpm lint` | ESLint over the whole workspace |
| `pnpm test` | Unit tests of the layer (Vitest) |
| `pnpm typecheck` | `nuxt typecheck` of the playground, which includes the layer |
| `pnpm publish:layer` | Publish `@giancarlosgza/blog-layer` to npm |

Installs only take versions published at least a day ago (`minimumReleaseAge` in
`pnpm-workspace.yaml`), and pnpm does not run dependency build scripts (the same policy as
`npm install --ignore-scripts` in the sites).

## Releasing

1. Bump `packages/blog-layer/package.json` `version`.
2. `pnpm publish:layer` (needs `npm login` with access to the `@giancarlosgza` scope).
3. In each site, bump `@giancarlosgza/blog-layer` and deploy as usual.
