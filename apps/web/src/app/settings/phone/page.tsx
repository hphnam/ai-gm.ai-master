import { PhoneStatusCard } from '@/components/phone/phone-status-card'

export default function PhonePage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Phone number</h1>
        <p className="text-sm text-muted-foreground">
          Link your phone to use WhatsApp with GM AI. {`We'll`} send you a
          6-digit code by SMS.
        </p>
      </header>
      <PhoneStatusCard />
    </section>
  )
}
