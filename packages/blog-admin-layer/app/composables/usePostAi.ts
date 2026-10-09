import type { ITag } from '@giancarlosgza/blog-core'
import type { InjectionKey, MaybeRefOrGetter, Ref } from 'vue'
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '@giancarlosgza/blog-core'

/** Interfaces */
export type PostAiTask = 'title' | 'excerpt' | 'tags' | 'improve' | 'smartFill' | 'seo'
export interface IPostAiReview {
  title: string
  excerpt: string
  tags: string[]
}
export interface IPostAiSeoProposal {
  seoTitle: string
  seoDescription: string
}
export type PostAiSeoField = 'seoTitle' | 'seoDescription' | 'both'
export interface IPostAiReviewSelection {
  title: boolean
  excerpt: boolean
  tags: boolean
}

/** Constants */
// Mirrors the /api/ai/generate prompt cap so oversized requests fail with a clear message.
const MAX_PROMPT_LENGTH = 24000
const MAX_CONTEXT_BODY_LENGTH = 2500
const MAX_TITLE_SUGGESTIONS = 5
const MAX_EXCERPT_SUGGESTIONS = 3
const MAX_TAGS = 5
// Long article rewrites need more output than the server default.
const IMPROVE_MAX_OUTPUT_TOKENS = 8192

/** Editor prompt for titles, excerpts, tags, smart fill and SEO; `blog`/`audience` come from `admin.ai`. */
function editorInstruction(blog: string, audience: string): string {
  return `You are an expert blog editor and technical writer for ${blog}, written for ${audience}.
You write clear, engaging, SEO-friendly copy. Stay faithful to the article: never invent facts, features or claims that are not in the provided context.
Always answer with JSON that matches the requested schema.`
}

function improveInstruction(blog: string, audience: string): string {
  return `You are an expert blog editor for ${blog}, written for ${audience}.
Improve the writing of the given HTML article: fix grammar and typos, tighten wording, improve clarity and flow, and keep the author's voice and meaning. Do not add new sections or invent facts.

Output rules (mandatory):
- Return ONLY the improved article as clean HTML, with no markdown fences and no commentary.
- Use ONLY these tags: p, h2, h3, ul, ol, li, strong, em, blockquote, pre, code, a, img.
- Preserve verbatim (do not edit, summarize or remove) every <pre><code>...</code></pre> block, every <img> element and every <div data-blog-widget ...>...</div> placeholder.
- Keep every link's href unchanged.`
}

// Gemini response schemas (OpenAPI subset).
const titlesSchema = {
  type: 'OBJECT',
  properties: { titles: { type: 'ARRAY', items: { type: 'STRING' } } },
  required: ['titles']
}
const excerptsSchema = {
  type: 'OBJECT',
  properties: { excerpts: { type: 'ARRAY', items: { type: 'STRING' } } },
  required: ['excerpts']
}
const tagsSchema = {
  type: 'OBJECT',
  properties: { tags: { type: 'ARRAY', items: { type: 'STRING' } } },
  required: ['tags']
}
const smartFillSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    excerpt: { type: 'STRING' },
    tags: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['title', 'excerpt', 'tags']
}
const seoSchema = {
  type: 'OBJECT',
  properties: {
    seoTitle: { type: 'STRING' },
    seoDescription: { type: 'STRING' }
  },
  required: ['seoTitle', 'seoDescription']
}

const titleRules = 'clear, engaging and SEO-friendly, under 70 characters, no quotes or trailing period'
const excerptRules = '1-2 sentences that summarize the post for previews and meta descriptions, under 160 characters'
const seoTitleRules = `the title shown in search results and social shares, at most ${SEO_TITLE_MAX} characters, main keyword first, without the site name, quotes or a trailing period`
const seoDescriptionRules = `the meta description shown under the search result, 1-2 sentences of at most ${SEO_DESCRIPTION_MAX} characters that state what the reader gets and invite the click, without quotes`
const tagRules = `between 1 and ${MAX_TAGS} of the most relevant tags, ordered by relevance, copied exactly from the allowed list; never invent tags`

function createPostAi(form: Ref<IPostEditorForm>, body: Ref<string>, tags: MaybeRefOrGetter<ITag[] | null | undefined>) {
  /** Data */
  const { blog, audience } = useAppConfig().admin.ai
  const systemInstruction = editorInstruction(blog, audience)
  const improveSystemInstruction = improveInstruction(blog, audience)
  const { models } = useGeminiAi()
  const { isLoading, loadingState, error, errorSafetyRating, resetErrors, generateAiText, generateAiJson, runTask } = useGeminiPrompt(['title', 'excerpt', 'tags', 'improve', 'smartFill', 'seo'])

  const selectedModel = useGeminiModel()
  const failedTask = ref<PostAiTask | null>(null)
  const titleSuggestions = ref<string[]>([])
  const excerptSuggestions = ref<string[]>([])
  const tagsProposal = ref<string[]>([])
  // Always stored sanitized: it is rendered with v-html and applied to the editor as is.
  const improveProposal = ref<string | null>(null)
  const review = ref<IPostAiReview | null>(null)
  const seoProposal = ref<IPostAiSeoProposal | null>(null)

  /** Computed */
  const tagNames = computed(() => (toValue(tags) || []).map(tag => tag.name).filter(Boolean))
  const hasTags = computed(() => tagNames.value.length > 0)
  const hasTitle = computed(() => !!form.value.title?.trim())
  const hasBody = computed(() => !!htmlToExcerpt(body.value || '', 50).trim())
  const canGenerate = computed(() => hasTitle.value || hasBody.value)
  const currentBodyHtml = computed(() => sanitizePostPreviewHtml(body.value || ''))

  /** Prompts */
  function buildContext(): string {
    const lines = ['Context:']
    if (form.value.title?.trim())
      lines.push(`- Title: ${form.value.title.trim()}`)
    if (form.value.shortText?.trim())
      lines.push(`- Current excerpt: ${form.value.shortText.trim()}`)
    if (form.value.tags.length)
      lines.push(`- Current tags: ${form.value.tags.join(', ')}`)
    const excerpt = htmlToExcerpt(body.value || '', MAX_CONTEXT_BODY_LENGTH)
    if (excerpt)
      lines.push(`- Article body (plain text excerpt): ${excerpt}`)
    return lines.join('\n')
  }

  function createTitlePrompt(): string {
    return `Task: Write ${MAX_TITLE_SUGGESTIONS} alternative titles for this blog post, each ${titleRules}.
${buildContext()}
Return {"titles": [${MAX_TITLE_SUGGESTIONS} strings]}.`
  }

  function createExcerptPrompt(): string {
    return `Task: Write ${MAX_EXCERPT_SUGGESTIONS} alternative excerpts for this blog post, each ${excerptRules}.
${buildContext()}
Return {"excerpts": [${MAX_EXCERPT_SUGGESTIONS} strings]}.`
  }

  function createTagsPrompt(): string {
    return `Task: Choose ${tagRules}.
Allowed tags: ${tagNames.value.join(', ')}
${buildContext()}
Return {"tags": ["..."]}.`
  }

  function createImprovePrompt(): string {
    return `Task: Improve the writing of the following blog article HTML and return the improved HTML only.
${form.value.title?.trim() ? `Title: ${form.value.title.trim()}\n` : ''}Article HTML:
${body.value}`
  }

  function createSmartFillPrompt(): string {
    return `Task: Complete this blog post's metadata.
- title: ${titleRules}.
- excerpt: ${excerptRules}.
- tags: ${hasTags.value ? `${tagRules}. Allowed tags: ${tagNames.value.join(', ')}` : 'return an empty array'}.
${buildContext()}`
  }

  function createSeoPrompt(): string {
    const lines = [buildContext()]
    if (form.value.seoTitle?.trim())
      lines.push(`- Current SEO title: ${form.value.seoTitle.trim()}`)
    if (form.value.seoDescription?.trim())
      lines.push(`- Current SEO description: ${form.value.seoDescription.trim()}`)
    return `Task: Write the search engine metadata for this blog post.
- seoTitle: ${seoTitleRules}.
- seoDescription: ${seoDescriptionRules}.
${lines.join('\n')}
Return {"seoTitle": "...", "seoDescription": "..."}.`
  }

  /** Methods */
  function errorFor(task: PostAiTask): string | null {
    return failedTask.value === task ? error.value : null
  }
  function safetyRatingsFor(task: PostAiTask) {
    return failedTask.value === task ? errorSafetyRating.value : null
  }
  function failWith(task: PostAiTask, message: string) {
    resetErrors()
    failedTask.value = task
    error.value = message
  }

  // Shared runner: every task needs a title or some content to work from.
  async function run(task: PostAiTask, prompt: string, handler: () => Promise<void>): Promise<void> {
    if (isLoading.value)
      return
    if (!canGenerate.value)
      return failWith(task, 'Add a title or some content first so AI has something to work with.')
    if (prompt.length > MAX_PROMPT_LENGTH)
      return failWith(task, 'There is too much text for AI to process. Shorten the article and try again.')

    failedTask.value = task
    await runTask(handler, { loadingKey: task })
    if (!error.value)
      failedTask.value = null
  }

  function suggestTitles(): Promise<void> {
    const prompt = createTitlePrompt()
    return run('title', prompt, async () => {
      const response = await generateAiJson<{ titles?: unknown }>(prompt, { modelName: selectedModel.value, systemInstruction, responseSchema: titlesSchema })
      titleSuggestions.value = normalizeAiSuggestions(response.titles, MAX_TITLE_SUGGESTIONS)
    })
  }

  function suggestExcerpts(): Promise<void> {
    const prompt = createExcerptPrompt()
    return run('excerpt', prompt, async () => {
      const response = await generateAiJson<{ excerpts?: unknown }>(prompt, { modelName: selectedModel.value, systemInstruction, responseSchema: excerptsSchema })
      excerptSuggestions.value = normalizeAiSuggestions(response.excerpts, MAX_EXCERPT_SUGGESTIONS)
    })
  }

  function suggestTags(): Promise<void> {
    if (!hasTags.value) {
      failWith('tags', 'Create some tags first so AI can pick from them.')
      return Promise.resolve()
    }
    const prompt = createTagsPrompt()
    return run('tags', prompt, async () => {
      const response = await generateAiJson<{ tags?: unknown }>(prompt, { modelName: selectedModel.value, systemInstruction, responseSchema: tagsSchema })
      tagsProposal.value = matchAllowedTags(response.tags, tagNames.value, MAX_TAGS)
      if (!tagsProposal.value.length)
        error.value = 'AI did not return any matching tags. Try again.'
    })
  }

  function improveWriting(): Promise<void> {
    if (!hasBody.value) {
      failWith('improve', 'Write some content before improving it.')
      return Promise.resolve()
    }
    const prompt = createImprovePrompt()
    return run('improve', prompt, async () => {
      const response = await generateAiText(prompt, { modelName: selectedModel.value, systemInstruction: improveSystemInstruction, maxOutputTokens: IMPROVE_MAX_OUTPUT_TOKENS })
      const html = sanitizePostPreviewHtml(stripHtmlFence(response.text || ''))
      improveProposal.value = html || null
      if (!html)
        error.value = 'AI did not return an improved article. Try again.'
    })
  }

  function smartFill(): Promise<void> {
    const prompt = createSmartFillPrompt()
    return run('smartFill', prompt, async () => {
      const response = await generateAiJson<{ title?: unknown, excerpt?: unknown, tags?: unknown }>(prompt, { modelName: selectedModel.value, systemInstruction, responseSchema: smartFillSchema })
      review.value = {
        title: typeof response.title === 'string' ? response.title.trim() : '',
        excerpt: typeof response.excerpt === 'string' ? response.excerpt.trim() : '',
        tags: hasTags.value ? matchAllowedTags(response.tags, tagNames.value, MAX_TAGS) : []
      }
    })
  }

  function suggestSeo(): Promise<void> {
    const prompt = createSeoPrompt()
    return run('seo', prompt, async () => {
      const response = await generateAiJson<unknown>(prompt, { modelName: selectedModel.value, systemInstruction, responseSchema: seoSchema })
      const proposal = normalizeAiSeo(response)
      seoProposal.value = proposal.seoTitle || proposal.seoDescription ? proposal : null
      if (!seoProposal.value)
        error.value = 'AI did not return SEO suggestions. Try again.'
    })
  }

  function applyTitle(text: string) {
    form.value.title = text
    titleSuggestions.value = []
  }
  function applyExcerpt(text: string) {
    form.value.shortText = text
    excerptSuggestions.value = []
  }
  function applyTags() {
    if (tagsProposal.value.length)
      form.value.tags = unionTags(form.value.tags, tagsProposal.value)
    tagsProposal.value = []
  }
  function applyImproveProposal() {
    if (improveProposal.value)
      body.value = improveProposal.value
    improveProposal.value = null
  }
  function applyReview(selection: IPostAiReviewSelection) {
    if (!review.value)
      return
    if (selection.title && review.value.title)
      form.value.title = review.value.title
    if (selection.excerpt && review.value.excerpt)
      form.value.shortText = review.value.excerpt
    if (selection.tags && review.value.tags.length)
      form.value.tags = unionTags(form.value.tags, review.value.tags)
    review.value = null
  }

  // Applying one field keeps the other suggestion open until it is applied or dismissed.
  function applySeo(field: PostAiSeoField) {
    const proposal = seoProposal.value
    if (!proposal)
      return
    if ((field === 'seoTitle' || field === 'both') && proposal.seoTitle) {
      form.value.seoTitle = proposal.seoTitle
      proposal.seoTitle = ''
    }
    if ((field === 'seoDescription' || field === 'both') && proposal.seoDescription) {
      form.value.seoDescription = proposal.seoDescription
      proposal.seoDescription = ''
    }
    seoProposal.value = proposal.seoTitle || proposal.seoDescription ? { ...proposal } : null
  }

  function dismissTitles() {
    titleSuggestions.value = []
  }
  function dismissExcerpts() {
    excerptSuggestions.value = []
  }
  function dismissTags() {
    tagsProposal.value = []
  }
  function dismissImproveProposal() {
    improveProposal.value = null
  }
  function dismissReview() {
    review.value = null
  }
  function dismissSeo() {
    seoProposal.value = null
  }

  return {
    models,
    selectedModel,
    isLoading,
    loadingState,
    hasTags,
    hasBody,
    currentBodyHtml,
    titleSuggestions,
    excerptSuggestions,
    tagsProposal,
    improveProposal,
    review,
    seoProposal,
    errorFor,
    safetyRatingsFor,
    suggestTitles,
    suggestExcerpts,
    suggestTags,
    improveWriting,
    smartFill,
    suggestSeo,
    applyTitle,
    applyExcerpt,
    applyTags,
    applyImproveProposal,
    applyReview,
    applySeo,
    dismissTitles,
    dismissExcerpts,
    dismissTags,
    dismissImproveProposal,
    dismissReview,
    dismissSeo
  }
}

export type IPostAi = ReturnType<typeof createPostAi>

const postAiKey: InjectionKey<IPostAi> = Symbol('post-ai')

/**
 * Creates the post AI state for the editor page and shares it with the header toolbar and
 * the form fields, which all read and apply suggestions to the same post.
 */
export function providePostAi(form: Ref<IPostEditorForm>, body: Ref<string>, tags: MaybeRefOrGetter<ITag[] | null | undefined>): IPostAi {
  const ai = createPostAi(form, body, tags)
  provide(postAiKey, ai)
  return ai
}

export function usePostAi(): IPostAi {
  const ai = inject(postAiKey)
  if (!ai)
    throw new Error('usePostAi() needs a parent page that calls providePostAi()')
  return ai
}
