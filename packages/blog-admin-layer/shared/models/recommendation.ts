import type { FieldValue, Timestamp } from 'firebase/firestore'

/** A run is one Gemini call: either a list of ideas or a coverage analysis. */
export type RecommendationKind = 'recommendations' | 'analysis'

/** How a tag or theme reads against the next 90 days. */
export type RecommendationState = 'gap' | 'trend' | 'ok'

export interface IRecommendationTheme {
  label: string
  badge: string
  state: RecommendationState
}

export interface IRecommendationMonth {
  name: string
  range: string
  note: string
  themes: IRecommendationTheme[]
}

/** One idea. `colors` carries hex stops for palettes and gradients and stays empty for post ideas. */
export interface IRecommendationItem {
  kind: string
  name: string
  when: string
  why: string
  colors: string[]
  tags: string[]
}

export interface IRecommendationVerdict {
  tag: 'Gap' | 'Trend' | 'New'
  text: string
}

export interface IRecommendationResponse {
  summary: string
  items: IRecommendationItem[]
  months: IRecommendationMonth[]
  verdicts: IRecommendationVerdict[]
  gapTags: string[]
  trendTags: string[]
}

/** Something the admin pinned from the chat rows or the month boards, saved on the run. */
export interface IRecommendationPin {
  id: string
  label: string
  meta: string
  source: 'item' | 'theme'
}

export interface IRecommendationPlanAction {
  id: string
  label: string
  icon: string
}

/** What was true when the prompt was built, so an old run still reads correctly. */
export interface IRecommendationContext {
  today: string
  months: string[]
  source: string
}

export interface IRecommendationRun {
  id?: string
  kind: RecommendationKind
  prompt: string
  model: string
  response: IRecommendationResponse
  pinned: IRecommendationPin[]
  context: IRecommendationContext
  createdAt?: Timestamp | number | Date | FieldValue | null
  updatedAt?: Timestamp | number | Date | FieldValue | null
  createdBy?: { uid: string, name: string } | null
}

/** A tag with its live count, read from the gallery filters or the blog tags. */
export interface IRecommendationCoverage {
  label: string
  count: number
  trending: number
  state: RecommendationState
}

export const RECOMMENDATIONS_COLLECTION = 'ai_recommendations'
