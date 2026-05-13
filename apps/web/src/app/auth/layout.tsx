export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            G
          </div>
          <h1 className="text-lg font-semibold tracking-tight">GM AI</h1>
          <p className="text-sm text-muted-foreground">Hospitality ops + knowledge chat</p>
        </div>
        {children}
      </div>
    </main>
  )
}
