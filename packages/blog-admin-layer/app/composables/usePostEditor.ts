import type { IPost, IPostContent } from '@giancarlosgza/blog-core'
import type { IPostWorkflowResponse } from './usePostWorkflow'
import { deleteField, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

/** Local editor form state for `posts/{slug}`; mapped to IPost fields on save. */
export interface IPostEditorForm {
  title: string
  shortText: string
  authorId: string
  authorName: string
  authorUuid: string
  imageURL: string
  imageAlt: string
  color: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  ogImageURL: string
  canonicalURL: string
  noindex: boolean
  seriesSlug: string
  seriesOrder: number | null
  /** Creating a series inline: its `series/{slug}` doc is written from these fields on save. */
  isNewSeries: boolean
  newSeriesName: string
  newSeriesDescription: string
  featured: boolean
  featuredOrder: number | null
}

/**
 * Loads/saves a single post: metadata (`posts/{slug}`) and the working body
 * (`postDrafts/{slug}`). Workflow steps (submit, publish, …) go through the server routes
 * (see usePostWorkflow) and are patched in with `applyWorkflow`.
 */
export function usePostEditor(slug: MaybeRefOrGetter<string>) {
  const db = useFirestore()

  const slugRef = computed(() => toValue(slug))
  const meta = ref<IPost | null>(null)
  const draftHtml = ref<string>('')
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function load() {
    const id = slugRef.value
    if (!id)
      return

    isLoading.value = true
    try {
      const [postSnap, draftSnap, contentSnap] = await Promise.all([
        getDoc(doc(db, 'posts', id)),
        getDoc(doc(db, 'postDrafts', id)),
        getDoc(doc(db, 'postContents', id))
      ])

      meta.value = postSnap.exists() ? ({ id, ...postSnap.data() } as IPost) : null
      // Prefer the working draft; fall back to the published body for first-time edits.
      draftHtml.value = draftSnap.exists()
        ? ((draftSnap.data() as IPostContent).contents ?? '')
        : (contentSnap.exists() ? ((contentSnap.data() as IPostContent).contents ?? '') : '')
    } finally {
      isLoading.value = false
    }
  }

  /** Merge-writes `data`; `removed` fields are deleted from the doc (optional SEO overrides left blank). */
  async function saveMeta(data: Partial<IPost>, removed: (keyof IPost)[] = []) {
    const id = slugRef.value
    isSaving.value = true
    try {
      const now = Timestamp.now()
      const exists = meta.value !== null
      const payload: Record<string, unknown> = {
        ...data,
        updatedAt: now,
        ...(exists ? {} : { createdAt: now, isPublished: data.isPublished ?? false })
      }
      const deletions = Object.fromEntries(removed.map(field => [field, deleteField()]))
      await setDoc(doc(db, 'posts', id), { ...payload, ...deletions }, { merge: true })
      const next = { ...(meta.value ?? { isPublished: false } as IPost), id, ...payload } as IPost
      for (const field of removed)
        delete next[field]
      meta.value = next
    } finally {
      isSaving.value = false
    }
  }

  async function saveDraft(html: string) {
    const id = slugRef.value
    isSaving.value = true
    try {
      await setDoc(doc(db, 'postDrafts', id), { contents: html, updatedAt: Timestamp.now() }, { merge: true })
      draftHtml.value = html
    } finally {
      isSaving.value = false
    }
  }

  /** Patches the loaded metadata with a workflow route response (submit, publish, …). */
  function applyWorkflow(response: IPostWorkflowResponse) {
    if (meta.value)
      meta.value = applyWorkflowResponse(meta.value, response)
  }

  return { slug: slugRef, meta, draftHtml, isLoading, isSaving, load, saveMeta, saveDraft, applyWorkflow }
}
