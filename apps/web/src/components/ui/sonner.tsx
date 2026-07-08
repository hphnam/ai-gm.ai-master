'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: [
            'group toast pointer-events-auto',
            'group-[.toaster]:flex group-[.toaster]:items-start group-[.toaster]:gap-2.5',
            'group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-border',
            'group-[.toaster]:bg-card group-[.toaster]:text-foreground',
            'group-[.toaster]:py-3 group-[.toaster]:pl-4 group-[.toaster]:pr-9',
            'group-[.toaster]:shadow-md',
            'group-[.toaster]:font-sans group-[.toaster]:text-sm group-[.toaster]:leading-snug',
          ].join(' '),
          title: 'group-[.toast]:font-medium group-[.toast]:tracking-tight',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-xs',
          icon: [
            'group-[.toast]:m-0 group-[.toast]:shrink-0',
            'group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center',
            'group-[.toast]:h-[18px] group-[.toast]:w-4',
            '[&>svg]:h-3.5 [&>svg]:w-3.5',
          ].join(' '),
          actionButton: [
            'group-[.toast]:inline-flex group-[.toast]:items-center',
            'group-[.toast]:rounded-md group-[.toast]:px-2.5 group-[.toast]:py-1',
            'group-[.toast]:text-xs group-[.toast]:font-medium',
            'group-[.toast]:bg-foreground group-[.toast]:text-background',
            'group-[.toast]:hover:bg-foreground/90 group-[.toast]:cursor-pointer',
            'group-[.toast]:transition-colors',
          ].join(' '),
          cancelButton: [
            'group-[.toast]:inline-flex group-[.toast]:items-center',
            'group-[.toast]:rounded-md group-[.toast]:px-2.5 group-[.toast]:py-1',
            'group-[.toast]:text-xs group-[.toast]:font-medium',
            'group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground',
            'group-[.toast]:hover:bg-muted group-[.toast]:hover:text-foreground',
            'group-[.toast]:cursor-pointer group-[.toast]:transition-colors',
          ].join(' '),
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
          success: '[&_[data-icon]>svg]:text-success',
          error: '[&_[data-icon]>svg]:text-destructive',
          warning: '[&_[data-icon]>svg]:text-warning',
          info: '[&_[data-icon]>svg]:text-foreground/60',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
