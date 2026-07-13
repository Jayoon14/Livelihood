import type { ReactNode } from "react";

import WorkerSidebar from "./WorkerSidebar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

interface WorkerLayoutProps {
  children: ReactNode;
}

export default function WorkerLayout({
  children,
}: WorkerLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex">

      <WorkerSidebar />

      <div className="flex-1 flex flex-col">

        <Navbar />

        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>

        <Footer />

      </div>

    </div>
  );
}