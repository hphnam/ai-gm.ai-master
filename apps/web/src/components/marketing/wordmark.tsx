import { cn } from '@/lib/utils'

// Echoes the in-app mark: ink square with a single glyph, set against the
// warm paper background. Kept as one small component so the header, footer
// and any future auth screens share exactly one wordmark.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary font-bold text-[13px] text-primary-foreground">
        G
      </span>
      <span className="text-[15px] font-semibold tracking-tight">gm-ai</span>
    </span>
  )
}
