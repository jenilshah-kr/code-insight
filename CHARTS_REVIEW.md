# Charts & Metrics Review Tracker

Track discussion and fix status for every chart, numeric total, and data display.

**Status legend:**
- `[ ]` — Not yet reviewed
- `[~]` — In discussion / needs fix
- `[x]` — Reviewed & confirmed correct
- `[!]` — Bug confirmed, fix pending
- `[✓]` — Fixed & verified

---

## How to use this file

1. Pick any `[ ]` item below
2. Discuss with Claude — look at the service, the API route, and the component
3. Update status and add notes inline
4. Commit so progress is saved between sessions

---

## DASHBOARD

### Hero Stats (5 cards)
File: `src/modules/dashboard/components/dashboard-client.tsx`
Data source: `/api/stats` → `compileStatsPayload()` in `src/modules/dashboard/service.ts`

| # | Metric | Use Case | Status | Notes |
|---|--------|----------|--------|-------|
| D1 | **Conversations** (`stats.totalMessages`) | Total number of individual messages (turns) across all sessions — used as a proxy for overall activity volume | `[✓]` | **Bug fixed**: was reading stale value from `~/.claude/stats-cache.json` via spread. Now overrides with live count from JSONL sessions in `service.ts`. |
| D2 | **Sessions** (`computed.sessionCount`) | Total number of distinct Claude sessions — tells you how many times you started a conversation | `[x]` | **Confirmed correct**: `sessions.length` from `loadSessions()` — reads live JSONL files directly, no cache involved. Always fresh. |
| D3 | **Tokens** (`computed.totalTokens`) | Cumulative tokens consumed (input + output + cache) — primary proxy for model compute used | `[✓]` | **Bug fixed**: was summing from `modelUsage` in stats-cache. Now computed directly from `session.input_tokens` etc. in `service.ts`. |
| D4 | **Projects** (`projectCount`) | Number of distinct local projects that have Claude session data | `[x]` | **Confirmed correct**: `projects.length` from `compileWorkspaceList()` — reads live JSONL, no cache. |
| D5 | **Storage** (`computed.storageBytes`) | Total disk space used by all `~/.claude/` session JSONL files | `[x]` | **Confirmed correct**: `getStorageBytes()` scans filesystem directly, no cache. |

### Token Composition Bar
File: `src/modules/dashboard/components/dashboard-client.tsx` (lines 287–341)
Data source: same as hero stats

| # | Metric | Use Case | Status | Notes |
|---|--------|----------|--------|-------|
| D6 | **Input %** | Share of tokens you typed/sent — baseline cost driver | `[✓]` | **Bug fixed**: same root fix as D3 — now from live session token fields. |
| D7 | **Output %** | Share of tokens Claude generated — reflects response verbosity | `[✓]` | **Bug fixed**: same root fix as D3. |
| D8 | **Cache Read %** | Share served from prompt cache — indicates cache efficiency | `[✓]` | **Bug fixed**: same root fix as D3. |
| D9 | **Cache Write %** | Share written into cache — one-time cost for future savings | `[✓]` | **Bug fixed**: same root fix as D3. |

### Charts

| # | Chart | Use Case | Status | Notes |
|---|-------|----------|--------|-------|
| D10 | **Usage Over Time** (area chart) `src/modules/dashboard/components/usage-over-time-chart.tsx` | Shows messages and sessions per day over a selectable date range — spot trends, bursts of activity, or gaps | `[✓]` | **Bug fixed**: removed stale cache merge (`mergeDailyStats`). Now uses `dailyFromSessions` only — all JSONL files are read so all historical dates are covered. |
| D11 | **Busy Hours** (bar chart) `src/modules/dashboard/components/busy-hours-chart.tsx` | 24-hour distribution of session starts — reveals when you most actively use Claude across the day | `[✓]` | **Bug fixed**: `hourCounts` was read-only from stats-cache. Now computed from session `start_time` hours in `service.ts`. |
| D12 | **Model Breakdown** (donut) `src/modules/dashboard/components/model-breakdown-donut.tsx` | Token share by Claude model — shows which model you rely on most (Sonnet vs Opus vs Haiku) | `[✓]` | **Bug fixed**: `modelUsage` was read-only from stats-cache. Now built live by grouping sessions by extracted `model` field from JSONL assistant turns. |
| D13 | **Project Activity** (donut) `src/modules/dashboard/components/project-activity-donut.tsx` | Token share across your top 5 projects + others — highlights which codebases consume the most compute | `[x]` | **Confirmed correct**: from `compileWorkspaceList()` via `/api/projects` — live JSONL, no cache. |
| D14 | **Calendar Heatmap** (52-week grid) `src/modules/dashboard/components/calendar-heatmap.tsx` | GitHub-style activity grid showing message count per day over the past year — visualises consistency of use | `[x]` | **Confirmed correct**: component exists but is not rendered on the dashboard. If added, it will use `dailyActivity` which is now sessions-only (see D10 fix). |

### Session Summary Table
File: `src/modules/dashboard/components/session-summary-table.tsx`
Data source: `/api/sessions`

| # | Column / Filter | Use Case | Status | Notes |
|---|----------------|----------|--------|-------|
| D15 | **Conversation ID** | Unique identifier to look up or reference a specific session | `[x]` | **Confirmed correct**: `session_id` = JSONL filename basename — always live and unique. |
| D16 | **Project** | Which codebase/folder the session was in | `[x]` | **Confirmed correct**: `project_path` from JSONL parse, resolved via workspace slug. |
| D17 | **Model** | Which Claude model was used | `[✓]` | **Bug fixed**: was hardcoded `'claude-sonnet-4-...'`. Now extracts `model` from first assistant message in JSONL (`data-reader.ts`) and renders `s.model`. |
| D18 | **Messages count** | How many turns in that session | `[x]` | **Confirmed correct**: `user_message_count + assistant_message_count` — counted from JSONL lines. |
| D19 | **Tokens** | Total tokens for that session | `[x]` | **Confirmed correct**: per-session `input_tokens + output_tokens` — summed from assistant usage fields in JSONL. |
| D20 | **Last activity date** | When the session was last active | `[x]` | **Confirmed correct**: `start_time` from JSONL timestamps — always live. |
| D21 | **Status badge** (active/inactive) | Quick filter to find ongoing vs completed work | `[x]` | **Confirmed correct**: computed on render — active if `start_time` within last 24h, no cache involved. |

---

## SPENDING

### Hero Stats (4 values)
File: `src/app/costs/page.tsx`
Data source: `/api/costs` → `compileCostAnalytics()` in `src/modules/spending/service.ts`

| # | Metric | Use Case | Status | Notes |
|---|--------|----------|--------|-------|
| S0a | **Total Estimated Cost** (`data.total_cost`) | Cumulative estimated spend across all sessions | `[✓]` | **Bug fixed**: was summing from `stats-cache.json` `modelUsage` — stale. Now aggregated live from all JSONL sessions by model in `service.ts`. |
| S0b | **Cache Savings** (`data.total_savings`) | Dollar amount saved by prompt caching | `[✓]` | **Bug fixed**: same root fix as S0a — `calcCacheEfficiency()` now called on live per-model aggregates built from sessions. |
| S0c | **Without Cache** (`data.total_cost + data.total_savings`) | Hypothetical total if caching didn't exist | `[✓]` | **Derived from S0a + S0b** — correct once those are fixed. |
| S0d | **Cache Efficiency %** | Savings as a share of would-have-paid | `[✓]` | **Derived from S0a + S0b** — correct once those are fixed. |

### Charts

| # | Chart | Use Case | Status | Notes |
|---|-------|----------|--------|-------|
| S1 | **Spend Over Time** (stacked area) `src/modules/spending/components/spend-over-time-chart.tsx` | Daily cost broken down by model over selectable date range — track budget trends and see which model drives spend | `[✓]` | **3 bugs fixed**: (1) daily costs were keyed `'sessions'` — now keyed by `s.model` so chart renders per-model coloured areas; (2) window used entry-count `slice(-n)` instead of calendar date cutoff — now filters `d.date >= cutoff`; (3) "All" was capped at 365 entries — now truly unbounded. Default window changed 90d → 30d. |
| S2 | **Spend by Workspace** (horizontal bar) `src/modules/spending/components/spend-by-workspace-chart.tsx` | Top 20 projects ranked by estimated cost — identify which repos are most expensive to work in | `[✓]` | **Bug fixed**: cost per session was hardcoded to `'claude-opus-4-6'` (5× overcharge). Now uses `s.model ?? 'claude-sonnet-4-6'`. Data now comes from live session aggregate (not stats-cache). |
| S3 | **Cache Savings** (donut + stats) `src/modules/spending/components/cache-savings-panel.tsx` | Cache hit rate visualisation — shows how much you're saving via prompt caching vs what you'd pay without it | `[✓]` | **Fixed via service rewrite** — `models` prop now built from live sessions; component itself is correct. |

### Cache Savings Panel Metrics

| # | Metric | Use Case | Status | Notes |
|---|--------|----------|--------|-------|
| S4 | **Cache hit rate %** | Percentage of input tokens served from cache — higher = more efficient | `[✓]` | **Fixed via service rewrite** — token fields now summed from live JSONL sessions. |
| S5 | **Cache read tokens** | Raw count of tokens pulled from cache | `[✓]` | **Fixed via service rewrite** — same as S4. |
| S6 | **Input tokens** | Raw count of tokens sent directly (not cached) | `[✓]` | **Fixed via service rewrite** — same as S4. |
| S7 | **Cost without cache** | Hypothetical cost if prompt caching didn't exist | `[✓]` | **Fixed via service rewrite** — derived from live model aggregates. |
| S8 | **Actual cost** | Real cost after cache discounts applied | `[✓]` | **Fixed via service rewrite** — same as S4. |
| S9 | **Savings** | Dollar amount saved by prompt caching | `[✓]` | **Fixed via service rewrite** — same as S4. |

### Model Usage Table
File: `src/modules/spending/components/model-usage-table.tsx`
Data source: `/api/costs`

| # | Column | Use Case | Status | Notes |
|---|--------|----------|--------|-------|
| S10 | **Model** | Which model the row refers to | `[✓]` | **Bug fixed**: was reading `stats.modelUsage` keys from stats-cache — now reflects actual model IDs extracted from JSONL assistant turns. |
| S11 | **Input tokens** | Tokens you sent to that model | `[✓]` | **Fixed via service rewrite** — summed from `s.input_tokens` across sessions. |
| S12 | **Output tokens** | Tokens the model generated | `[✓]` | **Fixed via service rewrite** — summed from `s.output_tokens` across sessions. |
| S13 | **Cache Write** | Tokens written to cache for that model | `[✓]` | **Fixed via service rewrite** — summed from `s.cache_creation_input_tokens`. |
| S14 | **Cache Read** | Tokens read from cache for that model | `[✓]` | **Fixed via service rewrite** — summed from `s.cache_read_input_tokens`. |
| S15 | **Cost** | Estimated dollar cost for that model | `[✓]` | **Fixed via service rewrite** — `calcTotalCostFromModel(model, liveAggregate)`. |
| S16 | **Totals row** | Sum across all models | `[✓]` | **Fixed via service rewrite** — totals now consistent with live data. |

### Rates / Pricing Table
File: `src/common/helpers/rates.ts`

| # | Item | Status | Notes |
|---|------|--------|-------|
| S17 | **`claude-sonnet-4-5` rate entry** | `[✓]` | **Added** — was missing; `claude-sonnet-4-5-20250929` was fuzzy-falling through to opus pricing. Added explicit entry ($3/$15 input/output per MTok). |
| S18 | **`<synthetic>` rate entry** | `[✓]` | **Added** — agent subprocess model; no tokens are billed separately. Added zero-rate entry so it doesn't fall back to opus pricing. |
| S19 | **Fuzzy prefix depth** | `[✓]` | **Fixed**: `slice(0, 3)` → `slice(0, 4)` so prefix is `'claude-sonnet-4-5'` not the too-broad `'claude-sonnet-4'`, which could accidentally match `claude-sonnet-4-6` rates for a 4-5 model. |

---

## TIMELINE

### Streak Panel Stats (4 cards)
File: `src/modules/timeline/components/streak-panel.tsx`
Data source: `/api/activity` → `compileActivityPayload()` in `src/modules/timeline/service.ts`

| # | Metric | Use Case | Status | Notes |
|---|--------|----------|--------|-------|
| T1 | **Current Streak** | Consecutive days with at least one session up to today — motivational consistency indicator | `[ ]` | |
| T2 | **Longest Streak** | All-time record of consecutive active days | `[ ]` | |
| T3 | **Active Days** | Total number of distinct calendar days you used Claude | `[ ]` | |
| T4 | **Most Active Day** | The single calendar day with the highest message count | `[ ]` | |

### Charts

| # | Chart | Use Case | Status | Notes |
|---|-------|----------|--------|-------|
| T5 | **Weekday Chart** (bar) `src/modules/timeline/components/weekday-chart.tsx` | Message count per day of week (Sun–Sat) — shows which days you are most productive with Claude | `[ ]` | |

---

## CONVERSATIONS

### Conversation List Table
File: `src/modules/conversations/components/conversation-list.tsx`
Data source: `/api/sessions`

| # | Column / Feature | Use Case | Status | Notes |
|---|-----------------|----------|--------|-------|
| C1 | **Date** | When the session happened | `[ ]` | |
| C2 | **Project** | Which workspace/folder | `[ ]` | |
| C3 | **Duration** | How long the session ran | `[ ]` | |
| C4 | **Messages** | Turn count for that session | `[ ]` | |
| C5 | **Tools** | Number of tool calls made | `[ ]` | |
| C6 | **Cost** | Estimated dollar cost per session | `[ ]` | |
| C7 | **Flags** (⚡🤖🔌) | Compaction / agent mode / MCP usage indicators — quick filter for session types | `[ ]` | |

### Session Replay — Token Accumulation Chart
File: `src/modules/conversations/components/replay/token-accumulation-chart.tsx`

| # | Chart / Card | Use Case | Status | Notes |
|---|-------------|----------|--------|-------|
| C8 | **Token Accumulation** (line chart) | Cumulative token growth per turn within a single session — shows context window usage over time and where it gets expensive | `[ ]` | |
| C9 | **Compaction events** (⚡ reference lines) | Marks where Claude compacted the context — explains sudden context resets in the chart | `[ ]` | |
| C10 | **Compaction Card** `src/modules/conversations/components/replay/compaction-card.tsx` | Per-compaction summary: trigger type, pre-compaction token count, timestamp — explains why/when context was trimmed | `[ ]` | |

---

## INSTRUMENTS (Tools)

### Charts & Tables
File locations: `src/modules/instruments/components/`
Data source: `/api/tools` → `compileInstrumentAnalytics()` in `src/modules/instruments/service.ts`

| # | Chart / Table | Use Case | Status | Notes |
|---|--------------|----------|--------|-------|
| I1 | **Instrument Ranking** (horizontal bar) `instrument-ranking-chart.tsx` | Top 20 tools by total call count — shows which Claude tools you rely on most (Bash, Read, Edit, etc.) | `[ ]` | |
| I2 | **Adoption Table** `adoption-table.tsx` | 7 feature categories (agent tasks, MCP, web search, web fetch, plan mode, git commits, extended thinking) with session count and % — shows breadth of Claude feature usage | `[ ]` | |
| I3 | **Release History Table** `release-history-table.tsx` | Claude Code version history with session count, first/last seen dates — tracks which CLI versions you've used | `[ ]` | |
| I4 | **MCP Server Panel** `server-panel.tsx` | Per-MCP-server breakdown: tool count, total calls, session count, per-tool call bars — shows which external integrations are actually used | `[ ]` | |

---

## WORKSPACES (Projects)

### Workspace Card (per project)
File: `src/modules/workspaces/components/workspace-card.tsx`
Data source: `/api/projects` → `compileWorkspaceList()` in `src/modules/workspaces/service.ts`

| # | Field | Use Case | Status | Notes |
|---|-------|----------|--------|-------|
| W1 | **Project name + last active date** | Identify the workspace and see recency | `[ ]` | |
| W2 | **Top 3 languages** (badges) | Quick read of the tech stack inferred from the project | `[ ]` | |
| W3 | **MCP / agent flags** | Whether this project used MCP servers or agent tasks | `[ ]` | |
| W4 | **Sessions count** | How many Claude sessions happened in this project | `[ ]` | |
| W5 | **Messages count** | Total turns across all sessions in this project | `[ ]` | |
| W6 | **Duration** | Total time spent in Claude sessions for this project | `[ ]` | |
| W7 | **Lines added / removed** | Git diff stats attributed to Claude activity in this project | `[ ]` | |
| W8 | **Top 5 tools** (with call bars) | Most-used tools in this project — reflects the nature of work (heavy Bash = scripting, heavy Edit = refactoring) | `[ ]` | |
| W9 | **Branches** | Git branches seen across sessions in this project | `[ ]` | |
| W10 | **Estimated cost** | Total dollar cost for all Claude sessions in this project | `[ ]` | |

---

## Progress Summary

| Module | Total Items | Reviewed | Confirmed OK | Needs Fix | Fixed |
|--------|-------------|----------|-------------|-----------|-------|
| Dashboard | 21 | 21 | 6 | 0 | 15 |
| Spending | 19 | 19 | 0 | 0 | 19 |
| Timeline | 5 | 0 | 0 | 0 | 0 |
| Conversations | 10 | 0 | 0 | 0 | 0 |
| Instruments | 4 | 0 | 0 | 0 | 0 |
| Workspaces | 10 | 0 | 0 | 0 | 0 |
| **Total** | **69** | **40** | **6** | **0** | **34** |

---

## Review Log

<!-- Add dated notes here as you work through items -->

### Session: (date TBD)
- Started tracker

### Session: 2026-04-05 — Spending page fixes
- **Root cause identified**: `compileCostAnalytics()` read `total_cost`, `total_savings`, and the full `models` breakdown from `stats-cache.json` (`stats.modelUsage`). Stats-cache is pre-aggregated by Claude Code and can be stale, causing hero stats and the model table to show old numbers.
- **Service rewrite** (`src/modules/spending/service.ts`): removed `loadStatsSnapshot()` dependency entirely. All spending data now aggregated live from `loadSessions()` JSONL files — same source already used for daily spend.
- **Hardcoded model names fixed**: daily cost calc used `'claude-sonnet-4-6'` and by-project used `'claude-opus-4-6'`; replaced with `s.model ?? 'claude-sonnet-4-6'`.
- **Daily cost bucket renamed**: was `costs['sessions']` (opaque), now keyed by `s.model` — enables per-model coloured areas in the chart.
- **Chart date filter** (`spend-over-time-chart.tsx`): replaced `sorted.slice(-window)` (entry count) with calendar cutoff `d.date >= cutoff`; "All" is now truly unbounded (was capped at 365 entries); default window 90d → 30d.
- **Rates table** (`src/common/helpers/rates.ts`): added `claude-sonnet-4-5` explicit entry; added `<synthetic>` zero-rate entry; tightened fuzzy prefix `slice(0,3)` → `slice(0,4)` to avoid `claude-sonnet-4-5` models accidentally matching `claude-sonnet-4-6` pricing.

