function DashboardLayout({ sidebar, children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden w-[260px] shrink-0 border-r border-border bg-bg-alt md:flex md:flex-col">
        {sidebar}
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
