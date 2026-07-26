import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => setSidebarOpen(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />
      <div
        className={
          "flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out " +
          (sidebarOpen ? "ml-64" : "ml-20")
        }
      >
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1600px] p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
