# blog-kit

Reusable Firebase blog, published as npm packages. Each site is its own repo that installs these
packages and only keeps its brand, assets and deploy config.

| Package | Status | What it is |
| :--- | :--- | :--- |
| [`@giancarlosgza/blog-layer`](packages/blog-layer) | 0.2.0 | The blog: pages under `blog.basePath`, `/api/blog/*`, RSS, sitemap, SEO. Embeds into any Nuxt site that uses `@colorffy/css` |
| [`@giancarlosgza/blog-site-layer`](packages/blog-site-layer) | 0.2.0 | A standalone blog site: the blog layer plus app shell, navbar/footer, PWA, robots, fonts, analytics |
| [`@giancarlosgza/blog-core`](packages/blog-core) | 0.2.0 | Firestore models, URL/date/SEO/text helpers and the post HTML sanitizer, shared by every package |
| [`@giancarlosgza/blog-admin-layer`](packages/blog-admin-layer) | 0.2.0 | The admin app: editor, workflow, media, authors, tags, settings, analytics, AI tools. Runs as its own SSR app |
| [`@giancarlosgza/blog-firebase`](packages/blog-firebase) | 0.2.0 | Firestore/Storage rules, indexes and the scheduled-publish Cloud Function |

Which one to install:
- **A blog is the whole site** (e.g. blog.colorffy.com): `@giancarlosgza/blog-site-layer`.
- **A blog inside another site** (e.g. a landing page with `/blog`): `@giancarlosgza/blog-layer`
  with `blog: { basePath: '/blog' }`.
- **The admin** for either, on its own domain: `@giancarlosgza/blog-admin-layer`.
- **The Firebase project** (rules, indexes, Cloud Functions), deployed from the admin repo:
  `@giancarlosgza/blog-firebase`.

The Firestore data contract is in [`docs/schema.md`](docs/schema.md).

## Layout

```
packages/blog-core         shared models, helpers and sanitizer (published, built with tsdown)
packages/blog-layer        embeddable blog (published)
packages/blog-site-layer   standalone site shell, extends blog-layer (published)
playground/site            standalone blog at /, extends blog-site-layer (port 3030)
playground/landing         landing page with the blog at /blog, extends blog-layer (port 3031)
packages/blog-admin-layer  admin app (published)
playground/admin           admin on the admin layer (port 3032)
packages/blog-firebase     rules, indexes and Cloud Functions (published, built with tsdown)
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
| `pnpm test` | Unit tests of every package (Vitest) |
| `pnpm test:rules` | Firestore and Storage rules tests on the emulators (needs the Firebase CLI and Java) |
| `pnpm typecheck` | `tsc` of blog-core and blog-firebase, then `nuxt typecheck` of every playground (covers every layer) |
| `pnpm publish:layers` | Publish every package to npm |

In the workspace, blog-core and blog-firebase export their TypeScript sources, so nothing needs
building for dev, tests or typecheck. Publishing builds them (`prepack`) and swaps in the `dist`
exports from `publishConfig`.

Installs only take versions published at least a day ago (`minimumReleaseAge` in
`pnpm-workspace.yaml`), and pnpm does not run dependency build scripts (the same policy as
`npm install --ignore-scripts` in the sites).

## Releasing

1. Bump `version` in every `packages/*/package.json` (keep them in step).
2. `pnpm publish:layers` (needs `npm login` with access to the `@giancarlosgza` scope). `workspace:^`
   dependencies between packages are published as `^<version>`.
3. Approve each version in the npmjs.com **Staged Packages** tab in dependency order: blog-core, then
   blog-layer, blog-admin-layer and blog-firebase, then blog-site-layer.
4. In each site, bump the package and deploy as usual.

### Upgrading a site to 0.2.0
Models, widget types and the shared helpers moved from the layers' `shared/` to `@giancarlosgza/blog-core`:
- Add `@giancarlosgza/blog-core` to the site's dependencies and import `WidgetDescriptor` and the models
  from it (they were `#blog/shared/widgets/types`, `#admin/shared/widgets/types`, `#.../shared/models/*`).
- `sanitizePostHtml` / `sanitizeBlogHtml` come from `@giancarlosgza/blog-core/sanitize`.
- Admin repo: point `firebase.json` at the `@giancarlosgza/blog-firebase` rules and indexes, export
  `createPublishScheduledPosts()` from `functions/index.js`, and delete the local copies
  (`functions/publish-scheduled.js`, `functions/sanitize-post-html.js`, their tests, the sanitizer parity
  test, `tests/rules`) and `sanitize-html` from `functions/package.json`. Other functions stay as they are.
