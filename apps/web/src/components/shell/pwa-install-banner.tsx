'use client'

import { Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'pwa-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallBanner() {
  const [isIOS, setIsIOS] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (isStandalone || localStorage.getItem(DISMISS_KEY)) return

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window))
    setHidden(false)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden || (!isIOS && !installEvent)) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setHidden(true)
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setHidden(true)
    setInstallEvent(null)
  }

  return (
    <div className="fixed inset-x-4 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-lg duration-300 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none md:hidden">
      <div className="min-w-0 flex-1 text-xs text-muted-foreground">
        {isIOS ? (
          <span>
            Add to your Home Screen: tap <Share className="inline h-3.5 w-3.5" aria-label="Share" />{' '}
            then &ldquo;Add to Home Screen&rdquo;
          </span>
        ) : (
          <span>Install the app for quick access from your home screen</span>
        )}
      </div>
      {installEvent ? (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 text-muted-foreground"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
