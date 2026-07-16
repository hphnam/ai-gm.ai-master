import { redirect } from 'next/navigation'

// Organisation split into General (business profile) + Team (members & invites).
// Kept as a redirect so old links / bookmarks land somewhere sensible.
export default function OrganizationSettingsRedirect() {
  redirect('/settings/general')
}
