'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PhoneSignInForm } from './phone-sign-in-form'
import { SignInForm } from './sign-in-form'

type Method = 'email' | 'phone'

// Sign-in method is a credential choice (email+password vs phone OTP), not a
// role — phone-onboarded staff and email users both land here.
export function SignInMethods({ initialMethod = 'email' }: { initialMethod?: Method }) {
  const [method, setMethod] = useState<Method>(initialMethod)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
        {(['email', 'phone'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            aria-pressed={method === m}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              method === m
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'email' ? 'Email' : 'Phone'}
          </button>
        ))}
      </div>
      {method === 'email' ? <SignInForm /> : <PhoneSignInForm />}
    </div>
  )
}
