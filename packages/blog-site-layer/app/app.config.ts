export interface IBlogLink {
  text: string
  to?: string
  href?: string
}

/**
 * App shell defaults, merged into the blog layer's `blog.*` brand config.
 * Arrays merge by concatenation across layers, so list defaults stay empty.
 */
export default defineAppConfig({
  blog: {
    loadingColor: 'var(--cffy-secondary-base-fixed)',
    pwa: {
      installDescription: 'Read the latest articles from your home screen.'
    },
    legal: {
      cookiesUrl: ''
    },
    navLinks: [] as IBlogLink[],
    footerLinks: [] as IBlogLink[]
  }
})
