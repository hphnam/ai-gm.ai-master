export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">GM AI</h1>
          <p className="text-sm text-muted-foreground">
            Hospitality ops + knowledge chat
          </p>
        </div>
        {children}
      </div>
    </main>
  )
}
