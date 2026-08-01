import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import BankSection from "../../../components/worker/BankSection";
import CashSection from "../../../components/worker/CashSection";
import GCashSection from "../../../components/worker/GCashSection";
import MayaSection from "../../../components/worker/MayaSection";
import WorkerLayout from "../../../layouts/WorkerLayout";
import {
  getMyPaymentInformation,
  saveMyPaymentInformation,
} from "../../../services/paymentInformationService";
import {
  defaultPaymentForm,
  type PaymentForm,
} from "../../../types/paymentForm";

type PageMessage =
  | {
      type: "error" | "success";
      text: string;
    }
  | null;

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function toForm(
  data: Awaited<
    ReturnType<typeof getMyPaymentInformation>
  >,
): PaymentForm {
  if (!data) {
    return { ...defaultPaymentForm };
  }

  return {
    accept_cash: Boolean(data.accept_cash),

    enable_gcash: Boolean(data.enable_gcash),
    gcash_name: data.gcash_name || "",
    gcash_number: data.gcash_number || "",
    gcash_qr: data.gcash_qr || "",

    enable_maya: Boolean(data.enable_maya),
    maya_name: data.maya_name || "",
    maya_number: data.maya_number || "",
    maya_qr: data.maya_qr || "",

    enable_bank: Boolean(data.enable_bank),
    bank_name: data.bank_name || "",
    account_name: data.account_name || "",
    account_number: data.account_number || "",

    // Legacy field is intentionally ignored.
    card_expiration: "",

    bank_qr: data.bank_qr || "",
  };
}

function serializeForm(form: PaymentForm): string {
  return JSON.stringify(form);
}

export default function PaymentInformation() {
  const initialFormRef =
    useRef<PaymentForm>({
      ...defaultPaymentForm,
    });

  const [form, setForm] =
    useState<PaymentForm>({
      ...defaultPaymentForm,
    });

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [refreshing, setRefreshing] =
    useState(false);
  const [message, setMessage] =
    useState<PageMessage>(null);

  const hasUnsavedChanges = useMemo(
    () =>
      serializeForm(form) !==
      serializeForm(initialFormRef.current),
    [form],
  );

  const activePaymentMethods = useMemo(
    () =>
      [
        form.accept_cash && "Cash",
        form.enable_gcash && "GCash",
        form.enable_maya && "Maya",
        form.enable_bank &&
          "Bank Transfer",
      ].filter(
        (value): value is string =>
          Boolean(value),
      ),
    [
      form.accept_cash,
      form.enable_bank,
      form.enable_gcash,
      form.enable_maya,
    ],
  );

  const loadPaymentInformation =
    useCallback(
      async (
        showRefresh = false,
      ): Promise<void> => {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const data =
            await getMyPaymentInformation();
          const nextForm = toForm(data);

          setForm(nextForm);
          initialFormRef.current = nextForm;
          setMessage(null);
        } catch (error) {
          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              "Unable to load payment information.",
            ),
          });
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadPaymentInformation();
  }, [loadPaymentInformation]);

  useEffect(() => {
    function handleBeforeUnload(
      event: BeforeUnloadEvent,
    ) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
  }, [hasUnsavedChanges]);

  function handleChange<
    K extends keyof PaymentForm,
  >(
    field: K,
    value: PaymentForm[K],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave(): Promise<void> {
    if (saving || !hasUnsavedChanges) {
      return;
    }

    try {
      setSaving(true);

      await saveMyPaymentInformation(form);

      initialFormRef.current = {
        ...form,
        card_expiration: "",
      };

      setForm((current) => ({
        ...current,
        card_expiration: "",
      }));

      setMessage({
        type: "success",
        text: "Payment information saved successfully.",
      });
      toast.success(
        "Payment information saved successfully.",
      );
    } catch (error) {
      const text = getErrorMessage(
        error,
        "Unable to save payment information.",
      );

      setMessage({
        type: "error",
        text,
      });
      toast.error(text);
    } finally {
      setSaving(false);
    }
  }

  function handleReset(): void {
    setForm({
      ...initialFormRef.current,
    });
    setMessage(null);
  }

  if (loading) {
    return (
      <WorkerLayout>
        <main className="relative flex min-h-[78vh] items-center justify-center overflow-hidden bg-slate-50 px-4 dark:bg-slate-950">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
            style={{
              backgroundImage:
                "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />

          <section className="relative w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <LoaderCircle className="h-7 w-7 animate-spin" />
            </div>

            <h1 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              Loading payment information
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Please wait while your saved payment methods are retrieved.
            </p>
          </section>
        </main>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 pb-36 sm:p-5 sm:pb-36 lg:p-8 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-6">
          {message && (
            <div
              role={
                message.type === "error"
                  ? "alert"
                  : "status"
              }
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${
                message.type === "error"
                  ? "border-red-200 bg-red-50/95 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              }`}
            >
              <div className="flex min-w-0 items-start gap-2">
                {message.type ===
                  "error" && (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span className="min-w-0 leading-6">{message.text}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMessage(null)
                }
                className="shrink-0 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <header className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-600 p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)] sm:p-7 lg:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />

            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
                  <WalletCards className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                    Worker Settings
                  </p>

                  <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    Payment Information
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                    Configure the payment methods customers can use for your
                    services.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl sm:min-w-40">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-100">
                    Active Methods
                  </p>

                  <p className="mt-1 text-3xl font-black">
                    {activePaymentMethods.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadPaymentInformation(
                      true,
                    )
                  }
                  disabled={refreshing || saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50/95 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/30 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-black text-blue-900 dark:text-blue-100">
                  Keep your payment details accurate
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-300">
                  Never enter card PINs, CVVs, one-time passwords, or card
                  expiration details. Only provide payment-receiving
                  information.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                  Payment Availability
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  Available Payment Methods
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Enabled methods are shown to customers during payment.
                </p>
              </div>

              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
                  activePaymentMethods.length > 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                }`}
              >
                {activePaymentMethods.length >
                0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}

                {activePaymentMethods.length >
                0
                  ? `${activePaymentMethods.length} enabled`
                  : "No method enabled"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MethodStatus
                icon={Banknote}
                label="Cash"
                enabled={form.accept_cash}
              />

              <MethodStatus
                icon={Smartphone}
                label="GCash"
                enabled={form.enable_gcash}
              />

              <MethodStatus
                icon={Smartphone}
                label="Maya"
                enabled={form.enable_maya}
              />

              <MethodStatus
                icon={CreditCard}
                label="Bank Transfer"
                enabled={form.enable_bank}
              />
            </div>
          </section>

          <section className="space-y-5 sm:space-y-6">
            <CashSection
              acceptCash={form.accept_cash}
              onChange={(value) =>
                handleChange(
                  "accept_cash",
                  value,
                )
              }
            />

            <GCashSection
              values={{
                enable_gcash:
                  form.enable_gcash,
                gcash_name: form.gcash_name,
                gcash_number:
                  form.gcash_number,
                gcash_qr: form.gcash_qr,
              }}
              onChange={(field, value) =>
                handleChange(
                  field as keyof PaymentForm,
                  value as PaymentForm[keyof PaymentForm],
                )
              }
            />

            <MayaSection
              values={{
                enable_maya:
                  form.enable_maya,
                maya_name: form.maya_name,
                maya_number:
                  form.maya_number,
                maya_qr: form.maya_qr,
              }}
              onChange={(field, value) =>
                handleChange(
                  field as keyof PaymentForm,
                  value as PaymentForm[keyof PaymentForm],
                )
              }
            />

            <BankSection
              values={{
                enable_bank:
                  form.enable_bank,
                bank_name: form.bank_name,
                account_name:
                  form.account_name,
                account_number:
                  form.account_number,
                card_expiration: "",
                bank_qr: form.bank_qr,
              }}
              onChange={(field, value) =>
                handleChange(
                  field as keyof PaymentForm,
                  value as PaymentForm[keyof PaymentForm],
                )
              }
            />
          </section>
        </div>

        <section className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_35px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:pl-[var(--worker-sidebar-width,0px)] dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden sm:block">
              <p className="font-black text-slate-900 dark:text-white">
                {hasUnsavedChanges
                  ? "You have unsaved changes"
                  : "Payment settings are saved"}
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Save before leaving this page.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={handleReset}
                disabled={
                  saving ||
                  !hasUnsavedChanges
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:translate-y-0 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={
                  saving ||
                  !hasUnsavedChanges
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </WorkerLayout>
  );
}

function MethodStatus({
  icon: Icon,
  label,
  enabled,
}: {
  icon: typeof Banknote;
  label: string;
  enabled: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 transition sm:p-4 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            enabled
              ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
              : "bg-white text-slate-400 shadow-sm dark:bg-slate-900"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <span className="min-w-0 truncate text-sm font-black text-slate-800 dark:text-slate-200">
          {label}
        </span>
      </div>

      <p
        className={`mt-3 text-xs font-bold ${
          enabled
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-400"
        }`}
      >
        {enabled ? "Enabled" : "Disabled"}
      </p>
    </div>
  );
}