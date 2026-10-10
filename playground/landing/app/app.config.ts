/** Blog brand inside a Spanish landing; every key is documented in the blog layer's `app/app.config.ts`. */
export default defineAppConfig({
  blog: {
    name: 'El Blog de Acme',
    shortName: 'Blog de Acme',
    description: 'Noticias y guías de Acme.',
    defaultAuthor: 'Acme',
    // Spanish interface and dates (built-in `es` labels)
    locale: 'es-MX'
  }
})
