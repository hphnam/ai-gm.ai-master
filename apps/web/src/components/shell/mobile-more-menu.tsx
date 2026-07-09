'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  FileText,
  History,
  LogOut,
  MoreVertical,
  Settings,
  ShieldCheck,
  SquarePen,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { markMinted } from '@/lib/minted-conv-ids'

export function MobileMoreMenu() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const venue = useSearchParams().get('venue')

  const onNewChat = () => {
    const conv =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`
    markMinted(conv)
    router.push(venue ? `/chat?venue=${venue}&conv=${conv}` : `/chat?conv=${conv}`)
  }

  const onSignOut = async () => {
    await authClient.signOut()
    queryClient.clear()
    toast.success('Signed out')
    router.replace('/auth/sign-in')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More"
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      >
        <MoreVertical className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onNewChat}>
          <SquarePen className="h-4 w-4" aria-hidden />
          New chat
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/chat/history">
            <History className="h-4 w-4" aria-hidden />
            Chat history
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/docs">
            <BookOpen className="h-4 w-4" aria-hidden />
            Knowledge
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/compliance">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Compliance
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/reports">
            <FileText className="h-4 w-4" aria-hidden />
            Reports
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
