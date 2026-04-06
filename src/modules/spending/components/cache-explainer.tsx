export function CacheExplainer() {
  return (
    <div className="text-[13px] space-y-2 text-muted-foreground">
      <p>
        <span className="text-[#6d28d9] dark:text-[#a78bfa] font-bold">Cache writes</span> — Claude saves context to a temporary cache.
        Billed at 1.25× input rate.
      </p>
      <p>
        <span className="text-[#047857] dark:text-[#34d399] font-bold">Cache reads</span> — Subsequent requests reuse the cached context.
        Billed at 0.1× input rate (10× cheaper).
      </p>
      <p className="text-muted-foreground/60 text-[12px]">
        Cache hit rate = cache reads / (inputs + cache reads).
        Higher is better.
      </p>
    </div>
  )
}
