/// Up-to-two-letter avatar initials from a name, falling back to the email
/// local-part. Shared by the sidebar profile, the mobile top-bar avatar, and the
/// More sheet so they never drift.
export function initials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email.split('@')[0] || '?'
  return (
    source
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}
