import type { IRecommendationContext, IRecommendationCoverage, IRecommendationItem, IRecommendationMonth, IRecommendationResponse, IRecommendationRun, IRecommendationVerdict, RecommendationKind, RecommendationState } from '#admin/shared/models/recommendation'
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { useCurrentUser, useFirestore } from 'vuefire'
import { RECOMMENDATIONS_COLLECTION } from '#admin/shared/models/recommendation'

/** Interfaces */
export interface IRecommendationChip {
  label: string
  prompt: string
}
interface IRecentPost {
  title: string
  tags: string[]
}

/** Constants */
const RUN_TASKS: RecommendationKind[] = ['recommendations', 'analysis']
const MAX_ITEMS = 8
const MAX_CONTEXT_TAGS = 60
const MAX_RECENT_POSTS = 30
const STATES: RecommendationState[] = ['gap', 'trend', 'ok']
const VERDICT_TAGS = ['Gap', 'Trend', 'New'] as const

export const RECOMMENDATIONS_SOURCE_LABEL = '/tags'
export const RECOMMENDATIONS_UNIT_LABEL = 'tag'

// Gemini response schema (OpenAPI subset). One shape for both kinds: an analysis returns an empty items array.
const responseSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING' },
          name: { type: 'STRING' },
          when: { type: 'STRING' },
          why: { type: 'STRING' },
          colors: { type: 'ARRAY', items: { type: 'STRING' } },
          tags: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['kind', 'name', 'when', 'why', 'colors', 'tags']
      }
    },
    months: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          range: { type: 'STRING' },
          note: { type: 'STRING' },
          themes: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                label: { type: 'STRING' },
                badge: { type: 'STRING' },
                state: { type: 'STRING' }
              },
              required: ['label', 'badge', 'state']
            }
          }
        },
        required: ['name', 'range', 'note', 'themes']
      }
    },
    verdicts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tag: { type: 'STRING' },
          text: { type: 'STRING' }
        },
        required: ['tag', 'text']
      }
    },
    gapTags: { type: 'ARRAY', items: { type: 'STRING' } },
    trendTags: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['summary', 'items', 'months', 'verdicts', 'gapTags', 'trendTags']
}

/** Content strategist prompt; `blogName`, `coverage` and `topics` come from the admin brand config. */
function strategistInstruction(blogName: string, coverage: string, topics: string): string {
  return `You are the content strategist of the ${blogName}, which covers ${coverage}. The editor asks what to write next. You answer with concrete post ideas grounded in the tags, their post counts and the recent titles the editor sends you.

Rules:
- Respond ONLY with JSON that matches the schema. No markdown, no commentary.
- ${topics}
- Never repeat a recent title. Extend a top performer with a new angle instead.
- Each item is a post idea: kind is one of Tutorial, Deep dive, Opinion, Explainer, Roundup; name is the working title; when is the suggested week such as "Week 2"; why references the tag counts or the recent titles; colors is always an empty array; tags holds 2 or 3 tags copied from the existing list when possible, lowercase as given.
- When an idea needs a tag that does not exist, still use it and add a verdict with tag "New" that names it.
- Months are the current month and the next two, with 4 to 6 themes each mixing tech trends, seasonal moments relevant to designers, and the blog's own series. Theme state: "gap" when the matching tag count is low for how much people search it, "trend" when it is trending now, "ok" otherwise. The badge is a 1 to 3 word label such as "AI · 2", "Trending", "No tag", "New CSS".
- Verdicts are short and actionable, 1 or 2 sentences each.
- gapTags and trendTags contain only tag names copied exactly from the list sent to you.`
}

/** Helpers */
function cleanString(value: unknown, max = 400): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
function cleanStrings(value: unknown, max = 12): string[] {
  if (!Array.isArray(value))
    return []
  return value.map(v => cleanString(v, 80)).filter(Boolean).slice(0, max)
}
function cleanState(value: unknown): RecommendationState {
  return STATES.includes(value as RecommendationState) ? value as RecommendationState : 'ok'
}
function cleanItem(value: any): IRecommendationItem | null {
  const name = cleanString(value?.name, 160)
  if (!name)
    return null
  return {
    kind: cleanString(value?.kind, 40) || 'Explainer',
    name,
    when: cleanString(value?.when, 60),
    why: cleanString(value?.why, 400),
    colors: [],
    tags: cleanStrings(value?.tags, 6)
  }
}
function cleanMonth(value: any): IRecommendationMonth | null {
  const name = cleanString(value?.name, 40)
  if (!name)
    return null
  const themes = Array.isArray(value?.themes) ? value.themes : []
  return {
    name,
    range: cleanString(value?.range, 40),
    note: cleanString(value?.note, 240),
    themes: themes.map((t: any) => ({ label: cleanString(t?.label, 80), badge: cleanString(t?.badge, 30), state: cleanState(t?.state) })).filter((t: any) => t.label).slice(0, 8)
  }
}
function cleanVerdict(value: any): IRecommendationVerdict | null {
  const text = cleanString(value?.text, 400)
  if (!text)
    return null
  const tag = VERDICT_TAGS.includes(value?.tag) ? value.tag : 'Trend'
  return { tag, text }
}
export function normalizeRecommendationResponse(raw: any): IRecommendationResponse {
  const items = Array.isArray(raw?.items) ? raw.items : []
  const months = Array.isArray(raw?.months) ? raw.months : []
  const verdicts = Array.isArray(raw?.verdicts) ? raw.verdicts : []
  return {
    summary: cleanString(raw?.summary, 800),
    items: items.map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS) as IRecommendationItem[],
    months: months.map(cleanMonth).filter(Boolean).slice(0, 3) as IRecommendationMonth[],
    verdicts: verdicts.map(cleanVerdict).filter(Boolean).slice(0, 5) as IRecommendationVerdict[],
    gapTags: cleanStrings(raw?.gapTags, 20),
    trendTags: cleanStrings(raw?.trendTags, 20)
  }
}

/** Today plus the next two month names, so the prompt and the saved run share one calendar. */
export function buildRecommendationContext(source: string): IRecommendationContext {
  const now = new Date()
  const months = [0, 1, 2].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })
  return { today: now.toISOString().slice(0, 10), months, source }
}

/**
 * Gemini runs for the recommendations page: reads the tag counts and the recent published titles
 * for context, builds the prompt, calls /api/ai/generate in JSON mode and saves the run to Firestore.
 */
export function useRecommendationsAi() {
  const admin = useAppConfig().admin
  const systemInstruction = strategistInstruction(admin.blogName, admin.ai.coverage, admin.ai.topics)
  const db = useFirestore()
  const user = useCurrentUser()
  const selectedModel = useGeminiModel()
  const { models } = useGeminiAi()
  const { isLoading, loadingState, error, errorSafetyRating, resetErrors, generateAiJson, runTask } = useGeminiPrompt(RUN_TASKS)

  const coverage = ref<IRecommendationCoverage[]>([])
  const recentPosts = ref<IRecentPost[]>([])
  const isLoadingCoverage = ref<boolean>(false)
  const coverageError = ref<string | null>(null)

  // `tags/{name}` carries the post count; the recent titles keep Gemini from pitching posts that already exist.
  async function loadCoverage(): Promise<void> {
    isLoadingCoverage.value = true
    coverageError.value = null
    try {
      const [tagsSnapshot, postsSnapshot] = await Promise.all([
        getDocs(collection(db, 'tags')),
        getDocs(query(collection(db, 'posts'), where('isPublished', '==', true), orderBy('createdAt', 'desc'), limit(MAX_RECENT_POSTS)))
      ])
      coverage.value = tagsSnapshot.docs
        .map((tagDoc) => {
          const data = tagDoc.data()
          return { label: String(data.name || tagDoc.id), count: Number(data.count) || 0, trending: 0, state: 'ok' as RecommendationState }
        })
        .sort((a, b) => b.count - a.count)
      recentPosts.value = postsSnapshot.docs.map((postDoc) => {
        const data = postDoc.data()
        return { title: String(data.title || postDoc.id), tags: Array.isArray(data.tags) ? data.tags.map(String) : [] }
      })
    } catch (err: any) {
      coverageError.value = err?.message || 'Could not read the tags.'
    } finally {
      isLoadingCoverage.value = false
    }
  }

  function coverageLines(): string {
    return coverage.value.slice(0, MAX_CONTEXT_TAGS).map(tag => `${tag.label}: ${tag.count}`).join('\n')
  }
  function recentLines(): string {
    return recentPosts.value.map(post => `${post.title}${post.tags.length ? ` [${post.tags.join(', ')}]` : ''}`).join('\n')
  }

  function buildPrompt(kind: RecommendationKind, text: string, context: IRecommendationContext): string {
    const header = `Today is ${context.today}. Plan for ${context.months.join(', ')}.\n\nExisting tags with their published post counts:\n${coverageLines() || 'No tags yet.'}\n\nRecent published titles with their tags:\n${recentLines() || 'No posts yet.'}`
    if (kind === 'analysis') {
      return `${header}\n\nTask: analyze the coverage of these tags against current tech trends in color, CSS, web design and AI tooling for designers. Tell the editor what kind of posts to write more of.\nReturn items as an empty array. Return exactly 3 months with 4 to 6 themes each, 3 to 5 verdicts, and the gapTags and trendTags lists.${text ? `\n\nEditor notes: ${text}` : ''}`
    }
    return `${header}\n\nRequest: ${text}\n\nReturn 6 post ideas ordered by suggested week, each with a kind, a working title, a reason that references the counts or the recent titles, and 2 or 3 tags. Also return exactly 3 months with 4 to 6 themes each, 3 verdicts and the gapTags and trendTags lists.`
  }

  /** Runs Gemini for the given kind, saves the run and resolves with it (null when the task failed). */
  async function createRun(kind: RecommendationKind, text: string): Promise<IRecommendationRun | null> {
    let saved: IRecommendationRun | null = null
    await runTask(async () => {
      const context = buildRecommendationContext(RECOMMENDATIONS_SOURCE_LABEL)
      const prompt = buildPrompt(kind, text.trim(), context)
      const raw = await generateAiJson<unknown>(prompt, { modelName: selectedModel.value, systemInstruction, responseSchema, maxOutputTokens: 6144 })
      const response = normalizeRecommendationResponse(raw)
      if (!response.summary && !response.items.length && !response.verdicts.length)
        throw new Error('The AI response was empty. Try again with a different request.')

      const run: IRecommendationRun = {
        kind,
        prompt: text.trim() || (kind === 'analysis' ? `Coverage analysis of ${RECOMMENDATIONS_SOURCE_LABEL}` : 'Recommendations'),
        model: selectedModel.value,
        response,
        pinned: [],
        context,
        createdBy: user.value ? { uid: user.value.uid, name: user.value.displayName || user.value.email || 'staff' } : null
      }
      const ref = await addDoc(collection(db, RECOMMENDATIONS_COLLECTION), { ...run, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      saved = { ...run, id: ref.id, createdAt: new Date() }
    }, { loadingKey: kind, errorMessage: 'The recommendations could not be generated. Try again in a moment.' })
    return saved
  }

  return {
    models,
    selectedModel,
    coverage,
    isLoadingCoverage,
    coverageError,
    loadCoverage,
    createRun,
    isLoading,
    loadingState,
    error,
    errorSafetyRating,
    resetErrors
  }
}
