import type { ReactNode } from "react";
import CustomerSidebar from "./CustomerSidebar";

interface Props {
  children: ReactNode;
}

export default function CustomerLayout({
  children,
}: Props) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <CustomerSidebar />

      <div className="flex-1">

        <header className="bg-white shadow px-8 py-5 flex justify-between items-center">

          <h2 className="text-2xl font-bold">
            Customer Dashboard
          </h2>

          <div className="font-semibold">
            Welcome 👋
          </div>

        </header>

        <main className="p-8">
          {children}
        </main>

      </div>

    </div>
  );
}