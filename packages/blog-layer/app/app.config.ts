import type { IBlogLabels } from '#blog/shared/utils/blog-labels'

/**
 * Blog identity defaults. The site overrides any of these in its own `app.config.ts`;
 * `settings/general` (blog name, description) overrides the name and description at runtime.
 * Arrays merge by concatenation across layers, so list defaults stay empty.
 */
export default defineAppConfig({
  blog: {
    /** Formal name: `og:site_name`, title template, structured data, RSS and OG image fallbacks. */
    name: 'Blog',
    /** Short name: navbar/footer fallback and SEO copy ("Articles by X on Blog."). */
    shortName: 'Blog',
    description: '',
    /** Byline when a post has no author name. */
    defaultAuthor: '',
    /** BCP 47 locale: interface language (built-in `en`, `es`), dates, RSS and JSON-LD `inLanguage`. */
    locale: 'en-US',
    /** Overrides for single interface texts, e.g. `{ latestArticles: 'News' }` (keys in `shared/utils/blog-labels.ts`). */
    labels: {} as Partial<IBlogLabels>,
    home: {
      /** Small line above the home heading (hidden when empty). */
      eyebrow: '',
      /** Highlighted word after the blog name in the home heading (hidden when empty). */
      headingAccent: '',
      /** Home page title; defaults to the "Articles" label in the blog's language. */
      title: '',
      ogDescription: ''
    },
    archive: {
      /** Meta description of `/page/N`, followed by " — page N." (defaults to "More articles from {shortName}"). */
      description: ''
    },
    ogImage: {
      /** Small line above the big word in the accent band (hidden when empty). */
      kicker: '',
      title: 'Blog',
      accentColor: '#382bf0',
      /** Wordmark at the top of the accent band, a path in the site's `public/` (hidden when empty). */
      logo: ''
    },
    /** Publisher in the `Organization` JSON-LD (falls back to the blog name and URL). */
    organization: {
      name: '',
      url: '',
      sameAs: [] as string[]
    }
  }
})
