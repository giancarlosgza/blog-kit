# Firestore Database Schema - Colorffy Blog

Collections and documents of the **Colorffy Blog** project (`colorffy-blog`). The data is written by
[`blog-admin`](../../blog-admin), which also owns `firestore.rules` and `firestore.indexes.json`; this
blog only reads it. TypeScript models live in `packages/blog-layer/shared/models/` (kept in sync with blog-admin).

**Dates**: older documents store Unix-ms numbers, blog-admin writes Firestore `Timestamp`s.
Readers must accept both (`useDateValue().normalizeDateValue` handles Date, Timestamp,
`{ seconds }`, seconds or ms numbers and ISO strings).

The database has 7 collections.

---

## 1. `admins`
Staff access records for blog-admin, keyed by Firebase Auth UID.

* **Document ID**: Firebase Auth UID

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `role` | `'admin' \| 'editor'` | Access level. `admin` = full access (settings, users); `editor` = content only (posts, authors, tags). |
| `isAdmin` | `boolean` | Kept in sync with `role === 'admin'`. |
| `name` / `displayName` | `string` | Denormalized identity for the admin Users page. |
| `email` | `string` | Denormalized email. |
| `createdAt` | `Timestamp` | Creation time. |

The old `isEnabled` / `IsEnabled` flag is replaced by `role`: a user is staff only when the doc exists and `role` is `admin` or `editor`.

---

## 2. `authors`
Profile details for blog authors.

* **Document ID**: Firebase Auth UID of the author.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Display name. |
| `slug` | `string` | URL slug of the public author page (`/authors/{slug}`) and sitemap entry. |
| `description` | `string` | Short bio. |
| `photoURL` | `string` | Profile photo URL. |
| `profileLink` | `string` | External social or personal link. |
| `username` | `string` | *Legacy*. Handle shown as the profile link text; not managed by blog-admin. |
| `createdAt` / `updatedAt` | `Timestamp` | Creation and last update time. |

---

## 3. `posts`
Post metadata (listing cards, SEO, filters).

* **Document ID**: URL slug of the post (e.g. `creating-accessible-texts-for-websites`)

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `title` | `string` | Post title. |
| `shortText` | `string` | Summary, used as the meta description unless `seoDescription` is set. |
| `isPublished` | `boolean` | Whether the post is public. |
| `createdAt` | `number` \| `Timestamp` | Creation time; sort key for the listings. |
| `updatedAt` | `number` \| `Timestamp` | Last update time. |
| `authorUuid` | `string` | UID of the author (`authors/{uid}`). |
| `authorName` | `string` | Denormalized author name. |
| `authorPhotoURL` | `string` | Denormalized author photo, so cards need no author read. |
| `authorSlug` | `string` | Denormalized author slug for linking to `/authors/{slug}`. |
| `author` | `string` | *Legacy* author display name on older documents. |
| `color` | `string` | Accent color of the post (list icon, article highlight). |
| `imageURL` | `string` | Public URL of the cover image. |
| `imagePath` | `string` | Cloud Storage path of the cover image. |
| `imageAlt` | `string` | Cover image alt text. |
| `tags` | `string[]` | Tag names (IDs of `tags` docs, e.g. `["CSS", "Design"]`). |
| `seoTitle` | `string` | *Optional*. Search/social title override; falls back to `title`. |
| `seoDescription` | `string` | *Optional*. Meta description override; falls back to `shortText`, then a body excerpt. |
| `ogImageURL` | `string` | *Optional*. Social share image; falls back to the cover (`imageURL`), then the generated OG image. |
| `canonicalURL` | `string` | *Optional*. Absolute canonical URL for republished content; defaults to the post URL. |
| `noindex` | `boolean` | *Optional*. Hides the post from search engines (`robots: noindex,follow`) and the sitemap while keeping it public. |
| `seriesSlug` | `string` | *Optional*. ID of the `series/{slug}` doc the post belongs to. |
| `seriesOrder` | `number` | *Optional*. 1-based part number within the series. |
| `featured` | `boolean` | *Optional*. Shown in the home hero (published posts only, max 3). |
| `featuredOrder` | `number` | *Optional*. Hero order among featured posts, lower first; ties fall back to newest first. |

---

## 4. `postContents`
Published HTML body, split from `posts` to keep metadata queries small.

* **Document ID**: Same slug as the `posts` document.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `contents` | `string` | HTML body, sanitized by blog-admin on publish (`sanitizePostHtml`). |
| `updatedAt` | `number` \| `Timestamp` | Last publish time. |

---

## 5. `postDrafts`
Working copy of the body while editing in blog-admin. **Staff only** in the rules; the public blog never reads it.

* **Document ID**: Same slug as the `posts` document.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `contents` | `string` | Draft HTML body. |
| `updatedAt` | `number` \| `Timestamp` | Last draft save. |

---

## 6. `tags`
Tag catalogue used by the tag chips, `/tags/[tag]` and the sitemap.

* **Document ID**: Tag display name (e.g. `CSS`), the same value stored in `posts.tags`.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Display name. |
| `slug` | `string` | URL-safe slug. |
| `count` | `number` | Number of posts using the tag (chips are ordered by it). |
| `createdAt` / `updatedAt` | `Timestamp` | Creation and last update time. |

---

## 7. `series`
Ordered sets of posts, shown on `/series/[slug]` and in the series block of each part.

* **Document ID**: URL slug (e.g. `color-basics`), the value stored in `posts.seriesSlug`.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Display name. |
| `slug` | `string` | Same as the document ID. |
| `description` | `string` | *Optional*. Shown on the series page and as its meta description. |
| `createdAt` / `updatedAt` | `Timestamp` | Creation and last update time. |

---

## 8. `settings`
Site-wide configuration.

### Document: `general`

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `blogName` | `string` | Blog name (navbar, footer, home title). |
| `blogDescription` | `string` | Meta description (footer, home). |
| `blogKeywords` | `string` | Comma-separated meta keywords. |
| `blogURL` | `string` | Base URL of the blog. |
| `logoURL` | `string` | Logo URL. |
| `primaryColor` | `string` | Brand primary color. |
| `backgroundColor` | `string` | Default background color. |

---

## Security rules (summary)
Source: `blog-admin/firestore.rules`. Staff = authenticated user whose `admins/{uid}` doc has `role` `admin` or `editor`; admin = `role == 'admin'`.

| Collection | Read | Write |
| :--- | :--- | :--- |
| `posts` | Public when `isPublished == true`; staff always | Staff |
| `postContents` | Public only when the parent `posts/{slug}` is published; staff always | Staff |
| `postDrafts` | Staff | Staff |
| `authors` | Public | Staff |
| `tags` | Public | Staff |
| `series` | Public | Staff |
| `settings` | Public | Admin |
| `admins` | `get`: staff or the user's own doc; `list`: admin | Admin |
