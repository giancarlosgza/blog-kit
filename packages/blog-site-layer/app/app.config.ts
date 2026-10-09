/** A labelled link for the default navbar and footer (`to` for internal routes, `href` for external URLs). */
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
    /** `NuxtLoadingIndicator` color (any CSS background). */
    loadingColor: 'var(--cffy-secondary-base-fixed)',
    pwa: {
      installDescription: 'Read the latest articles from your home screen.'
    },
    legal: {
      /** Cookie policy linked from the cookies banner (the link is hidden when empty). */
      cookiesUrl: ''
    },
    /** Default navbar and footer links (sites with their own TheNavbar/TheFooter ignore them). */
    navLinks: [] as IBlogLink[],
    footerLinks: [] as IBlogLink[]
  }
})
