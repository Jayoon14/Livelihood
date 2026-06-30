import type { ReactNode } from "react";

interface WorkerLayoutProps {
  children: ReactNode;
}

export default function WorkerLayout({
  children,
}: WorkerLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* Sidebar */}

      <aside className="w-64 bg-blue-700 text-white">

        <div className="p-6 border-b border-blue-600">

          <h1 className="text-2xl font-bold">
            LivelihoodGo
          </h1>

          <p className="text-blue-100 text-sm">
            Worker Panel
          </p>

        </div>

        <nav className="p-4 space-y-2">

          <a
            href="/worker/dashboard"
            className="block rounded-lg px-4 py-3 hover:bg-blue-600"
          >
            Dashboard
          </a>

          <a
            href="/worker/bookings"
            className="block rounded-lg px-4 py-3 hover:bg-blue-600"
          >
            Bookings
          </a>

          <a
            href="/worker/profile"
            className="block rounded-lg px-4 py-3 hover:bg-blue-600"
          >
            Profile
          </a>

        </nav>

      </aside>

      {/* Main */}

      <div className="flex-1">

        <header className="bg-white shadow p-5">

          <h2 className="text-2xl font-bold">
            Worker Dashboard
          </h2>

        </header>

        <main className="p-8">

          {children}

        </main>

      </div>

    </div>
  );
}