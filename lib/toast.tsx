import { Toaster, toast } from "sonner-native";
import { useTheme } from "@/lib/theme-context";

interface UndoToastOptions {
  message: string;
  actionLabel?: string;
  onUndo: () => void;
  durationMs?: number;
}

export function AppToaster() {
  const { accent, isDark } = useTheme();

  return (
    <Toaster
      theme={isDark ? "dark" : "light"}
      position="top-center"
      richColors
      offset={16}
      closeButton
      toastOptions={{
        actionButtonStyle: {
          backgroundColor: accent[500],
        },
        actionButtonTextStyle: {
          color: "#ffffff",
          fontWeight: "600",
        },
      }}
    />
  );
}

export function showSuccessToast(message: string) {
  return toast.success(message);
}

export function showErrorToast(message: string) {
  return toast.error(message);
}

export function showInfoToast(message: string) {
  return toast.info(message);
}

export function showUndoToast({
  message,
  actionLabel = "Undo",
  onUndo,
  durationMs = 4000,
}: UndoToastOptions) {
  return toast(message, {
    duration: durationMs,
    action: {
      label: actionLabel,
      onClick: onUndo,
    },
  });
}

export function dismissToast(id?: string | number) {
  return toast.dismiss(id);
}
