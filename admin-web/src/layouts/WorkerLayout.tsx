import type { ReactNode } from "react";

import WorkerSidebar from "../components/worker/WorkerSidebar";
import WorkerNavbar from "../components/worker/WorkerNavbar";
import Footer from "../components/common/Footer";

import { ProfileProvider } from "../context/ProfileContext";

interface WorkerLayoutProps {
  children: ReactNode;
}

export default function WorkerLayout({
  children,
}: WorkerLayoutProps) {
  return (
    <ProfileProvider>

      <div className="min-h-screen bg-slate-100 flex">

        <WorkerSidebar />

        <div className="flex-1 flex flex-col">

          <WorkerNavbar />

          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>

          <Footer />

        </div>

      </div>

    </ProfileProvider>
  );
}