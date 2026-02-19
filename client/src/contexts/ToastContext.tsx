import { Toaster, toast } from "sonner";
import { useTheme } from "./ThemeContext";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Thin wrapper around Sonner's <Toaster> that syncs with our ThemeContext.
 * Keeps the same `<ToastProvider>` API so App.tsx doesn't need to change.
 */

export function ToastProvider({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();

  return (
    <>
      {children}
      <Toaster
        theme={resolved}
        position="top-center"
        richColors
        closeButton
        gap={8}
        toastOptions={{
          className: "!rounded-lg !border !shadow-lg !text-sm",
          style: {
            fontFamily: "var(--font-sans)",
          },
        }}
        icons={{
          success: <CheckCircle2 size={16} strokeWidth={2} />,
          error: <AlertCircle size={16} strokeWidth={2} />,
          info: <Info size={16} strokeWidth={2} />,
        }}
      />
    </>
  );
}

// Re-export toast for direct import convenience
export { toast };
