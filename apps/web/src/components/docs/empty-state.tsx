'use client'

import { BookOpen, ClipboardList, Phone, ScrollText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

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
    <EmptyState
      icon={Upload}
      title="Teach your assistant about your venue"
      description="Your AI answers staff questions using only what you upload here. The more it knows, the more useful it gets. Start with one or two of the things below."
      action={
        <Button size="lg" onClick={onUploadClick} className="cursor-pointer gap-2">
          <Upload className="h-4 w-4" />
          Add your first document
        </Button>
      }
    >
      <ul className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
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
    </EmptyState>
  )
}
