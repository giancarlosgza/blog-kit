# blog-kit

Reusable Firebase blog, published as npm packages. Each site is its own repo that installs these
packages and only keeps its brand, assets and deploy config.

| Package | Status | What it is |
| :--- | :--- | :--- |
| [`@giancarlosgza/blog-layer`](packages/blog-layer) | 0.1.0 | The blog: pages under `blog.basePath`, `/api/blog/*`, RSS, sitemap, SEO. Embeds into any Nuxt site that uses `@colorffy/css` |
| [`@giancarlosgza/blog-site-layer`](packages/blog-site-layer) | 0.1.0 | A standalone blog site: the blog layer plus app shell, navbar/footer, PWA, robots, fonts, analytics |
| `@giancarlosgza/blog-core` | planned | Shared models, sanitizer, SEO and date helpers (today inside the blog layer's `shared/`) |
| `@giancarlosgza/blog-admin-layer` | planned | Admin Nuxt layer (editor, workflow, media) |
| `@giancarlosgza/blog-firebase` | planned | Firestore/Storage rules, indexes and Cloud Functions |

Which one to install:
- **A blog is the whole site** (e.g. blog.colorffy.com): `@giancarlosgza/blog-site-layer`.
- **A blog inside another site** (e.g. a landing page with `/blog`): `@giancarlosgza/blog-layer`
  with `blog: { basePath: '/blog' }`.

The Firestore data contract is in [`docs/schema.md`](docs/schema.md).

## Layout

```
packages/blog-layer        embeddable blog (published)
packages/blog-site-layer   standalone site shell, extends blog-layer (published)
playground/site            standalone blog at /, extends blog-site-layer (port 3030)
playground/landing         landing page with the blog at /blog, extends blog-layer (port 3031)
docs                       Firestore schema
```

## Development

Requires Node 24 and pnpm 10.

```bash
pnpm install
cp playground/site/.env.example playground/site/.env   # point it at a Firebase service account
pnpm dev:site
```

| Command | What it does |
| :--- | :--- |
| `pnpm dev:site` / `pnpm dev:landing` | Run a playground |
| `pnpm build:site` / `pnpm build:landing` | Production build of a playground |
| `pnpm lint` | ESLint over the whole workspace |
| `pnpm test` | Unit tests of the blog layer (Vitest) |
| `pnpm typecheck` | `nuxt typecheck` of both playgrounds, which covers both layers |
| `pnpm publish:layers` | Publish both packages to npm |

Installs only take versions published at least a day ago (`minimumReleaseAge` in
`pnpm-workspace.yaml`), and pnpm does not run dependency build scripts (the same policy as
`npm install --ignore-scripts` in the sites).

## Releasing

1. Bump `version` in both `packages/*/package.json` (keep them in step).
2. `pnpm publish:layers` (needs `npm login` with access to the `@giancarlosgza` scope). The site
   layer's `workspace:^` dependency on the blog layer is published as `^<version>`.
3. In each site, bump the package and deploy as usual.
