import {
  BellRing,
  CalendarClock,
  Check,
  CreditCard,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Star,
  type LucideIcon,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { useLanguage } from "../../../context/LanguageContext";
import { supabase } from "../../../lib/supabase";
import {
  getNotificationPreference,
  saveNotificationPreference,
} from "../../../services/notificationPreferenceService";

interface PreferenceSettings {
  booking_updates: boolean;
  chat_notifications: boolean;
  payment_notifications: boolean;
  review_reminders: boolean;
}

interface PreferenceOption {
  key: keyof PreferenceSettings;
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName: string;
}

const DEFAULT_SETTINGS: PreferenceSettings = {
  booking_updates: true,
  chat_notifications: true,
  payment_notifications: true,
  review_reminders: true,
};

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

export default function NotificationPreferences() {
  const { language } = useLanguage();

  const [settings, setSettings] =
    useState<PreferenceSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] =
    useState<PreferenceSettings>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFilipino = language === "fil";

  const options = useMemo<PreferenceOption[]>(
    () => [
      {
        key: "booking_updates",
        icon: CalendarClock,
        title: isFilipino
          ? "Mga update sa booking"
          : "Booking updates",
        description: isFilipino
          ? "Tumanggap ng alert kapag may pagbabago sa status, iskedyul, o worker ng booking."
          : "Receive alerts when a booking status, schedule, or assigned worker changes.",
        iconClassName:
          "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
      },
      {
        key: "chat_notifications",
        icon: MessageCircle,
        title: isFilipino
          ? "Mga notification sa chat"
          : "Chat notifications",
        description: isFilipino
          ? "Maabisuhan kapag may bagong mensahe mula sa worker."
          : "Get notified when a worker sends you a new message.",
        iconClassName:
          "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
      },
      {
        key: "payment_notifications",
        icon: CreditCard,
        title: isFilipino
          ? "Mga notification sa bayad"
          : "Payment notifications",
        description: isFilipino
          ? "Tumanggap ng update tungkol sa payment request, verification, at status."
          : "Receive updates about payment requests, verification, and status.",
        iconClassName:
          "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
      {
        key: "review_reminders",
        icon: Star,
        title: isFilipino
          ? "Paalala sa review"
          : "Review reminders",
        description: isFilipino
          ? "Maabisuhan kapag maaari ka nang magbigay ng rating at review."
          : "Get reminded when a completed service is ready for your rating and review.",
        iconClassName:
          "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
      },
    ],
    [isFilipino],
  );

  const hasChanges = useMemo(
    () =>
      Object.keys(settings).some((key) => {
        const typedKey = key as keyof PreferenceSettings;
        return settings[typedKey] !== savedSettings[typedKey];
      }),
    [savedSettings, settings],
  );

  const enabledCount = useMemo(
    () => Object.values(settings).filter(Boolean).length,
    [settings],
  );

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          isFilipino
            ? "Nag-expire na ang iyong session. Mag-login muli."
            : "Your session has expired. Please sign in again.",
        );
      }

      const data = await getNotificationPreference(user.id);

      const nextSettings: PreferenceSettings = data
        ? {
            booking_updates: data.booking_updates,
            chat_notifications: data.chat_notifications,
            payment_notifications: data.payment_notifications,
            review_reminders: data.review_reminders,
          }
        : DEFAULT_SETTINGS;

      setSettings(nextSettings);
      setSavedSettings(nextSettings);
    } catch (caughtError) {
      console.error(
        "Load notification preferences error:",
        caughtError,
      );

      const message = getErrorMessage(
        caughtError,
        isFilipino
          ? "Hindi ma-load ang notification preferences."
          : "Unable to load notification preferences.",
      );

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isFilipino]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  function togglePreference(key: keyof PreferenceSettings) {
    if (loading || saving) {
      return;
    }

    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function handleSave() {
    if (saving || loading || !hasChanges) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          isFilipino
            ? "Nag-expire na ang iyong session. Mag-login muli."
            : "Your session has expired. Please sign in again.",
        );
      }

      const saved = await saveNotificationPreference(
        user.id,
        settings,
      );

      const nextSavedSettings: PreferenceSettings = {
        booking_updates: saved.booking_updates,
        chat_notifications: saved.chat_notifications,
        payment_notifications: saved.payment_notifications,
        review_reminders: saved.review_reminders,
      };

      setSettings(nextSavedSettings);
      setSavedSettings(nextSavedSettings);

      toast.success(
        isFilipino
          ? "Na-update na ang notification preferences."
          : "Notification preferences updated.",
      );
    } catch (caughtError) {
      console.error(
        "Save notification preferences error:",
        caughtError,
      );

      const message = getErrorMessage(
        caughtError,
        isFilipino
          ? "Hindi ma-save ang notification preferences."
          : "Unable to save notification preferences.",
      );

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (loading || saving || !hasChanges) {
      return;
    }

    setSettings(savedSettings);

    toast.info(
      isFilipino
        ? "Ibinalik ang huling naka-save na settings."
        : "Restored the last saved settings.",
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <LoaderCircle className="animate-spin" size={20} />
          {isFilipino
            ? "Nilo-load ang notification settings..."
            : "Loading notification settings..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <BellRing size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {isFilipino
                ? `${enabledCount} sa 4 na notification ang naka-enable`
                : `${enabledCount} of 4 notifications enabled`}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {isFilipino
                ? "Maaari mong baguhin ang mga ito anumang oras."
                : "You can change these preferences at any time."}
            </p>
          </div>
        </div>

        {hasChanges && (
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {isFilipino
              ? "May hindi pa naka-save"
              : "Unsaved changes"}
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {options.map((option) => {
          const Icon = option.icon;
          const enabled = settings[option.key];

          return (
            <button
              key={option.key}
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={saving}
              onClick={() => togglePreference(option.key)}
              className="flex w-full items-center gap-4 bg-white px-4 py-4 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 dark:bg-slate-900 dark:hover:bg-slate-800/70"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${option.iconClassName}`}
              >
                <Icon size={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {option.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {option.description}
                </span>
              </span>

              <span
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  enabled
                    ? "bg-blue-600"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                    enabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                >
                  {enabled && (
                    <Check
                      size={12}
                      className="text-blue-600"
                    />
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges || saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw size={17} />
          {isFilipino ? "Ibalik" : "Reset"}
        </button>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!hasChanges || saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
        >
          {saving ? (
            <>
              <LoaderCircle
                className="animate-spin"
                size={17}
              />
              {isFilipino ? "Sine-save..." : "Saving..."}
            </>
          ) : (
            <>
              <Check size={17} />
              {isFilipino
                ? "I-save ang preferences"
                : "Save preferences"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}