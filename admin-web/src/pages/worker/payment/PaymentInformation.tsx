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
        <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <LoaderCircle className="h-7 w-7 animate-spin" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
              Loading payment information
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Please wait while your saved payment
              methods are retrieved.
            </p>
          </div>
        </main>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <main className="min-h-screen bg-slate-50 p-3 pb-32 sm:p-6 sm:pb-32 lg:p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-6">
          {message && (
            <div
              role={
                message.type === "error"
                  ? "alert"
                  : "status"
              }
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {message.type ===
                  "error" && (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMessage(null)
                }
                className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-5 text-white shadow-xl sm:rounded-3xl sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <WalletCards className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                    Worker Settings
                  </p>

                  <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                    Payment Information
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                    Configure the payment methods
                    customers can use for your
                    services.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                    Active Methods
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {
                      activePaymentMethods.length
                    }
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-50"
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

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />

              <div>
                <h2 className="font-bold text-blue-900 dark:text-blue-100">
                  Keep your payment details accurate
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-300">
                  Never enter card PINs, CVVs,
                  one-time passwords, or card
                  expiration details. Only provide
                  payment-receiving information.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Available Payment Methods
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enabled methods are shown to
                  customers during payment.
                </p>
              </div>

              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
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

          <div className="space-y-6">
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
          </div>
        </div>

        <section className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:pl-[var(--worker-sidebar-width,0px)] dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden sm:block">
              <p className="font-bold text-slate-900 dark:text-white">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      className={`rounded-xl border p-3 sm:p-4 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${
            enabled
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-slate-400"
          }`}
        />

        <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
          {label}
        </span>
      </div>

      <p
        className={`mt-2 text-xs font-semibold ${
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
