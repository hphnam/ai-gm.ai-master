/// Content-region fallback while a page in the (app) group loads. The shell
/// (sidebar + tab bar) and the top header (@header slot) both stay mounted
/// across navigation, so this covers only the scrollable content column — and
/// stays deliberately minimal so fast/cached navs don't flash a heavy skeleton.
/// A thin indeterminate bar is enough to signal work without layout churn.
export default function AppLoading() {
  return <div className="h-0.5 w-full flex-none animate-pulse bg-foreground/20" />
}
