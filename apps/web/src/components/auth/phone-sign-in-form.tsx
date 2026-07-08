'use client'

import { useRouter } from 'next/navigation'
import { PhoneOtpForm } from './phone-otp-form'

export function PhoneSignInForm() {
  const router = useRouter()
  return (
    <PhoneOtpForm
      sendLabel="Text me a code"
      onVerified={() => {
        router.replace('/chat')
        router.refresh()
      }}
    />
  )
}
