import { PhoneStatusCard } from '@/components/phone/phone-status-card'
import { PageHeader } from '@/components/shell/page-header'

export default function PhonePage() {
  return (
    <>
      <PageHeader title="Phone number" description="Link your phone to use WhatsApp with GM AI." />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <PhoneStatusCard />
        </div>
      </div>
    </>
  )
}
