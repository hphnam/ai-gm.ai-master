// IDs freshly minted client-side this session. Used by `useConversation` to
// skip the initial GET for IDs we know don't exist server-side yet — the
// server upserts on the first send. Avoids the "Loading conversation…"
// flash when venue-picking or clicking "New chat".
const minted = new Set<string>()

export function markMinted(id: string): void {
  minted.add(id)
}

export function isMinted(id: string | null | undefined): boolean {
  return id ? minted.has(id) : false
}
