import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Flag, Gavel, X } from "lucide-react";

import MyAppealsPage from "../enforcement/MyAppealsPage";
import MyReportsPage from "../reports/MyReportsPage";
import type { ReportParticipantRole } from "../../types/report";

type AccountView = "reports" | "appeals";

interface Props {
  open: boolean;
  role: ReportParticipantRole;
  activeView: AccountView;
  onActiveViewChange: (view: AccountView) => void;
  onClose: () => void;
}

function BareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function AccountActivityModal({
  open,
  role,
  activeView,
  onActiveViewChange,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reports and appeals"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-(--app-bg) shadow-2xl sm:h-[92dvh] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-(--app-border)">
        <header className="shrink-0 border-b border-(--app-border) bg-(--app-surface) px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
                Account activity
              </p>
              <h2 className="truncate text-xl font-black text-(--app-text) sm:text-2xl">
                Reports & Appeals
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close reports and appeals"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--app-border) bg-(--app-surface-soft) text-(--app-text) transition hover:bg-(--app-hover)"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-(--app-surface-soft) p-1.5">
            <button
              type="button"
              onClick={() => onActiveViewChange("reports")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                activeView === "reports"
                  ? "bg-(--app-surface) text-blue-600 shadow-sm"
                  : "text-(--app-text-muted) hover:bg-(--app-hover) hover:text-(--app-text)"
              }`}
            >
              <Flag size={17} />
              My Reports
            </button>

            <button
              type="button"
              onClick={() => onActiveViewChange("appeals")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                activeView === "appeals"
                  ? "bg-(--app-surface) text-violet-600 shadow-sm"
                  : "text-(--app-text-muted) hover:bg-(--app-hover) hover:text-(--app-text)"
              }`}
            >
              <Gavel size={17} />
              My Appeals
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {activeView === "reports" ? (
            <MyReportsPage role={role} layout={BareLayout} />
          ) : (
            <MyAppealsPage role={role} layout={BareLayout} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
