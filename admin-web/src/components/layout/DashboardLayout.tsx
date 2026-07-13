
import Topbar from "./Topbar";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({
  children,
}: Props) {
  return (
    <div className="flex bg-slate-100 min-h-screen">



      <div className="flex-1">

        <Topbar />

        <main className="p-8">

          {children}

        </main>

      </div>

    </div>
  );
}