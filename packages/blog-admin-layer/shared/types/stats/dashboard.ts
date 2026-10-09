import type { AggregateStats } from '#admin/shared/types/stats/aggregate'
import type { BreakdownStats } from '#admin/shared/types/stats/breakdown'
import type { TimeseriesStats } from '#admin/shared/types/stats/timeseries'

export interface ChannelStats {
  channel: string | null
  visitors: number | null
}

export interface CountryStats {
  country: string | null
  visitors: number | null
}

export interface ReferralLandingStats {
  source: string | null
  entryPage: string | null
  visitors: number | null
}

export interface PlausibleDashboardResponse {
  aggregateStats: AggregateStats
  breakdownStats: BreakdownStats[]
  browserBreakdown: BreakdownStats[]
  referrerBreakdown: BreakdownStats[]
  timeStats: TimeseriesStats[]
  realtimeStats: number
  channelBreakdown: ChannelStats[]
  countryBreakdown: CountryStats[]
  referralLandingBreakdown: ReferralLandingStats[]
  failures: string[]
}
