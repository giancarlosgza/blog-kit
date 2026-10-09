import type { NuxtPage } from 'nuxt/schema'
import { addServerHandler, createResolver, defineNuxtModule, extendPages } from 'nuxt/kit'
import { joinBlogPath, normalizeBasePath } from './shared/utils/blog-path'

export interface BlogModuleOptions {
  /** Where the blog mounts: `/` for a standalone blog, e.g. `/blog` inside another site. Build time. */
  basePath: string
  /** Layout for the blog pages; defaults to the site's `default` layout. */
  layout?: string
}

declare module 'nuxt/schema' {
  interface NuxtConfig {
    blog?: Partial<BlogModuleOptions>
  }
  interface NuxtOptions {
    blog: BlogModuleOptions
  }
}

/**
 * Mounts the blog under `blog.basePath`: its pages (named `blog`, `blog-post`, `blog-archive`,
 * `blog-tag`, `blog-author`, `blog-series`), the RSS feed at `<basePath>/rss.xml` and the SWR
 * route rules. The API always lives under `/api/blog/*`. Exposes the normalized base path as
 * `runtimeConfig.public.blog.basePath` for links, canonicals, RSS and the sitemap.
 */
export default defineNuxtModule<BlogModuleOptions>({
  meta: { name: 'blog', configKey: 'blog' },
  defaults: { basePath: '/' },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const basePath = normalizeBasePath(options.basePath)
    const path = (relative: string) => joinBlogPath(basePath, relative)

    nuxt.options.runtimeConfig.public.blog = { basePath: basePath || '/' }

    extendPages((pages) => {
      const page = (name: string, routePath: string, file: string): NuxtPage => ({
        name,
        path: routePath,
        file: resolve(`./app/blog-pages/${file}.vue`),
        ...(options.layout ? { meta: { layout: options.layout } } : {})
      })

      pages.push(
        page('blog', path('/'), 'home'),
        page('blog-archive', path('/page/:page'), 'archive'),
        page('blog-tag', path('/tags/:tag'), 'tag'),
        page('blog-author', path('/authors/:slug'), 'author'),
        page('blog-series', path('/series/:slug'), 'series'),
        page('blog-post', path('/:slug'), 'post')
      )
    })

    addServerHandler({ route: path('/rss.xml'), handler: resolve('./server/handlers/rss.xml.ts') })

    // Firestore-backed pages are cached like the /api data they render (5 min). Posts are cached
    // at the API layer only: Nitro resolves route-level cache per handler, and the catch-all
    // renderer matches any single-segment rule, which would swr-cache every rendered page.
    // Rules the site defines for the same paths win.
    const swr = { swr: 300 }
    nuxt.options.routeRules = {
      [path('/')]: swr,
      [path('/page/**')]: swr,
      [path('/authors/**')]: swr,
      [path('/tags/**')]: swr,
      [path('/series/**')]: swr,
      ...nuxt.options.routeRules
    }
  }
})
