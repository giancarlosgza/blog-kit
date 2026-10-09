/** Sample brand; every key is documented in the layer's `app/app.config.ts`. */
export default defineAppConfig({
  blog: {
    name: 'The Playground Blog',
    shortName: 'Playground',
    description: 'Articles rendered by the blog layer.',
    defaultAuthor: 'Playground',
    home: {
      eyebrow: 'Blog layer playground',
      headingAccent: 'Blog'
    },
    navLinks: [
      { text: 'RSS', href: '/rss.xml' }
    ]
  }
})
