/** A one-click prompt on the AI recommendations page. */
export interface IAdminAiChip {
  label: string
  prompt: string
}

/**
 * Admin identity defaults. The site overrides any of these in its own `app.config.ts`.
 * Arrays merge by concatenation across layers, so list defaults stay empty.
 */
export default defineAppConfig({
  admin: {
    /** Admin app name: PWA prompt and app titles. */
    name: 'Blog Admin',
    /** Public blog name in page descriptions, the dashboard and the SEO preview. */
    blogName: 'Blog',
    /** Owner shown in the sidebar header and the login footer. */
    organization: 'Blog',
    /** Byline when a post has no author name. */
    defaultAuthor: '',
    /** `NuxtLoadingIndicator` color (any CSS background). */
    loadingColor: 'var(--cffy-secondary-base-fixed)',
    /** Accent color for new posts and the default settings color. */
    defaultColor: '#6366f1',
    login: {
      staffNotice: 'Access is limited to the blog staff. Use the account linked to your author profile.',
      /** Label of the login aside (AuthCardWall). */
      wallLabel: 'Blog',
      /** Line shown over the aside (hidden when empty). */
      wallNote: '',
      wallLink: {
        text: '',
        url: ''
      }
    },
    legal: {
      termsUrl: '',
      privacyUrl: ''
    },
    ai: {
      /** "the X blog (host)" as the editor prompts name it. */
      blog: 'the blog',
      audience: 'its readers',
      /** What the blog covers, for the content strategist prompt. */
      coverage: 'the topics of its existing posts',
      /** Topic rule appended to the strategist prompt. */
      topics: 'Stay on the topics the blog already covers.',
      /** One-click prompts on the recommendations page. */
      chips: [] as IAdminAiChip[]
    }
  }
})
