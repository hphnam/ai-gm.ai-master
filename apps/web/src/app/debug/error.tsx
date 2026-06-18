'use client'

import { Button } from '@/components/ui/button'

type Props = {
  error: Error
  reset: () => void
}

export default function DebugError({ error, reset }: Props) {
  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="border border-destructive/40 bg-destructive/10 rounded-md p-4 space-y-3">
        <h2 className="text-base font-semibold">Debug surface error</h2>
        <p className="text-sm text-muted-foreground">{error.message || 'Unknown error'}</p>
        <Button onClick={reset} variant="outline" size="sm">
          Try again
        </Button>
      </div>
    </div>
  )
}
