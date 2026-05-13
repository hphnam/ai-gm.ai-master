'use client'

import { BookOpen, ClipboardList, Phone, ScrollText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

const examples = [
  {
    Icon: ClipboardList,
    title: 'Opening or closing checklists',
    desc: 'Steps your team ticks off each shift',
  },
  {
    Icon: ScrollText,
    title: 'Recipes, allergens, wine list',
    desc: 'Reference info staff look up on the floor',
  },
  {
    Icon: Phone,
    title: 'Supplier or maintenance contacts',
    desc: 'Who to call when something breaks',
  },
  {
    Icon: BookOpen,
    title: 'House rules and service standards',
    desc: 'How you want things done at your venue',
  },
]

export function KnowledgeEmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="rounded-2xl border bg-card px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Teach your assistant about your venue
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your AI answers staff questions using only what you upload here. The more it knows, the
          more useful it gets. Start with one or two of the things below.
        </p>
        <div className="mt-6">
          <Button size="lg" onClick={onUploadClick} className="cursor-pointer gap-2">
            <Upload className="h-4 w-4" />
            Add your first document
          </Button>
        </div>
      </div>
      <ul className="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
        {examples.map(({ Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3 rounded-lg border bg-background/40 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
