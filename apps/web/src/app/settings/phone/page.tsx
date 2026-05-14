import { PhoneStatusCard } from '@/components/phone/phone-status-card'

export default function PhonePage() {
  return (
    <section aria-labelledby="phone-settings-title">
      <header className="mb-4">
        <h2 id="phone-settings-title" className="text-base font-semibold tracking-tight">
          Phone number
        </h2>
        <p className="text-xs text-muted-foreground">Link your phone to use WhatsApp with GM AI.</p>
      </header>
      <PhoneStatusCard />
    </section>
  )
}
