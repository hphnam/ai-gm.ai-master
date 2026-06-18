'use client'

import { AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { ProactiveSuggestionDto as ProactiveSuggestion } from '@/generated/api'
import { cn } from '@/lib/utils'

type Props = {
  suggestions: ProactiveSuggestion[] | undefined
  isLoading?: boolean
}

export function SuggestionsSurface({ suggestions, isLoading }: Props) {
  if (isLoading) return null
  if (!suggestions || suggestions.length === 0) return null

  return (
    <section aria-label="Suggestions" className="flex flex-col gap-2">
      {suggestions.map((s, i) => {
        const isWarn = s.severity === 'warn'
        const Icon = isWarn ? AlertTriangle : Info
        const label = isWarn ? 'Warning' : 'Info'
        return (
          <Card
            key={`${s.kind}-${s.itemIds[0] ?? i}`}
            className={cn(
              'border-l-4',
              isWarn ? 'border-l-destructive' : 'border-l-muted-foreground',
            )}
          >
            <CardContent className="flex items-start gap-3 p-3 text-sm">
              <Icon
                aria-hidden="true"
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  isWarn ? 'text-destructive' : 'text-muted-foreground',
                )}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label} · {s.kind}
                </span>
                <span>{s.text}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
