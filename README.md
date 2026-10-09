# blog-kit

Reusable Firebase blog, published as npm packages. Each site is its own repo that installs these
packages and only keeps its brand, assets and deploy config.

| Package | Status | What it is |
| :--- | :--- | :--- |
| [`@giancarlosgza/blog-layer`](packages/blog-layer) | 0.1.2 | The blog: pages under `blog.basePath`, `/api/blog/*`, RSS, sitemap, SEO. Embeds into any Nuxt site that uses `@colorffy/css` |
| [`@giancarlosgza/blog-site-layer`](packages/blog-site-layer) | 0.1.2 | A standalone blog site: the blog layer plus app shell, navbar/footer, PWA, robots, fonts, analytics |
| `@giancarlosgza/blog-core` | planned | Shared models, sanitizer, SEO and date helpers (today inside the blog layer's `shared/`) |
| [`@giancarlosgza/blog-admin-layer`](packages/blog-admin-layer) | 0.1.2 | The admin app: editor, workflow, media, authors, tags, settings, analytics, AI tools. Runs as its own SSR app |
| `@giancarlosgza/blog-firebase` | planned | Firestore/Storage rules, indexes and Cloud Functions |

Which one to install:
- **A blog is the whole site** (e.g. blog.colorffy.com): `@giancarlosgza/blog-site-layer`.
- **A blog inside another site** (e.g. a landing page with `/blog`): `@giancarlosgza/blog-layer`
  with `blog: { basePath: '/blog' }`.
- **The admin** for either, on its own domain: `@giancarlosgza/blog-admin-layer`.

The Firestore data contract is in [`docs/schema.md`](docs/schema.md).

## Layout

```
packages/blog-layer        embeddable blog (published)
packages/blog-site-layer   standalone site shell, extends blog-layer (published)
playground/site            standalone blog at /, extends blog-site-layer (port 3030)
playground/landing         landing page with the blog at /blog, extends blog-layer (port 3031)
packages/blog-admin-layer  admin app (published)
playground/admin           admin on the admin layer (port 3032)
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
| `pnpm dev:site` / `pnpm dev:landing` / `pnpm dev:admin` | Run a playground |
| `pnpm build:site` / `pnpm build:landing` / `pnpm build:admin` | Production build of a playground |
| `pnpm lint` | ESLint over the whole workspace |
| `pnpm test` | Unit tests of the blog and admin layers (Vitest) |
| `pnpm typecheck` | `nuxt typecheck` of every playground, which covers every layer |
| `pnpm publish:layers` | Publish every package to npm |

Installs only take versions published at least a day ago (`minimumReleaseAge` in
`pnpm-workspace.yaml`), and pnpm does not run dependency build scripts (the same policy as
`npm install --ignore-scripts` in the sites).

## Releasing

1. Bump `version` in every `packages/*/package.json` (keep them in step).
2. `pnpm publish:layers` (needs `npm login` with access to the `@giancarlosgza` scope). The site
   layer's `workspace:^` dependency on the blog layer is published as `^<version>`.
3. Approve each version in the npmjs.com **Staged Packages** tab (blog layer first: the site layer
   depends on it).
4. In each site, bump the package and deploy as usual.
