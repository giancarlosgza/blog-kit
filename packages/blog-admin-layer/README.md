# @giancarlosgza/blog-admin-layer

Nuxt 4 layer for the admin of a Firebase blog: post editor (Tiptap) with drafts, review workflow,
scheduling and publishing, media library, authors, tags, series, settings, admin users, Plausible
analytics and Gemini AI tools (titles, excerpts, tags, SEO, rewrites, content recommendations).
It runs as its own SSR app (e.g. `blog-admin.example.com`) next to the public blog, against the
same Firebase project. The Firestore schema is in [`docs/schema.md`](https://github.com/giancarlosgza/blog-kit/blob/main/docs/schema.md).

## Use it

```bash
npm install @giancarlosgza/blog-admin-layer
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@giancarlosgza/blog-admin-layer'],
  css: ['@/assets/css/material-symbols.generated.css'],
  site: { url: process.env.NUXT_PUBLIC_SITE_URL, name: 'My Blog Admin' },
  pwa: { manifest: { name: 'My Blog Admin', short_name: 'Admin' }, workbox: { cacheId: 'my-blog-admin' } }
})
```

```json
// package.json
"scripts": {
  "prebuild": "blog-admin-subset-icons",
  "predev": "blog-admin-subset-icons"
}
```

Environment (see `playground/admin/.env.example`):
- `NUXT_PUBLIC_VUEFIRE_CONFIG_*`: Firebase web config; `GOOGLE_APPLICATION_CREDENTIALS`: service account.
- `NUXT_PUBLIC_SITE_URL`: the admin's own origin. It must match the deployed URL, because
  `/api/ai/generate` rejects other origins.
- `NUXT_PUBLIC_BLOG_URL`: the public blog URL, including its base path when the blog is embedded.
- Optional: `NUXT_GEMINI_KEY` (AI tools), `NUXT_PLAUSIBLE_TOKEN` + `NUXT_PUBLIC_PLAUSIBLE_*` (analytics).

Public files the site provides: `favicon.ico`, `logo-wordmark.svg`, `icon-pwa.png`, `avatar.png` and the
PWA icons (optionally generated with `pwa: { pwaAssets: { config: true } }` and a `pwa-assets.config.ts`).

## Customize

- **Brand:** `admin.*` in the site's `app/app.config.ts` (names, default post color, login texts, legal
  links, AI prompt context and recommendation chips). Every key is documented in this package's `app/app.config.ts`.
- **Login aside:** the layer shows a gradient with the blog name; replace it with an
  `app/components/auth/CardWall.vue` of your own.
- **Widgets:** editors can insert the widgets the site registers by providing `blogWidgetRegistry`
  (`{ descriptors, preview? }`) from a plugin. Without one, "Insert widget" is hidden.
- **Styles:** the layer loads `@colorffy/css` and the admin styles first, so site tokens in the same
  cascade layers (e.g. `@layer abstracts.tokens { :root { ... } }`) override the defaults.

Firestore and Storage rules, indexes and the scheduled-publish Cloud Function are not part of this
package yet; deploy them from the admin site.

Inside the layer, files import each other through the `#admin/...` alias.
