# blog-kit

Reusable Firebase blog, published as npm packages. Each site is its own repo that installs these
packages and only keeps its brand, assets and deploy config.

| Package | Status | What it is |
| :--- | :--- | :--- |
| [`@giancarlosgza/blog-layer`](packages/blog-layer) | 0.4.6 | The blog: pages under `blog.basePath`, `/api/blog/*`, RSS, sitemap, SEO. Embeds into any Nuxt site that uses `@colorffy/css` |
| [`@giancarlosgza/blog-site-layer`](packages/blog-site-layer) | 0.4.6 | A standalone blog site: the blog layer plus app shell, navbar/footer, PWA, robots, fonts, analytics |
| [`@giancarlosgza/blog-core`](packages/blog-core) | 0.4.6 | Firestore models, URL/date/SEO/text helpers and the post HTML sanitizer, shared by every package |
| [`@giancarlosgza/blog-admin-layer`](packages/blog-admin-layer) | 0.4.6 | The admin app: editor, workflow, media, authors, tags, settings, analytics, AI tools. Runs as its own SSR app |
| [`@giancarlosgza/blog-firebase`](packages/blog-firebase) | 0.4.6 | Firestore/Storage rules, indexes and the scheduled-publish Cloud Function |
| [`@giancarlosgza/blog-deploy`](packages/blog-deploy) | 0.4.6 | CLI that provisions a site on a Docker VPS: nginx, TLS, port, deploy script, env files, GitHub settings |

Which one to install:
- **A blog is the whole site** (e.g. blog.colorffy.com): `@giancarlosgza/blog-site-layer`.
- **A blog inside another site** (e.g. a landing page with `/blog`): `@giancarlosgza/blog-layer`
  with `blog: { basePath: '/blog' }`.
- **The admin** for either, on its own domain: `@giancarlosgza/blog-admin-layer`.
- **The Firebase project** (rules, indexes, Cloud Functions), deployed from the admin repo:
  `@giancarlosgza/blog-firebase`.

The Firestore data contract is in [`docs/schema.md`](docs/schema.md).

To start a new blog, create repos from the starters, which only hold the brand and deploy setup:
[blog-starter](https://github.com/giancarlosgza/blog-starter) (the public blog) and
[blog-admin-starter](https://github.com/giancarlosgza/blog-admin-starter) (the admin, plus the Firebase
rules, indexes and functions).

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
packages/blog-deploy       VPS provisioning CLI and the server deploy script (plain Node, no build)
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

1. Bump `version` in every `packages/*/package.json` (keep them in step), commit and push.
2. Run the **Publish to npm** workflow (Actions tab, or `gh workflow run publish.yml -f package=all`). It
   lints, tests, then packs and stages each package in dependency order (blog-core, blog-firebase,
   blog-layer, blog-admin-layer, blog-site-layer, blog-deploy) with provenance (it needs the repository to
   stay public), skipping versions already on npm; `dry-run` packs and checks without staging. `workspace:^` dependencies are published as
   `^<version>`.
3. Approve each version in the npmjs.com **Staged Packages** tab in the same order.
4. In each site, bump the package (`npm run install:latest`) and push once the release is a day old:
   the sites' `npm audit signatures` (CI and Dockerfile) follows the same one-day rule as installs.

The workflow signs in with npm trusted publishing, so no npm token is stored. Each package needs it once:
npmjs.com > the package > Settings > Trusted publishing > GitHub Actions, with owner `giancarlosgza`,
repository `blog-kit`, workflow `publish.yml`, environment `Development` and the **npm stage publish**
permission. The `Development` environment must exist in the repository settings; it needs no secrets.
`pnpm publish:layers` (with `npm login`) still works from a local checkout.

### Upgrading a site to 0.5.0
- The layers need Nuxt 4.6.1 or later and Node 24.15 or later (`@nuxtjs/robots` 7, `@nuxtjs/sitemap` 9 and
  `nuxt-og-image` 7, which move to Site Config 5).
- Generated OG images sign their URLs with `NUXT_APP_SECRET` (at least 32 characters; create one with
  `npx nuxt-og-image generate-secret`). Rename `NUXT_OG_IMAGE_SECRET` in `.env` and on the server:
  the old name still works but logs a deprecation warning. Existing OG image URLs change, so purge any
  cached HTML (Cloudflare) after deploying.
- `@nuxt/fonts` 1 serves font files from `/_nuxt/fonts/` and fails production builds when a font
  download fails. Remove any `fonts.assets.prefix` from the site's `nuxt.config.ts`.
- Sites that declare their own `@nuxt/fonts`, `@nuxtjs/robots` or `@nuxtjs/sitemap` should move them to
  the layers' versions (1.0.1, 7.0.2 and 9.1.0). Their own sitemap sources import
  `defineSitemapEventHandler` from `#sitemap/server`.
- `@vueuse/*` 15 and, in the blog layer, `firebase-admin` 14. The admin layer stays on `firebase-admin`
  13 and `firebase` 12 until `nuxt-vuefire` supports the new majors.

### Upgrading a site to 0.4.6
- `blog-deploy`'s `deploy.sh` mounts the service account only when the key file exists (apps without the
  Admin SDK can deploy with it) and limits each container's logs to 3 files of 10 MB. Rerun
  `npx blog-deploy site` to install it on the server.

### Upgrading a site to 0.4.5
- `blog-deploy`: containers run as a non-root user, and the service account uploaded by `secrets` was
  readable by root only, so Firestore reads failed with `EACCES` (the blog answered 503). `deploy.sh` now
  makes the key file owned by the image's user (still mode 600) before each deploy, and `secrets` keeps the
  owner when it updates a key. Rerun `npx blog-deploy site` to install the new `deploy.sh` on the server.

### Upgrading a site to 0.4.4
- The admin and site layers load the Colorffy default fonts (DM Sans, Plus Jakarta Sans) from fontsource;
  before, they were turned off and pages fell back to system fonts. Remove any `fonts.families` entries for
  these two names in the site: the layer's entries take precedence. Sites using other fonts are unaffected.
- `@giancarlosgza/blog-deploy` ships the `deploy-site` Claude Code skill (see its README).

### Upgrading a site to 0.4.3
- The admin reads its own URL from the site config, so `NUXT_SITE_URL` sets it at runtime, as on the blog
  sites. `NUXT_PUBLIC_SITE_URL` keeps working; rename it in `.env` and `nuxt.config.ts` when convenient.
- The admin's blog URL can be set as `NUXT_BLOG_URL`; `NUXT_PUBLIC_BLOG_URL` keeps working.

### Upgrading a site to 0.4.2
- `toSlug` keeps the base letter of accented characters (`¿cuál?` becomes `cual`, it used to drop the letter).
  Existing posts keep their slugs; heading anchors in accented headings get the corrected ids.
- The admin's Save draft button saves again, and the new post slug can be edited (it follows the title until
  changed, then "Use title" restores it).
- Gemini 3.7 Flash is gone from the AI tools; a saved 3.7 choice falls back to 3.8 Flash.

### Upgrading a site to 0.4.0
The blog and site layers are translatable: set `blog.locale` (e.g. `'es-MX'`) for the built-in Spanish texts
and dates, and `blog.labels` for single overrides. Nothing changes for English sites; `blog.home.title` and
`blog.pwa.installDescription` now default to the label in the blog's language when left empty.

### Upgrading a site to 0.3.0
The admin layer's login page is now a neutral card, and its split layout moved out of the layer:
- `AuthSplitLayout`, `AuthSocialButtons`, `AuthCardWall` and the `admin.login.wallLabel` / `wallNote` /
  `wallLink` defaults are gone. A site that wants that design keeps its own copies next to its own
  `app/pages/auth/login.vue` (the Colorffy admin does).
- Custom login pages sign in through `useAdminSignIn()` (`user`, `error`, `loading`, `redirectTo`,
  `signInWithGoogle`, `signInWithEmail`, `signOut`).
- `useDateFormat` is `useAdminDateFormat` (since 0.2.1).
- The admin layer pre-bundles `@giancarlosgza/blog-core/sanitize` itself; drop any site-level
  `vite.optimizeDeps.include` added for it on 0.2.x.

### Upgrading a site to 0.2.0
Models, widget types and the shared helpers moved from the layers' `shared/` to `@giancarlosgza/blog-core`:
- Add `@giancarlosgza/blog-core` to the site's dependencies and import `WidgetDescriptor` and the models
  from it (they were `#blog/shared/widgets/types`, `#admin/shared/widgets/types`, `#.../shared/models/*`).
- `sanitizePostHtml` / `sanitizeBlogHtml` come from `@giancarlosgza/blog-core/sanitize`.
- Admin repo: point `firebase.json` at the `@giancarlosgza/blog-firebase` rules and indexes, export
  `createPublishScheduledPosts()` from `functions/index.js`, and delete the local copies
  (`functions/publish-scheduled.js`, `functions/sanitize-post-html.js`, their tests, the sanitizer parity
  test, `tests/rules`) and `sanitize-html` from `functions/package.json`. Other functions stay as they are.
