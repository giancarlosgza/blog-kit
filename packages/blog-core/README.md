# @giancarlosgza/blog-core

Framework-free code shared by the blog packages: the Firestore models, URL/date/SEO/text helpers and
the post HTML sanitizer. The blog and admin layers depend on it (and auto-import its helpers), and the
scheduled publisher in `@giancarlosgza/blog-firebase` uses the same sanitizer as the admin's publish
route. Ships ESM and CommonJS builds with types.

The data contract is described in [`docs/schema.md`](https://github.com/giancarlosgza/blog-kit/blob/main/docs/schema.md).

## Use it

```bash
npm install @giancarlosgza/blog-core
```

```ts
import type { IPost } from '@giancarlosgza/blog-core'
import { resolvePostSeo, toBlogUrl, toDateMs } from '@giancarlosgza/blog-core'
import { sanitizePostHtml } from '@giancarlosgza/blog-core/sanitize'
```

## What it exports

| Entry | Exports |
| :--- | :--- |
| `@giancarlosgza/blog-core` | Models: `IPost`, `IAuthor`, `ITag`, `ISeries`, `ISettings`, `IFirestoreDateValue`, widget types (`WidgetDescriptor`...) |
| | URLs: `normalizeBasePath`, `joinBlogPath`, `toBlogUrl` |
| | Dates: `toDateMs` (Date, Timestamp, `{ seconds }`, seconds/ms, ISO string → Unix ms) |
| | SEO: `resolvePostSeo`, `SEO_TITLE_MAX`, `SEO_DESCRIPTION_MAX` |
| | Text: `toSlug`, `resolveAuthorName`, `htmlToExcerpt` |
| `@giancarlosgza/blog-core/sanitize` | `sanitizePostHtml` (publish time), `sanitizeBlogHtml` (render time, also keeps h2/h3 ids) |

The sanitizers live in their own entry so code that only needs the models and helpers never bundles
`sanitize-html`.
