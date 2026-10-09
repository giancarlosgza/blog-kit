import type { IPost } from '#admin/shared/models/post'
import { describe, expect, it } from 'vitest'
import { applyWorkflowResponse } from '#admin/app/composables/usePostWorkflow'
import {
  canSubmitForReview,
  isPostStatus,
  normalizeReviewReasons,
  POST_STATUS_BADGES,
  POST_STATUS_LABELS,
  POST_STATUSES,
  resolvePostStatus,
  restingStatus
} from '#admin/shared/utils/post-status'

describe('resolvePostStatus', () => {
  it('derives legacy docs from isPublished', () => {
    expect(resolvePostStatus({ isPublished: true })).toBe('published')
    expect(resolvePostStatus({ isPublished: false })).toBe('draft')
    expect(resolvePostStatus(null)).toBe('draft')
  })

  it('prefers a known status and ignores unknown ones', () => {
    expect(resolvePostStatus({ isPublished: false, status: 'review' })).toBe('review')
    expect(resolvePostStatus({ isPublished: true, status: 'changes' })).toBe('changes')
    expect(resolvePostStatus({ isPublished: true, status: 'archived' as never })).toBe('published')
  })
})

describe('workflow helpers', () => {
  it('knows every status and has a label and badge for each', () => {
    for (const status of POST_STATUSES) {
      expect(isPostStatus(status)).toBe(true)
      expect(POST_STATUS_LABELS[status]).toBeTruthy()
      expect(POST_STATUS_BADGES[status].variant).toBeTruthy()
    }
    expect(isPostStatus('live')).toBe(false)
  })

  it('submits drafts, change requests and live posts only', () => {
    expect(POST_STATUSES.filter(canSubmitForReview)).toEqual(['draft', 'changes', 'published'])
  })

  it('returns withdrawn posts to where they rest', () => {
    expect(restingStatus(true)).toBe('published')
    expect(restingStatus(false)).toBe('draft')
  })

  it('keeps known reasons once, in the offered order', () => {
    expect(normalizeReviewReasons(['Tone', 'SEO', 'Tone', 'Nope', 3])).toEqual(['SEO', 'Tone'])
    expect(normalizeReviewReasons('SEO')).toEqual([])
  })
})

describe('applyWorkflowResponse', () => {
  const post: IPost = { id: 'p', title: 'P', isPublished: false, status: 'scheduled', publishAt: 5000, review: { round: 2, submittedAt: 1, submittedBy: { uid: 'u', name: 'U' } } }

  it('patches the workflow fields and drops cleared ones', () => {
    const next = applyWorkflowResponse(post, { ok: true, slug: 'p', status: 'published', isPublished: true, publishAt: null, review: null })
    expect(next).toEqual({ id: 'p', title: 'P', isPublished: true, status: 'published' })
    expect(post.status).toBe('scheduled')
  })
})
