import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { AppButton } from "@/components/ui/AppButton";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { usePreferences } from "@/hooks/usePreferences";
import { useTheme } from "@/lib/theme-context";
import {
  ACCENT_OPTIONS,
  type AccentName,
  type ColorMode,
} from "@/lib/theme";

const SORT_OPTIONS = [
  { value: "manual", label: "Manual", icon: "hand-left" },
  { value: "alphabetical", label: "Alphabetical", icon: "list" },
  { value: "category", label: "By Category", icon: "grid" },
] as const;

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; icon: string }[] =
  [
    { value: "light", label: "Light", icon: "sunny" },
    { value: "dark", label: "Dark", icon: "moon" },
    { value: "system", label: "System", icon: "phone-portrait" },
  ];

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { preferences, loading, updatePreferences } = usePreferences();
  const { colorMode, setColorMode, isDark, accent, accentName, setAccentName } =
    useTheme();
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");

  useEffect(() => {
    if (!isEditingName) {
      setDisplayName(user?.displayName || "");
    }
  }, [user?.displayName, isEditingName]);

  const appVersion = useMemo(
    () => Constants.expoConfig?.version ?? "1.0.0",
    [],
  );

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const handleNameSave = async () => {
    setIsEditingName(false);
    if (!user) return;

    const trimmed = displayName.trim();
    if (!trimmed || trimmed === user.displayName) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: trimmed,
      });
    } catch {
      Alert.alert("Update Failed", "Unable to update your display name.");
    }
  };

  const handleSortChange = (value: SortValue) => {
    updatePreferences({ sortOrder: value });
  };

  // Shared colors for inline styles
  const sectionLabelColor = isDark ? "#9ca3af" : "#9ca3af";
  const chevronColor = isDark ? "#6b7280" : "#d1d5db";
  const iconSecondaryColor = isDark ? "#9ca3af" : "#6b7280";
  const headerIconColor = isDark ? "#f3f4f6" : "#111827";
  const placeholderColor = isDark ? "#6b7280" : "#9ca3af";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      {/* Header */}
      <View className="px-4 pt-3 pb-2 bg-white dark:bg-gray-900">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={headerIconColor}
            />
            <Text className="text-base text-gray-900 dark:text-gray-50 ml-0.5">
              My Lists
            </Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Settings
          </Text>
          <View className="w-[80px]" />
        </View>
      </View>
      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentContainerClassName="px-6 py-6"
      >
        {/* ── Account ── */}
        <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          Account
        </Text>
        <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsEditingName(true)}
            disabled={!user}
            className="flex-row items-center px-4 py-4"
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: accent[50] }}
            >
              <Ionicons name="person" size={18} color={accent[600]} />
            </View>
            <Text className="flex-1 text-base text-gray-900 dark:text-gray-50">
              Display Name
            </Text>
            {isEditingName ? (
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
                onBlur={handleNameSave}
                returnKeyType="done"
                className="min-w-[120px] text-right text-base text-gray-900 dark:text-gray-50"
                placeholder="Your name"
                placeholderTextColor={placeholderColor}
              />
            ) : (
              <View className="flex-row items-center">
                <Text className="text-gray-500 dark:text-gray-400">
                  {displayName || "User"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={chevronColor}
                />
              </View>
            )}
          </TouchableOpacity>
          <View className="h-px bg-gray-100 dark:bg-gray-800" />
          <View className="flex-row items-center px-4 py-4">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: accent[50] }}
            >
              <Ionicons name="mail" size={18} color={accent[600]} />
            </View>
            <Text className="flex-1 text-base text-gray-900 dark:text-gray-50">
              Email
            </Text>
            <Text className="text-gray-500 dark:text-gray-400">
              {user?.email || "—"}
            </Text>
          </View>
        </View>
        <AppButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          className="mt-4"
        />

        {/* ── Appearance ── */}
        <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-8 mb-2">
          Appearance
        </Text>
        <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Color mode */}
          <View className="px-4 pt-4">
            <View className="flex-row items-center mb-3">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: accent[50] }}
              >
                <Ionicons name="contrast" size={18} color={accent[600]} />
              </View>
              <Text className="text-base text-gray-900 dark:text-gray-50">
                Color Mode
              </Text>
            </View>
            <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {COLOR_MODE_OPTIONS.map((option) => {
                const isActive = colorMode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.8}
                    onPress={() => setColorMode(option.value)}
                    className={`flex-1 py-2 rounded-lg items-center justify-center ${
                      isActive ? "bg-white dark:bg-gray-700" : ""
                    }`}
                    style={
                      isActive
                        ? {
                            shadowColor: "#000",
                            shadowOpacity: 0.06,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 1 },
                          }
                        : undefined
                    }
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={option.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={
                          isActive
                            ? accent[600]
                            : iconSecondaryColor
                        }
                      />
                      <Text
                        className={`text-xs font-semibold ml-1 ${
                          isActive
                            ? "text-gray-900 dark:text-gray-50"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View className="h-px bg-gray-100 dark:bg-gray-800 mt-4" />
          {/* Accent color */}
          <View className="px-4 py-4">
            <View className="flex-row items-center mb-3">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: accent[50] }}
              >
                <Ionicons name="color-palette" size={18} color={accent[600]} />
              </View>
              <Text className="text-base text-gray-900 dark:text-gray-50">
                Accent Color
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {ACCENT_OPTIONS.map((option) => {
                const palette =
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  require("@/lib/theme").ACCENT_PALETTES[
                    option.name as AccentName
                  ] as { 500: string; 600: string };
                const isSelected = accentName === option.name;
                return (
                  <TouchableOpacity
                    key={option.name}
                    activeOpacity={0.7}
                    onPress={() => setAccentName(option.name)}
                    className="items-center"
                    style={{ width: 56 }}
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        isSelected
                          ? "border-2"
                          : "border border-gray-200 dark:border-gray-700"
                      }`}
                      style={[
                        { backgroundColor: palette[500] },
                        isSelected && { borderColor: palette[600] },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </View>
                    <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Preferences ── */}
        <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-8 mb-2">
          Preferences
        </Text>
        <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <View className="px-4 pt-4">
            <View className="flex-row items-center mb-3">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: accent[50] }}
              >
                <Ionicons
                  name="swap-vertical"
                  size={18}
                  color={accent[600]}
                />
              </View>
              <Text className="text-base text-gray-900 dark:text-gray-50">
                Default Sort Order
              </Text>
            </View>
            <View
              className={`flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 ${loading ? "opacity-50" : ""}`}
            >
              {SORT_OPTIONS.map((option) => {
                const isActive = preferences.sortOrder === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.8}
                    disabled={loading}
                    onPress={() => handleSortChange(option.value)}
                    className={`flex-1 py-2 rounded-lg items-center justify-center`}
                    style={
                      isActive
                        ? { backgroundColor: accent[600] }
                        : undefined
                    }
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={option.icon}
                        size={14}
                        color={isActive ? "#fff" : iconSecondaryColor}
                      />
                      <Text
                        className={`text-xs font-semibold ml-1 ${
                          isActive
                            ? "text-white"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View className="h-px bg-gray-100 dark:bg-gray-800 mt-4" />
          <View className="flex-row items-center px-4 py-4">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: accent[50] }}
            >
              <Ionicons name="sparkles" size={18} color={accent[600]} />
            </View>
            <Text className="flex-1 text-base text-gray-900 dark:text-gray-50">
              Haptic Feedback
            </Text>
            <Switch
              value={preferences.hapticsEnabled}
              onValueChange={(value) =>
                updatePreferences({ hapticsEnabled: value })
              }
              disabled={loading}
              trackColor={{
                false: isDark ? "#374151" : "#e5e7eb",
                true: accent[600],
              }}
              thumbColor={
                preferences.hapticsEnabled
                  ? "#f8fafc"
                  : isDark
                    ? "#9ca3af"
                    : "#f9fafb"
              }
            />
          </View>
        </View>

        {/* ── About ── */}
        <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-8 mb-2">
          About
        </Text>
        <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <View className="flex-row items-center px-4 py-4">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: accent[50] }}
            >
              <Ionicons
                name="information-circle"
                size={18}
                color={accent[600]}
              />
            </View>
            <Text className="flex-1 text-base text-gray-900 dark:text-gray-50">
              Version
            </Text>
            <Text className="text-gray-500 dark:text-gray-400">
              {appVersion}
            </Text>
          </View>
          <View className="h-px bg-gray-100 dark:bg-gray-800" />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL("mailto:feedback@example.com")}
            className="flex-row items-center px-4 py-4"
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: accent[50] }}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={accent[600]}
              />
            </View>
            <Text className="flex-1 text-base text-gray-900 dark:text-gray-50">
              Send Feedback
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={chevronColor}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
