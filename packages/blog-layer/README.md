# @giancarlosgza/blog-layer

Nuxt 4 layer that adds a Firestore-backed blog to a site under a configurable base path: home feed,
posts, tags, authors, series and paginated archive pages, cached read endpoints over the Firebase
Admin SDK, RSS, a sitemap source and per-page SEO (meta, JSON-LD, generated OG images), styled
with `@colorffy/ui` + `@colorffy/css`.

It only adds the blog. The site keeps its own app shell (app.vue, layout, header, footer) and must
load `@colorffy/css` itself. For a standalone blog site, install
[`@giancarlosgza/blog-site-layer`](../blog-site-layer) instead, which wraps this layer in a full shell.

The Firestore schema it reads is in [`docs/schema.md`](https://github.com/giancarlosgza/blog-kit/blob/main/docs/schema.md); content is written by
the blog admin.

## Add a blog to a site

```bash
npm install @giancarlosgza/blog-layer
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@giancarlosgza/blog-layer'],
  blog: {
    basePath: '/blog' // build time; '/' mounts the blog at the site root
  },
  css: ['@/assets/scss/main.scss', '@/assets/css/material-symbols.generated.css'],
  site: { url: process.env.NUXT_SITE_URL, name: 'Acme' }
})
```

```json
// package.json
"scripts": {
  "prebuild": "blog-layer-subset-icons",
  "predev": "blog-layer-subset-icons"
}
```

Then point `GOOGLE_APPLICATION_CREDENTIALS` at the Firebase project's service account. The account
alone selects the project.

## What it mounts

| Route | Name | Page |
| :--- | :--- | :--- |
| `<basePath>` | `blog` | Home feed (featured posts, tag filter, load more) |
| `<basePath>/:slug` | `blog-post` | Post |
| `<basePath>/page/:page` | `blog-archive` | Paginated archive (`/page/1` redirects home) |
| `<basePath>/tags/:tag` | `blog-tag` | Posts with a tag |
| `<basePath>/authors/:slug` | `blog-author` | Author and their posts |
| `<basePath>/series/:slug` | `blog-series` | Series parts in reading order |
| `<basePath>/rss.xml` | | RSS 2.0 feed |
| `/api/blog/*` | | Cached Firestore reads (always at this path) |

Link to the blog with route names (`{ name: 'blog' }`) or `useBlogPath().blogPath('/tags/css')`.
Blog pages use the site's `default` layout; set `blog.layout` to use another one.

## Options

- **`blog.basePath`** (`nuxt.config`, default `/`): where the blog mounts.
- **`blog.layout`** (`nuxt.config`, optional): layout for the blog pages.
- **Language:** `blog.locale` in `app/app.config.ts` (default `'en-US'`, e.g. `'es-MX'`) sets the interface
  language (built-in English and Spanish), date formatting, the RSS `<language>` and JSON-LD `inLanguage`.
  Override single texts with `blog.labels` (keys in `shared/utils/blog-labels.ts`); `useBlogLabels().t(key)`
  reads them in site code. For Colorffy UI's own component texts, also set
  `colorffyUI: { locale: 'es-MX', labels: 'es' }` in `nuxt.config`.
- **Brand:** override `blog.*` in the site's `app/app.config.ts`. Every key is documented in this
  package's `app/app.config.ts`. `settings/general` in Firestore overrides the name and description.
- **Models and helpers:** add `@giancarlosgza/blog-core` to the site's own dependencies when site code
  imports its types (e.g. `WidgetDescriptor`) or calls its auto-imported helpers; with pnpm a layer's
  dependencies are not visible to the site.
- **Widgets:** posts can embed `<div data-blog-widget="key" data-props='{...}'>`. A site registers
  widgets by providing `blogWidgets` (`{ [key]: { descriptor, component } }`) from a plugin; without
  one, placeholders render an "unavailable" fallback.
- **Icons:** `blog-layer-subset-icons` scans the site, its `layers/*` and the installed blog layers
  for Material Symbols in use and writes `public/icon-fonts/*` plus
  `app/assets/css/material-symbols.generated.css` in the site.

Inside the layer, files import each other through the `#blog/...` alias: `~` and `#shared` resolve
to the site. Shared models and helpers come from `@giancarlosgza/blog-core`; its helpers (`toBlogUrl`,
`toDateMs`, `resolvePostSeo`...) are auto-imported in app and server code.
