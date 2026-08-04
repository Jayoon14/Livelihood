import { Turnstile } from "@marsidev/react-turnstile";
import { LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useEffect } from "react";

interface CaptchaVerificationModalProps {
  open: boolean;
  siteKey: string;
  title: string;
  description: string;
  processing: boolean;
  widgetKey: number;
  onClose: () => void;
  onSuccess: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

export default function CaptchaVerificationModal({
  open,
  siteKey,
  title,
  description,
  processing,
  widgetKey,
  onClose,
  onSuccess,
  onExpire,
  onError,
}: CaptchaVerificationModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !processing) {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, processing, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="captcha-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.30)] dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h2
                id="captcha-modal-title"
                className="text-lg font-black text-slate-950 dark:text-white"
              >
                {title}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close security verification"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex min-h-[96px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
            {processing ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <LoaderCircle
                  className="animate-spin text-emerald-600"
                  size={28}
                />

                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Verification successful. Continuing...
                </p>
              </div>
            ) : (
              <Turnstile
                key={widgetKey}
                siteKey={siteKey}
                options={{
                  theme: "auto",
                  size: "flexible",
                }}
                onSuccess={onSuccess}
                onExpire={onExpire}
                onError={onError}
              />
            )}
          </div>

          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            Cloudflare Turnstile protects this action from automated submissions
            and abuse.
          </p>
        </div>
      </div>
    </div>
  );
}
