'use client'

import { Loader2, Trash2 } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  /** Resolves on success. Throw to surface inline error and keep the dialog open. */
  onConfirm: () => Promise<unknown>
  isPending?: boolean
  /** Optional override for the destructive button label. Defaults to "Delete". */
  confirmLabel?: string
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
  confirmLabel = 'Delete',
}: ConfirmDeleteDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Caller is expected to surface the error (toast or inline). We leave the
      // dialog open so the user can retry or cancel.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-left">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            className="cursor-pointer gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Defaults to "Delete". */
  label?: string
  /** Use 'icon' to render an icon-only button (with aria-label). */
  size?: 'default' | 'sm' | 'icon'
  /** Use when the button sits in a tight row — minimal padding, ghost feel. */
  variant?: 'destructive' | 'destructive-ghost'
}

/**
 * Consistent delete trigger: bin icon + "Delete" text, destructive styling.
 * Pair with `<ConfirmDeleteDialog>` for the safety net.
 */
export const DeleteButton = React.forwardRef<HTMLButtonElement, DeleteButtonProps>(
  ({ label = 'Delete', size = 'sm', variant = 'destructive-ghost', className, ...props }, ref) => {
    const base =
      'inline-flex cursor-pointer items-center gap-1.5 rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
    const sizing =
      size === 'icon'
        ? 'h-8 w-8 justify-center p-0'
        : size === 'default'
          ? 'h-9 px-3 py-2'
          : 'h-8 px-2.5 py-1.5'
    const tone =
      variant === 'destructive'
        ? 'border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10'
        : 'text-destructive hover:bg-destructive/10'
    return (
      <button
        ref={ref}
        type="button"
        className={[base, sizing, tone, className].filter(Boolean).join(' ')}
        {...props}
      >
        <Trash2 className={size === 'icon' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden />
        {size === 'icon' ? <span className="sr-only">{label}</span> : label}
      </button>
    )
  },
)
DeleteButton.displayName = 'DeleteButton'
