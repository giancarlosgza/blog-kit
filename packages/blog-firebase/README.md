# @giancarlosgza/blog-firebase

The Firebase side of the blog packages: Firestore and Storage security rules, Firestore indexes and the
scheduled-publish Cloud Function. Install it in the repo that deploys the Firebase project (usually the
admin), so rules, indexes and functions upgrade with the layers.

The data contract is described in [`docs/schema.md`](https://github.com/giancarlosgza/blog-kit/blob/main/docs/schema.md).

## Rules and indexes

```bash
npm install -D @giancarlosgza/blog-firebase
```

Point `firebase.json` at the package files:

```json
{
  "firestore": {
    "rules": "node_modules/@giancarlosgza/blog-firebase/firestore.rules",
    "indexes": "node_modules/@giancarlosgza/blog-firebase/firestore.indexes.json"
  },
  "storage": {
    "rules": "node_modules/@giancarlosgza/blog-firebase/storage.rules"
  }
}
```

Staff access comes from `admins/{uid}.role` (`admin` or `editor`) in Firestore; the Storage rules read
it too. To customize the rules, copy the files into the repo instead.

## Scheduled publishing

Publishes posts whose `status` is `scheduled` once `publishAt` has passed, with the same steps as the
admin's publish route (sanitized body into `postContents`, status, history event). It runs hourly.

In the functions codebase, add this package as a regular dependency next to `firebase-admin` and
`firebase-functions` (Cloud Build skips devDependencies):

```js
// functions/index.js
const { createPublishScheduledPosts } = require('@giancarlosgza/blog-firebase')

exports.publishScheduledPosts = createPublishScheduledPosts({ region: 'us-central1' })
```

Any `onSchedule` option (`schedule`, `region`, `timeZone`, `memory`...) can be passed. The Admin SDK is
initialized on the first run when the codebase has not done it. `publishDuePosts(db, now)` and
`publishScheduledPost(db, slug, now)` are exported for custom triggers and tests.

## Development

`pnpm test:rules` (from the repo root) runs the rules tests on the Firestore and Storage emulators.
It needs the Firebase CLI and Java.
