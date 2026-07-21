import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="h-16 px-8 flex items-center justify-between">
        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900">Pharmacy Dashboard</h2>

        {/* Search Bar - Centro */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar medicamentos, clientes..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-6">
          {/* Notification Bell */}
          <button
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors group"
            title="Notificações"
          >
            <Bell className="w-5 h-5 group-hover:text-teal-600 transition-colors" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>

          {/* Branch Selector */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Filial:</span>
            <select className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer hover:text-teal-600">
              <option>Loja Principal</option>
              <option>Filial 2</option>
              <option>Filial 3</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
