# Code Insight repository instructions

## Commands

- Install dependencies with `npm install`.
- Use Node.js `20.9.0` or newer in practice. The app is on Next.js 16, and `next build` currently enforces `>=20.9.0` even though `package.json` still says `>=18`.
- Start the local dev server with `npm run dev`. The app runs on `http://localhost:3000`.
- Create a production build with `npm run build`.
- Run the production server with `npm run start`.
- Run the full linter with `npm run lint`.
- Lint a specific file with `npm run lint -- src/path/to/file.tsx`.
- There is currently no `test` script and no `*.test`/`*.spec` test files in this repository.

## Architecture

- This is a Next.js App Router app that uses the local filesystem as its backend. The app reads directly from `~/.claude` rather than a database or remote API. The main raw source is `~/.claude/projects/<slug>/**/*.jsonl`, with additional reads from `history.jsonl`, `plans/`, `todos/`, `memory/`, `settings.json`, `plugins/installed_plugins.json`, and `skills/*/SKILL.md`.
- Keep the current layering intact:
  - `src/app/**` holds routes and page entry points.
  - `src/app/api/**/route.ts` holds very thin JSON endpoints.
  - `src/modules/<feature>/service.ts` holds feature aggregation and transformation logic.
  - `src/common/**` holds shared types, parsers, cache logic, formatting, and reusable UI.
- The main analytics pipeline is: JSONL and local metadata files in `~/.claude` -> `src/common/helpers/data-reader.ts` -> `src/common/helpers/session-cache.ts` -> `src/modules/*/service.ts` compile functions -> `src/app/api/**/route.ts` -> SWR-powered client pages.
- `session-cache.ts` is central to server-side performance. It keeps a warm in-memory cache of sessions and facets, watches `~/.claude/projects` with `fs.watch`, uses a 30 second TTL, and also caches derived computations with `getCachedDerived(key, computeFn)`. New aggregate endpoints should usually build on `getCachedSessions()`, `getCachedFacets()`, and `getCachedDerived(...)` instead of reparsing files on every request.
- Session replay is a separate data path. `/api/sessions/[id]/replay` resolves the raw session JSONL and `turn-parser.ts` reconstructs turns, tool calls/results, compaction events, summaries, thinking blocks, and per-turn cost. Use this path when a change needs raw turn-level detail instead of session summaries.
- Workspace and tool analytics sometimes rescan JSONL files intentionally for extra metadata that is not kept in the summary cache, such as branch turn counts, version history, MCP server usage, and compaction markers. Follow the existing pattern in `src/modules/workspaces/service.ts` and `src/modules/instruments/service.ts` when you need those deeper scans.
- The UI shell lives in `src/app/layout.tsx`, `src/common/components/appearance-provider.tsx`, and `src/common/components/layout/top-nav.tsx`. Most feature pages are client components that fetch from local API routes with SWR polling rather than server components.

## Key conventions

- Keep route handlers thin. Existing API routes usually do nothing except export `dynamic = 'force-dynamic'`, call one `compile*` or `load*` function, and return `NextResponse.json(...)`.
- Reuse shared types from `src/common/types/models.ts` before inventing local response shapes. Analytics, replay, workspace, cost, and tool payloads already have canonical interfaces there.
- Reuse helpers for path and label logic:
  - `src/common/helpers/formatters.ts` handles slug/path conversion, display names, dates, cost, duration, bytes, and token formatting.
  - `src/common/helpers/tool-groups.ts` is the source of truth for tool categorization, MCP parsing, labels, and colors.
  - `src/common/helpers/rates.ts` is the source of truth for cost and cache-efficiency math.
- Preserve the repo's client data-fetching style unless there is a strong reason to refactor it. Most pages define a small local `fetcher`, use SWR directly in the page or feature component, and choose refresh intervals per feature instead of using a shared API client.
- Respect the local-data safety rules already encoded in the app:
  - `/api/import` is preview-only and intentionally does not write imported sessions back to disk.
  - `/api/memory` only writes `.md` files under `~/.claude/projects/<slug>/memory/` and guards against path traversal.
- Use the existing import aliases. `@/*` maps to `src/*`, and `components.json` also defines `components`, `ui`, `lib`, and `utils` aliases rooted in `src/common/**`.
- Match the existing UI style. The project uses Tailwind CSS v4, CSS variables in `src/app/globals.css`, Lucide icons, Recharts for charts, and shadcn-style primitives under `src/common/components/ui`. Feature pages often mix Tailwind classes with explicit inline typography and color styles, especially around headers, stats bars, and charts.
- If you touch packaging or the CLI in `bin/cli.js`, check paths carefully. The runtime app lives under `src/app`, `src/modules`, and `src/common`, while the packaging script still references an older root layout.
- The current dev script is `next dev --webpack`. Do not assume Turbopack is the active development path just because `next.config.ts` contains a `turbopack.root` setting.
