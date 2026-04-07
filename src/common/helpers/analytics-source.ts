export type AnalyticsSource = 'claude' | 'copilot'

export const ANALYTICS_SOURCE_COOKIE = 'analytics-source'
export const DEFAULT_ANALYTICS_SOURCE: AnalyticsSource = 'claude'

export interface SourceCapabilities {
  overview: boolean
  projects: boolean
  projectDetail: boolean
  sessions: boolean
  sessionDetail: boolean
  tools: boolean
  activity: boolean
  history: boolean
  settings: boolean
  costs: boolean
  plans: boolean
  todos: boolean
  memory: boolean
}

export function isAnalyticsSource(value: string | null | undefined): value is AnalyticsSource {
  return value === 'claude' || value === 'copilot'
}

export function normalizeAnalyticsSource(value: string | null | undefined): AnalyticsSource {
  return isAnalyticsSource(value) ? value : DEFAULT_ANALYTICS_SOURCE
}

export function getAnalyticsSourceFromCookieHeader(cookieHeader: string | null | undefined): AnalyticsSource {
  if (!cookieHeader) return DEFAULT_ANALYTICS_SOURCE
  const match = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${ANALYTICS_SOURCE_COOKIE}=`))
  if (!match) return DEFAULT_ANALYTICS_SOURCE
  return normalizeAnalyticsSource(match.split('=').slice(1).join('='))
}

export function getAnalyticsSourceFromRequest(req: Request): AnalyticsSource {
  const url = new URL(req.url)
  const fromQuery = url.searchParams.get('source')
  if (isAnalyticsSource(fromQuery)) return fromQuery
  return getAnalyticsSourceFromCookieHeader(req.headers.get('cookie'))
}

export function getAnalyticsSourceLabel(source: AnalyticsSource): string {
  return source === 'claude' ? 'Claude' : 'Copilot'
}

export function getAnalyticsProductLabel(source: AnalyticsSource): string {
  return source === 'claude' ? 'Claude Code Analytics' : 'Copilot CLI Analytics'
}

export function getAnalyticsDataRoot(source: AnalyticsSource): string {
  return source === 'claude' ? '~/.claude' : '~/.copilot'
}

export function getAnalyticsHistoryPath(source: AnalyticsSource): string {
  return source === 'claude'
    ? '~/.claude/history.jsonl'
    : '~/.copilot/session-state/*/events.jsonl + ~/.copilot/command-history-state.json'
}

export function getAnalyticsSettingsPath(source: AnalyticsSource): string {
  return source === 'claude' ? '~/.claude/settings.json' : '~/.copilot/config.json'
}

export function getAnalyticsPlansPath(source: AnalyticsSource): string {
  return source === 'claude' ? '~/.claude/plans/' : '~/.copilot/session-state/*/plan.md'
}

export function getAnalyticsTodosPath(source: AnalyticsSource): string {
  return source === 'claude' ? '~/.claude/todos/' : '~/.copilot/session-state/*/session.db'
}

export function getAnalyticsMemoryPath(source: AnalyticsSource): string {
  return source === 'claude' ? '~/.claude/projects/*/memory/' : '~/.copilot/session-state/*/memory/'
}

export function getAnalyticsVersionHistoryLabel(source: AnalyticsSource): string {
  return source === 'claude' ? 'Claude Code Version History' : 'Copilot CLI Version History'
}

export function getAnalyticsCapabilities(source: AnalyticsSource): SourceCapabilities {
  if (source === 'copilot') {
    return {
      overview: true,
      projects: true,
      projectDetail: true,
      sessions: true,
      sessionDetail: false,
      tools: true,
      activity: true,
      history: true,
      settings: true,
      costs: false,
      plans: false,
      todos: false,
      memory: false,
    }
  }

  return {
    overview: true,
    projects: true,
    projectDetail: true,
    sessions: true,
    sessionDetail: true,
    tools: true,
    activity: true,
    history: true,
    settings: true,
    costs: true,
    plans: true,
    todos: true,
    memory: true,
  }
}
