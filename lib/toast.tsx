import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { Toaster, toast } from "sonner-native";
import { useTheme } from "@/lib/theme-context";

interface UndoToastOptions {
  message: string;
  actionLabel?: string;
  onUndo: () => void;
  durationMs?: number;
}

let currentToastTheme: {
  isDark: boolean;
  accent500: string;
} = {
  isDark: false,
  accent500: "#22c55e",
};

const FAB_CLEARANCE_WIDTH = 88;
const TOAST_SIDE_PADDING = 12;

function AppToastWrapper({
  children,
}: {
  children: React.ReactNode;
  toastId: string | number;
}) {
  return (
    <View pointerEvents="box-none" className="w-full">
      {children}
    </View>
  );
}

export function AppToaster() {
  const { accent, isDark } = useTheme();
  currentToastTheme = {
    isDark,
    accent500: accent[500],
  };

  return (
    <Toaster
      theme={isDark ? "dark" : "light"}
      position="bottom-center"
      offset={12}
      visibleToasts={1}
      ToastWrapper={AppToastWrapper}
      toastOptions={{
        toastContainerStyle: {
          alignSelf: "flex-start",
          width: "auto",
          maxWidth: "100%",
        },
        style: {
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 16,
          marginHorizontal: 12,
        },
        titleStyle: {
          fontSize: 14,
          lineHeight: 18,
          fontWeight: "600",
        },
        buttonsStyle: {
          marginLeft: 12,
        },
        actionButtonStyle: {
          backgroundColor: accent[500],
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
        },
        actionButtonTextStyle: {
          color: "#ffffff",
          fontWeight: "600",
          fontSize: 13,
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
  const id = `undo-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const screenWidth = Dimensions.get("window").width;
  const backgroundColor = currentToastTheme.isDark ? "#111827" : "#111827";
  const borderColor = currentToastTheme.isDark ? "#1f2937" : "#0f172a";
  const textColor = "#f9fafb";
  const toastWidth = Math.max(220, screenWidth - FAB_CLEARANCE_WIDTH - TOAST_SIDE_PADDING * 2);

  toast.custom(
    <View
      style={{
        width: toastWidth,
        marginLeft: TOAST_SIDE_PADDING,
        backgroundColor,
        borderColor,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text
          numberOfLines={1}
          style={{
            color: textColor,
            fontSize: 14,
            fontWeight: "600",
            flex: 1,
          }}
        >
          {message}
        </Text>
        <TouchableOpacity
          onPress={() => {
            onUndo();
          }}
          activeOpacity={0.85}
          style={{
            backgroundColor: currentToastTheme.accent500,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>,
    {
      id,
      duration: durationMs,
    },
  );

  return id;
}

export function dismissToast(id?: string | number) {
  return toast.dismiss(id);
}
