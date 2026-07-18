import { useEffect, useState } from "react";

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

  const [form, setForm] =
    useState<PaymentForm>(defaultPaymentForm);

  useEffect(() => {
    loadPaymentInformation();
  }, []);

  async function loadPaymentInformation() {
    try {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setWorkerId(user.id);

      const data =
        await getWorkerPaymentInformation(user.id);

      if (data) {

        setForm({
          accept_cash: data.accept_cash,

          enable_gcash: data.enable_gcash,
          gcash_name: data.gcash_name || "",
          gcash_number: data.gcash_number || "",
          gcash_qr: data.gcash_qr || "",

          enable_maya: data.enable_maya,
          maya_name: data.maya_name || "",
          maya_number: data.maya_number || "",
          maya_qr: data.maya_qr || "",

          enable_bank: data.enable_bank,
          bank_name: data.bank_name || "",
          account_name: data.account_name || "",
          account_number: data.account_number || "",
          bank_qr: data.bank_qr || "",
        });

      }

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  }

  function handleChange(
    field: keyof PaymentForm,
    value: any
  ) {

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

  }

  async function handleSave() {

    try {

      setSaving(true);

      await saveWorkerPaymentInformation(
        workerId,
        form
      );

      alert("Payment information saved successfully.");

    } catch (err) {

      console.error(err);

      alert("Unable to save payment information.");

    } finally {

      setSaving(false);

    }

  }

  if (loading) {

    return (
      <WorkerLayout>
        <div className="p-10 text-center">
          Loading...
        </div>
      </WorkerLayout>
    );

  }  return (
    <WorkerLayout>

      <div className="max-w-5xl mx-auto">

        <div className="bg-white rounded-2xl shadow p-8 mb-6">

          <h1 className="text-3xl font-bold">
            Payment Information
          </h1>

          <p className="text-gray-500 mt-2">
            Configure the payment methods that customers can use when paying
            for your services.
          </p>

        </div>

        <CashSection
          acceptCash={form.accept_cash}
          onChange={(value) =>
            handleChange("accept_cash", value)
          }
        />

        <GCashSection
          values={{
            enable_gcash: form.enable_gcash,
            gcash_name: form.gcash_name,
            gcash_number: form.gcash_number,
            gcash_qr: form.gcash_qr,
          }}
          onChange={(field, value) =>
            handleChange(field as keyof PaymentForm, value)
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
            handleChange(field as keyof PaymentForm, value)
          }
        />

        <BankSection
          values={{
            enable_bank: form.enable_bank,
            bank_name: form.bank_name,
            account_name: form.account_name,
            account_number: form.account_number,
            bank_qr: form.bank_qr,
          }}
          onChange={(field, value) =>
            handleChange(field as keyof PaymentForm, value)
          }
        />

        <div className="mt-8 flex justify-end">

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-xl font-semibold transition"
          >
            {saving ? "Saving..." : "Save Payment Information"}
          </button>

        </div>

      </div>

    </WorkerLayout>
  );
}