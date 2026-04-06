// ─── Stats Cache ─────────────────────────────────────────────────────────────

export interface DailyStats {
  date: string
  messageCount: number
  sessionCount: number
  toolCallCount: number
}

export interface DailyTokens {
  date: string
  tokensByModel: Record<string, number>
}

export interface ModelMetrics {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  costUSD: number
  webSearchRequests: number
}

export interface LongestSession {
  sessionId: string
  duration: number
  messageCount: number
  timestamp: string
}

export interface StatsSnapshot {
  version: number
  lastComputedDate: string
  dailyActivity: DailyStats[]
  tokensByDate: DailyTokens[]
  dailyModelTokens?: DailyTokens[]
  modelUsage: Record<string, ModelMetrics>
  totalSessions: number
  totalMessages: number
  longestSession: LongestSession
  firstSessionDate: string
  hourCounts: Record<string, number>
  totalSpeculationTimeSavedMs: number
}

// ─── Session Meta ─────────────────────────────────────────────────────────────

export interface SessionInfo {
  session_id: string
  model?: string
  project_path: string
  start_time: string
  duration_minutes: number
  user_message_count: number
  assistant_message_count: number
  tool_counts: Record<string, number>
  languages: Record<string, number>
  git_commits: number
  git_pushes: number
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  first_prompt: string
  user_interruptions: number
  user_response_times: number[]
  tool_errors: number
  tool_error_categories: Record<string, number>
  uses_task_agent: boolean
  uses_mcp: boolean
  uses_web_search: boolean
  uses_web_fetch: boolean
  lines_added: number
  lines_removed: number
  files_modified: number
  message_hours: number[]
  user_message_timestamps: string[]
  // Enrichment fields extracted during JSONL parsing (no second pass needed)
  slug?: string
  version?: string
  git_branch?: string
  has_compaction?: boolean
  has_thinking?: boolean
}

// ─── Facets ──────────────────────────────────────────────────────────────────

export interface Facet {
  session_id: string
  underlying_goal: string
  goal_categories: Record<string, number>
  outcome: string
  user_satisfaction_counts: Record<string, number>
  claude_helpfulness: string
  session_type: string
  friction_counts: Record<string, number>
  friction_detail: string
  primary_success: string
  brief_summary: string
}

// ─── Session with Facet joined ───────────────────────────────────────────────

export interface ConversationWithFacet extends SessionInfo {
  facet?: Facet
  estimated_cost: number
  // slug, version, git_branch, has_compaction, has_thinking inherited from SessionInfo
}

// ─── Replay / JSONL ──────────────────────────────────────────────────────────

export interface TurnUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  cache_creation?: {
    ephemeral_5m_input_tokens: number
    ephemeral_1h_input_tokens: number
  }
  service_tier?: string
  inference_geo?: string
}

export interface ToolInvocation {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  is_error?: boolean
}

export interface SessionTurn {
  uuid: string
  parentUuid: string | null
  type: 'user' | 'assistant'
  timestamp: string
  model?: string
  usage?: TurnUsage
  text?: string
  tool_calls?: ToolInvocation[]
  tool_results?: Array<{ tool_use_id: string; content: string; is_error: boolean }>
  has_thinking?: boolean
  thinking_text?: string
  estimated_cost?: number
  turn_duration_ms?: number
  response_time_s?: number
}

export interface CompactionEvent {
  uuid: string
  timestamp: string
  trigger: 'auto' | 'manual'
  pre_tokens: number
  summary?: string
  turn_index: number
}

export interface SummaryEvent {
  uuid: string
  summary: string
  leaf_uuid: string
}

export interface PlaybackData {
  session_id: string
  slug?: string
  version?: string
  git_branch?: string
  turns: SessionTurn[]
  compactions: CompactionEvent[]
  summaries: SummaryEvent[]
  total_cost: number
}

// ─── Project Summary ──────────────────────────────────────────────────────────

export interface WorkspaceSummary {
  slug: string
  project_path: string
  display_name: string
  session_count: number
  total_messages: number
  total_duration_minutes: number
  total_lines_added: number
  total_lines_removed: number
  total_files_modified: number
  git_commits: number
  git_pushes: number
  estimated_cost: number
  input_tokens: number
  output_tokens: number
  languages: Record<string, number>
  tool_counts: Record<string, number>
  last_active: string
  first_active: string
  uses_mcp: boolean
  uses_task_agent: boolean
  branches: string[]
}

// ─── Tool Analytics ───────────────────────────────────────────────────────────

export interface InstrumentSummary {
  name: string
  category: string
  total_calls: number
  session_count: number
  error_count: number
}

export interface McpServerSummary {
  server_name: string
  tools: Array<{ name: string; calls: number }>
  total_calls: number
  session_count: number
}

export interface VersionRecord {
  version: string
  session_count: number
  first_seen: string
  last_seen: string
}

export interface InstrumentAnalytics {
  tools: InstrumentSummary[]
  mcp_servers: McpServerSummary[]
  feature_adoption: Record<string, { sessions: number; pct: number }>
  versions: VersionRecord[]
  branches: Array<{ branch: string; turns: number }>
  error_categories: Record<string, number>
  total_tool_calls: number
  total_errors: number
}

// ─── Cost Analytics ───────────────────────────────────────────────────────────

export interface ModelSpendBreakdown {
  model: string
  input_tokens: number
  output_tokens: number
  cache_write_tokens: number
  cache_read_tokens: number
  estimated_cost: number
  cache_savings: number
  cache_hit_rate: number
}

export interface DailySpend {
  date: string
  costs: Record<string, number>
  total: number
}

export interface WorkspaceSpend {
  slug: string
  display_name: string
  estimated_cost: number
  input_tokens: number
  output_tokens: number
}

export interface SpendAnalytics {
  total_cost: number
  total_savings: number
  models: ModelSpendBreakdown[]
  daily: DailySpend[]
  by_project: WorkspaceSpend[]
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface CommandRecord {
  display: string
  timestamp: number
  project: string
  sessionId?: string
}

// ─── Export ──────────────────────────────────────────────────────────────────

export interface ExportBundle {
  exportedAt: string
  version: string
  stats: StatsSnapshot | null
  sessions: SessionInfo[]
  facets: Facet[]
  history: CommandRecord[]
}

export interface ImportComparison {
  total_in_export: number
  already_present: number
  new_sessions: number
  sessions_to_add: SessionInfo[]
}
