'use client'

import { Building2, LogOut, Phone, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient, useSession } from '@/lib/auth-client'

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

export function UserMenu() {
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
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 p-0"
          aria-label={`Account menu for ${user.name ?? user.email}`}
        >
          <Avatar>
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
            Organisation settings
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
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
