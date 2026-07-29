import { AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ConfirmActionOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

export function confirmAction(
  message: string,
  options: ConfirmActionOptions = {},
): Promise<boolean> {
  const {
    title = "Confirm action",
    confirmText = "Confirm",
    cancelText = "Cancel",
  } = options;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: boolean, toastId: string | number) => {
      if (settled) return;
      settled = true;
      toast.dismiss(toastId);
      resolve(value);
    };

    toast.custom(
      (id) => (
        <div className="w-[min(92vw,380px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => finish(false, id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              {cancelText}
            </button>

            <button
              type="button"
              onClick={() => finish(true, id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Check className="h-4 w-4" />
              {confirmText}
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        onDismiss: () => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        },
      },
    );
  });
}
