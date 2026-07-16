import { cn } from '@/lib/utils'

// The AI-GM lockup: "GM" in Archivo 800 with a baseline-nudged "AI" mono tag on
// brass. One component so the header (light) and footer (dark) share exactly one
// mark; `variant` swaps the ink/cream + brass tones for the surface it sits on.
export function Wordmark({
  variant = 'light',
  className,
}: {
  variant?: 'light' | 'dark'
  className?: string
}) {
  const dark = variant === 'dark'
  return (
    <span className={cn('flex items-start', dark ? 'gap-1' : 'gap-[5px]', className)}>
      <span
        className={cn(
          'font-bold leading-none tracking-[-0.06em]',
          dark ? 'text-[22px] text-[var(--cream)]' : 'text-[26px] text-[var(--ink-text)]',
        )}
      >
        GM
      </span>
      <span
        className={cn(
          'font-mono-ledger mt-0.5 rounded-[3px] font-bold leading-none',
          dark
            ? 'bg-[var(--brass-dark)] px-1 py-[3px] text-[9px] text-[var(--ink)]'
            : 'bg-[var(--brass)] px-[5px] py-1 text-[10px] text-[var(--cream-hi)]',
        )}
      >
        AI
      </span>
    </span>
  )
}
