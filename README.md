# Code Insight

**AI developer analytics dashboard for Kroger Engineering.**

Reads directly from `~/.claude/` — no cloud, no telemetry, just your local data.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- **Overview** — Token usage over time, project activity, peak hours heatmap, model breakdown
- **Projects** — Per-project cost, sessions, tools, and git branches
- **Sessions** — Full session replay with per-turn token display and timeline
- **Costs** — Stacked cost charts by model and project, cache efficiency panel
- **Tools** — Tool rankings, MCP server details, feature adoption
- **Activity** — GitHub-style heatmap, streaks, day-of-week patterns
- **History** — Searchable command history from `~/.claude/history.jsonl`
- **Memory** — Browse and edit Claude Code memory files across all projects
- **Todos / Plans** — View todo and plan files from `~/.claude/`
- **Settings** — Inspect `~/.claude/settings.json`
- **Export** — Download full JSONL or zip export

## Data Source

| Path | Contents |
|---|---|
| `~/.claude/projects/<slug>/*.jsonl` | Session data (primary) |
| `~/.claude/stats-cache.json` | Aggregated stats |
| `~/.claude/history.jsonl` | Command history |
| `~/.claude/todos/` | Todo files |
| `~/.claude/plans/` | Plan files |
| `~/.claude/memory/` | Memory files |
| `~/.claude/settings.json` | Settings & plugins |

Data refreshes every 5 seconds.

## Tech Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Recharts · SWR

---

*Kroger Technology — Internal use only*
