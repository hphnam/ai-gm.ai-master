import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Phone sign-in is now a tab on the unified sign-in page. Keep this route as a
// permanent redirect so old links / bookmarks land on the phone tab.
export default function PhoneSignInPage() {
  redirect('/auth/sign-in?method=phone')
}
