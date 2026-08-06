import { Toaster } from "sonner";
import { useTheme } from "../../context/ThemeContextValue";

export default function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme}
      richColors
      closeButton
      duration={4000}
      expand={false}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border-slate-200 !shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:!border-slate-700",
          title: "!font-bold",
          description: "!text-slate-600 dark:!text-slate-300",
          actionButton: "!rounded-lg",
          cancelButton: "!rounded-lg",
          closeButton: "!border-slate-200 dark:!border-slate-700",
        },
      }}
    />
  );
}
