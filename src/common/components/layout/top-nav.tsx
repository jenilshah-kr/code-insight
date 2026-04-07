'use client'

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  type LucideIcon,
  Moon, Sun,
  LayoutDashboard, FolderGit2, MessageSquare, CircleDollarSign,
  Wrench, Activity, History, CheckSquare, FileText, Brain, Settings2,
} from 'lucide-react'
import { useAppearance } from '@/common/components/appearance-provider'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import type { SourceCapabilities } from '@/common/helpers/analytics-source'

type PrefetchMode = 'main'
type CapabilityKey = keyof SourceCapabilities

interface MenuItem {
  href: string
  label: string
  Icon: LucideIcon
  capability: CapabilityKey
  prefetch?: PrefetchMode
}

type RouterPrefetchOptions = NonNullable<Parameters<ReturnType<typeof useRouter>['prefetch']>[1]>

const PREFETCH_KIND_AUTO = 'auto' as RouterPrefetchOptions['kind']

const MENU_ITEMS: MenuItem[] = [
  { href: '/',         label: 'Overview',  Icon: LayoutDashboard,  capability: 'overview', prefetch: 'main' },
  { href: '/projects', label: 'Projects',  Icon: FolderGit2,       capability: 'projects', prefetch: 'main' },
  { href: '/sessions', label: 'Sessions',  Icon: MessageSquare,    capability: 'sessions', prefetch: 'main' },
  { href: '/costs',    label: 'Costs',     Icon: CircleDollarSign, capability: 'costs' },
  { href: '/tools',    label: 'Tools',     Icon: Wrench,           capability: 'tools', prefetch: 'main' },
  { href: '/activity', label: 'Activity',  Icon: Activity,         capability: 'activity', prefetch: 'main' },
  { href: '/history',  label: 'History',   Icon: History,          capability: 'history', prefetch: 'main' },
  { href: '/todos',    label: 'Todos',     Icon: CheckSquare,      capability: 'todos' },
  { href: '/plans',    label: 'Plans',     Icon: FileText,         capability: 'plans' },
  { href: '/memory',   label: 'Memory',    Icon: Brain,            capability: 'memory' },
  { href: '/settings', label: 'Settings',  Icon: Settings2,        capability: 'settings', prefetch: 'main' },
]

function BrandMark() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        background: 'linear-gradient(135deg, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.7) 100%)',
        borderRadius: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 12px rgba(251,191,36,0.3)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-syne), system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 15,
          color: '#040d1e',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        K
      </span>
    </div>
  )
}

export function TopNav() {
  const router = useRouter()
  const currentPath = usePathname()
  const { theme, toggle } = useAppearance()
  const { capabilities, source, setSource } = useAnalyticsSource()

  const prefetchRouteOnIntent = useCallback((href: string) => {
    router.prefetch(href, { kind: PREFETCH_KIND_AUTO })
  }, [router])

  useEffect(() => {
    let cancelled = false

    const prefetchRoute = (href: string) => {
      if (cancelled) return

      router.prefetch(href, { kind: PREFETCH_KIND_AUTO })
    }

    const supportedMainRoutes = MENU_ITEMS
      .filter(item => item.prefetch === 'main' && capabilities[item.capability])
      .map(item => item.href)

    const schedulePrefetch = () => {
      supportedMainRoutes.forEach(prefetchRoute)
    }

    const idleCallbackHandle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(schedulePrefetch, { timeout: 1200 })
        : null
    const timeoutHandle =
      idleCallbackHandle === null
        ? window.setTimeout(schedulePrefetch, 200)
        : null

    return () => {
      cancelled = true

      if (idleCallbackHandle !== null) {
        window.cancelIdleCallback?.(idleCallbackHandle)
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle)
      }
    }
  }, [capabilities, router])

  return (
    <header className="sticky top-0 z-40 bg-sidebar border-b border-sidebar-border">
      {/* Brand row — CSS grid: spacer | centered lockup | controls */}
      <div
        className="px-4 py-2.5 border-b border-sidebar-border"
        style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}
      >
        {/* col 1: empty spacer */}
        <div />

        {/* col 2: KROGER · [K] · CODE INSIGHT lockup */}
        <div className="flex items-center gap-2.5">
          {/* KROGER — parent brand */}
          <span
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase',
            }}
          >
            KROGER
          </span>

          {/* thin divider */}
          <span
            style={{
              display: 'block',
              width: 1,
              height: 16,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 1,
            }}
          />

          <BrandMark />

          {/* thin divider */}
          <span
            style={{
              display: 'block',
              width: 1,
              height: 16,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 1,
            }}
          />

          {/* CODE INSIGHT — product name */}
          <span
            style={{
              fontFamily: 'var(--font-syne), system-ui, sans-serif',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.1em',
              color: '#ffffff',
            }}
          >
            CODE INSIGHT
          </span>
        </div>

        {/* col 3: controls — right-aligned */}
        <div className="flex items-center gap-2 justify-end">
          <div className="flex items-center rounded border border-sidebar-border overflow-hidden">
            {(['claude', 'copilot'] as const).map((item) => {
              const active = source === item
              return (
                <button
                  key={item}
                  onClick={() => setSource(item)}
                  className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] transition-colors cursor-pointer"
                  style={{
                    color: active ? '#040d1e' : 'rgba(255,255,255,0.55)',
                    background: active ? '#fbbf24' : 'transparent',
                    borderRight: item === 'claude' ? '1px solid rgba(255,255,255,0.12)' : 'none',
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sidebar-accent/60 border border-sidebar-border">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#34d399] shrink-0"
              style={{ boxShadow: '0 0 6px rgba(52,211,153,0.7)', animation: 'navPulse 2s ease infinite' }}
            />
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em' }}>
              LIVE
            </span>
          </div>

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-1.5 rounded text-white/40 hover:text-white hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nav row */}
      <nav className="flex overflow-x-auto scrollbar-hide px-1.5">
        {MENU_ITEMS.map(({ href, label, Icon, capability }) => {
          const isActive = currentPath === href
          const canPrefetchOnIntent = capabilities[capability]
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onMouseEnter={canPrefetchOnIntent ? () => prefetchRouteOnIntent(href) : undefined}
              onFocus={canPrefetchOnIntent ? () => prefetchRouteOnIntent(href) : undefined}
              className="shrink-0 relative flex items-center gap-2 px-4 py-3 transition-all duration-150"
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.04em',
                color: isActive ? '#ffffff' : 'rgba(200,221,240,0.65)',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ opacity: isActive ? 1 : 0.6 }} />
              {label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                    boxShadow: '0 0 6px rgba(251,191,36,0.6)',
                  }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
