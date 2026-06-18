'use client'

import { Building2, ChevronsUpDown, LogOut, Phone, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient, useSession } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

function initials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email.split('@')[0] || '?'
  return (
    source
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export function SidebarUser() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  if (isPending || !session?.user) return null
  const user = session.user

  async function handleSignOut() {
    await authClient.signOut()
    toast.success('Signed out')
    router.replace('/auth/sign-in')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${user.name ?? user.email}`}
          className={cn(
            'group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left',
            'hover:bg-sidebar-accent/60 transition-colors cursor-pointer',
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {initials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name ?? user.email.split('@')[0]}
            </span>
            <span className="truncate text-xs text-sidebar-muted">{user.email}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-muted" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-medium leading-none">
            {user.name ?? user.email.split('@')[0]}
          </p>
          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/organization">
            <Building2 className="h-4 w-4" aria-hidden />
            Organisation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/phone">
            <Phone className="h-4 w-4" aria-hidden />
            Phone number
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <UserIcon className="h-4 w-4" aria-hidden />
          Profile (soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
