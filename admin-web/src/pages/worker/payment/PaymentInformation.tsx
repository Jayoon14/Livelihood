import { useEffect, useMemo, useState } from "react";

import {
  Banknote,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Save,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";

import WorkerLayout from "../../../layouts/WorkerLayout";

import CashSection from "../../../components/worker/CashSection";
import GCashSection from "../../../components/worker/GCashSection";
import MayaSection from "../../../components/worker/MayaSection";
import BankSection from "../../../components/worker/BankSection";

import { defaultPaymentForm } from "../../../types/paymentForm";
import type { PaymentForm } from "../../../types/paymentForm";

import {
  getWorkerPaymentInformation,
  saveWorkerPaymentInformation,
} from "../../../services/paymentInformationService";

import { supabase } from "../../../lib/supabase";

export default function PaymentInformation() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workerId, setWorkerId] = useState("");

  const [form, setForm] = useState<PaymentForm>(defaultPaymentForm);

  useEffect(() => {
    void loadPaymentInformation();
  }, []);

  async function loadPaymentInformation() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Worker account not found.");
      }

      setWorkerId(user.id);

      const data = await getWorkerPaymentInformation(user.id);

      if (!data) {
        return;
      }

      setForm({
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
        card_expiration: data.card_expiration || "",
        bank_qr: data.bank_qr || "",
      });
    } catch (error) {
      console.error("Payment information loading error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to load payment information.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange<K extends keyof PaymentForm>(
    field: K,
    value: PaymentForm[K],
  ) {
    setForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
  }

  function validateForm() {
    const enabledMethods = [
      form.accept_cash,
      form.enable_gcash,
      form.enable_maya,
      form.enable_bank,
    ];

    if (!enabledMethods.some(Boolean)) {
      return "Please enable at least one payment method.";
    }

    if (
      form.enable_gcash &&
      (!form.gcash_name.trim() || !form.gcash_number.trim())
    ) {
      return "Please complete the GCash account name and mobile number.";
    }

    if (
      form.enable_maya &&
      (!form.maya_name.trim() || !form.maya_number.trim())
    ) {
      return "Please complete the Maya account name and mobile number.";
    }

    if (
      form.enable_bank &&
      (!form.bank_name.trim() ||
        !form.account_name.trim() ||
        !form.account_number.trim() ||
        !form.card_expiration.trim())
    ) {
      return "Please complete the required bank and card information.";
    }
    return "";
  }

  async function handleSave() {
    const validationMessage = validateForm();

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    if (!workerId) {
      alert("Worker account is unavailable.");
      return;
    }

    try {
      setSaving(true);

      await saveWorkerPaymentInformation(workerId, form);

      alert("Payment information saved successfully.");
    } catch (error) {
      console.error("Payment information saving error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save payment information.",
      );
    } finally {
      setSaving(false);
    }
  }

  const activePaymentMethods = useMemo(() => {
    const methods = [];

    if (form.accept_cash) {
      methods.push("Cash");
    }

    if (form.enable_gcash) {
      methods.push("GCash");
    }

    if (form.enable_maya) {
      methods.push("Maya");
    }

    if (form.enable_bank) {
      methods.push("Bank Transfer");
    }

    return methods;
  }, [form.accept_cash, form.enable_gcash, form.enable_maya, form.enable_bank]);

  if (loading) {
    return (
      <WorkerLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <LoaderCircle size={30} className="animate-spin" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900">
              Loading payment information
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
              Please wait while we retrieve your saved payment methods.
            </p>
          </div>
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className="mx-auto w-full max-w-[1800px] px-6 py-6">
        {/* PAGE HEADER */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-8 text-white shadow-lg sm:px-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />

          <div className="absolute -bottom-20 right-28 h-40 w-40 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <WalletCards size={28} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                  Worker Settings
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                  Payment Information
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  Configure the payment options customers can use when paying
                  for your services.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                Active Payment Methods
              </p>

              <p className="mt-1 text-3xl font-bold">
                {activePaymentMethods.length}
              </p>

              <p className="mt-1 text-xs text-blue-100">
                {activePaymentMethods.length === 1
                  ? "method currently enabled"
                  : "methods currently enabled"}
              </p>
            </div>
          </div>
        </section>

        {/* INFORMATION NOTICE */}

        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2 className="font-bold text-blue-900">
                Keep your payment details accurate
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                Customers will see the payment information you provide when
                submitting payments. Review all account names, numbers, and QR
                codes before saving.
              </p>
            </div>
          </div>
        </section>

        {/* ACTIVE PAYMENT METHOD SUMMARY */}

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Available Payment Methods
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Enabled methods will be available to customers during payment.
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                activePaymentMethods.length > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {activePaymentMethods.length > 0 ? (
                <CheckCircle2 size={15} />
              ) : (
                <CreditCard size={15} />
              )}

              {activePaymentMethods.length > 0
                ? `${activePaymentMethods.length} enabled`
                : "No method enabled"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PaymentMethodStatus
              icon={Banknote}
              label="Cash"
              enabled={form.accept_cash}
            />

            <PaymentMethodStatus
              icon={Smartphone}
              label="GCash"
              enabled={form.enable_gcash}
            />

            <PaymentMethodStatus
              icon={Smartphone}
              label="Maya"
              enabled={form.enable_maya}
            />

            <PaymentMethodStatus
              icon={CreditCard}
              label="Bank Transfer"
              enabled={form.enable_bank}
            />
          </div>
        </section>

        {/* PAYMENT METHOD FORMS */}

        <div className="mt-6 space-y-6">
          <CashSection
            acceptCash={form.accept_cash}
            onChange={(value) => handleChange("accept_cash", value)}
          />

          <GCashSection
            values={{
              enable_gcash: form.enable_gcash,
              gcash_name: form.gcash_name,
              gcash_number: form.gcash_number,
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
              enable_maya: form.enable_maya,
              maya_name: form.maya_name,
              maya_number: form.maya_number,
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
              enable_bank: form.enable_bank,
              bank_name: form.bank_name,
              account_name: form.account_name,
              account_number: form.account_number,
              card_expiration: form.card_expiration,
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

        {/* SAVE SECTION */}

        <section className="sticky bottom-4 z-20 mt-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-gray-900">Save payment settings</p>

              <p className="mt-1 text-sm text-gray-500">
                Your changes will be visible to customers after saving.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !workerId}
              className="inline-flex min-w-52 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Payment Information
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </WorkerLayout>
  );
}

type PaymentMethodStatusProps = {
  icon: typeof CreditCard;
  label: string;
  enabled: boolean;
};

function PaymentMethodStatus({
  icon: Icon,
  label,
  enabled,
}: PaymentMethodStatusProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border p-4 transition ${
        enabled
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            enabled
              ? "bg-emerald-100 text-emerald-600"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          <Icon size={19} />
        </div>

        <div>
          <p className="text-sm font-bold text-gray-900">{label}</p>

          <p
            className={`text-xs font-semibold ${
              enabled ? "text-emerald-600" : "text-gray-400"
            }`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>

      <span
        className={`h-2.5 w-2.5 rounded-full ${
          enabled ? "bg-emerald-500" : "bg-gray-300"
        }`}
      />
    </div>
  );
}
