'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Polished toast styling — neutral card with a small colored status dot for
 * variants. Replaces sonner's richColors mode (tinted pastel backgrounds) so
 * notifications match the app's restrained palette. Status comes through the
 * dot + icon, not the background.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        // Sonner appends these to its own data-attributed root, so each
        // variant inherits the base toast styling and only adjusts what's
        // semantically different (the leading icon + accent dot).
        classNames: {
          // Right padding leaves room for the close button so long descriptions
          // never crash into it. Min-height pairs with the close button size
          // below so single-line toasts stay vertically balanced.
          toast: [
            'group toast pointer-events-auto',
            'group-[.toaster]:flex group-[.toaster]:items-start group-[.toaster]:gap-2.5',
            'group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-border',
            'group-[.toaster]:bg-card group-[.toaster]:text-foreground',
            'group-[.toaster]:py-3 group-[.toaster]:pl-4 group-[.toaster]:pr-9',
            'group-[.toaster]:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]',
            'group-[.toaster]:font-sans group-[.toaster]:text-[13px] group-[.toaster]:leading-snug',
          ].join(' '),
          title: 'group-[.toast]:font-medium group-[.toast]:tracking-tight',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-[12.5px]',
          // Icon container — use flex centering and a height matching the text
          // line-height so the glyph aligns with the *first line* of the title.
          // (mt-0.5 was eyeballing baseline; this is geometrically correct.)
          icon: [
            'group-[.toast]:m-0 group-[.toast]:shrink-0',
            'group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center',
            'group-[.toast]:h-[18px] group-[.toast]:w-4',
            '[&>svg]:h-3.5 [&>svg]:w-3.5',
          ].join(' '),
          actionButton: [
            'group-[.toast]:inline-flex group-[.toast]:items-center',
            'group-[.toast]:rounded-md group-[.toast]:px-2.5 group-[.toast]:py-1',
            'group-[.toast]:text-[12px] group-[.toast]:font-medium',
            'group-[.toast]:bg-foreground group-[.toast]:text-background',
            'group-[.toast]:hover:bg-foreground/90 group-[.toast]:cursor-pointer',
            'group-[.toast]:transition-colors',
          ].join(' '),
          cancelButton: [
            'group-[.toast]:inline-flex group-[.toast]:items-center',
            'group-[.toast]:rounded-md group-[.toast]:px-2.5 group-[.toast]:py-1',
            'group-[.toast]:text-[12px] group-[.toast]:font-medium',
            'group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground',
            'group-[.toast]:hover:bg-muted group-[.toast]:hover:text-foreground',
            'group-[.toast]:cursor-pointer group-[.toast]:transition-colors',
          ].join(' '),
          // Close button — pinned to the top-right corner of the toast (flush
          // with the inner padding rhythm). The `!important` flags override
          // sonner's hardcoded absolute positioning + tiny default sizing.
          closeButton: [
            'group-[.toast]:!absolute group-[.toast]:!left-auto',
            'group-[.toast]:!right-1.5 group-[.toast]:!top-1.5 group-[.toast]:!transform-none',
            'group-[.toast]:!h-6 group-[.toast]:!w-6',
            'group-[.toast]:!rounded-md group-[.toast]:!border-0 group-[.toast]:!bg-transparent',
            'group-[.toast]:!text-muted-foreground',
            'hover:group-[.toast]:!bg-muted hover:group-[.toast]:!text-foreground',
            'group-[.toast]:cursor-pointer group-[.toast]:transition-colors',
            'group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center',
            '[&>svg]:!h-3 [&>svg]:!w-3',
          ].join(' '),
          // Variant accents — small colored dot/icon, neutral card stays
          // unchanged. Sonner's default success/error/info/warning toasts get
          // these classes; the icon colour is what distinguishes them.
          success: '[&_[data-icon]>svg]:text-emerald-600',
          error: '[&_[data-icon]>svg]:text-destructive',
          warning: '[&_[data-icon]>svg]:text-amber-500',
          info: '[&_[data-icon]>svg]:text-foreground/60',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
