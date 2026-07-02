import type { ReactNode } from "react";
import WorkerSidebar from "./WorkerSidebar";

interface WorkerLayoutProps {
  children: ReactNode;
}

export default function WorkerLayout({
  children,
}: WorkerLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <WorkerSidebar />

      <div className="flex-1">

        <header className="bg-white shadow px-8 py-5">

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