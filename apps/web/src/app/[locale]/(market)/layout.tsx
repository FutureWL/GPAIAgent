// Market layout - 仅用于路由组组织，不渲染额外 UI
// AppShell 在 [locale]/layout.tsx 中统一渲染
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
