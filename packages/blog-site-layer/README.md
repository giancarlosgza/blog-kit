# @giancarlosgza/blog-site-layer

Nuxt 4 layer for a standalone blog site: [`@giancarlosgza/blog-layer`](../blog-layer) plus the app
shell around it.

| Adds | Details |
| :--- | :--- |
| App shell | `app.vue` (title template, RSS link, Organization/WebSite JSON-LD, Plausible), `error.vue`, `default` layout |
| Navigation | Generic `TheNavbar` and `TheFooter` (blog name, logo from `settings/general`, `navLinks`/`footerLinks`) |
| UI | Cookie banner, PWA install prompt, scroll-to-top button, theme picker |
| Styles | The `@colorffy/css` framework, loaded before the blog and site styles |
| Site config | Security and static-asset headers, robots, sitemap styling, fonts, PWA defaults |

## Use it

```bash
npm install @giancarlosgza/blog-site-layer
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@giancarlosgza/blog-site-layer'],
  css: ['@/assets/css/material-symbols.generated.css'],
  site: { url: process.env.NUXT_SITE_URL, name: 'My Blog' },
  pwa: { manifest: { name: 'My Blog', short_name: 'Blog' }, workbox: { cacheId: 'my-blog' } }
})
```

```json
// package.json
"scripts": {
  "prebuild": "blog-layer-subset-icons",
  "predev": "blog-layer-subset-icons"
}
```

The blog mounts at `/` unless the site sets `blog.basePath`.

- **Brand:** `blog.*` in the site's `app/app.config.ts`. This layer adds `loadingColor`,
  `pwa.installDescription`, `legal.cookiesUrl`, `navLinks` and `footerLinks` to the blog layer's keys.
- **Navbar and footer:** replace them by adding `TheNavbar.vue` / `TheFooter.vue` to the site's
  `app/components/`.
- **Brand styles:** CSS the site adds to `css` loads after the framework and the blog styles, so
  tokens in the same cascade layers win: `@layer base.tokens { :root { ... } }` for the Colorffy
  defaults (`--cffy-*`). Start the site's first stylesheet with the full layer order
  (`@layer reset, abstracts, base, components, layout, utilities, media-queries, overrides, pages;`):
  in dev the site's styles can load before the layer's.

Inside this layer, its own files are imported through `#blog-site/...`.
