import { PhoneStatusCard } from '@/components/phone/phone-status-card'

export default function PhonePage() {
  return (
    <section aria-labelledby="phone-settings-title">
      <h2 id="phone-settings-title" className="sr-only">
        Phone number
      </h2>
      <PhoneStatusCard />
    </section>
  )
}
