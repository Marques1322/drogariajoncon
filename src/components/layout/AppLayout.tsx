import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        {/* Header */}
        <Header />

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
