import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { AppButton } from "@/components/ui/AppButton";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useTheme } from "@/lib/theme-context";
import { ACCENT_OPTIONS, ACCENT_PALETTES, type AccentName, type ColorMode } from "@/lib/theme";

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "sunny" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "phone-portrait" },
];

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Text className="mb-2 mt-8 px-1 text-xs font-semibold uppercase tracking-[2px] text-gray-400 dark:text-gray-500">
      {title}
    </Text>
  );
}

interface SettingsCardProps {
  children: React.ReactNode;
}

function SettingsCard({ children }: SettingsCardProps) {
  return (
    <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {children}
    </View>
  );
}

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  accentBackground: string;
  accentColor: string;
  isLast?: boolean;
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  rightContent,
  accentBackground,
  accentColor,
  isLast = false,
}: SettingsRowProps) {
  const content = (
    <View
      className={`flex-row items-center px-4 py-4 ${!isLast ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: accentBackground }}
      >
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>
      <View className="flex-1 pr-3">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-50">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</Text>
        ) : null}
      </View>
      {rightContent}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable android_ripple={{ color: "#00000010" }} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { preferences, loading, updatePreferences } = usePreferences();
  const { colorMode, setColorMode, isDark, accent, accentName, setAccentName } = useTheme();
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");

  useEffect(() => {
    if (!isEditingName) {
      setDisplayName(user?.displayName || "");
    }
  }, [isEditingName, user?.displayName]);

  const appVersion = useMemo(() => Constants.expoConfig?.version ?? "1.0.0", []);

  const chevronColor = isDark ? "#6b7280" : "#9ca3af";
  const placeholderColor = isDark ? "#6b7280" : "#9ca3af";
  const segmentedBackground = isDark ? "#1f2937" : "#f3f4f6";

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
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

  const handleFeedback = async () => {
    const url = "mailto:zacharyfmarion@gmail.com?subject=Cartful%20Feedback";

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to Open Mail", "Please email zacharyfmarion@gmail.com.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Account" />
        <SettingsCard>
          <SettingsRow
            icon="person"
            title="Display Name"
            accentBackground={accent[50]}
            accentColor={accent[600]}
            rightContent={
              isEditingName ? (
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoFocus
                  onBlur={handleNameSave}
                  onSubmitEditing={handleNameSave}
                  returnKeyType="done"
                  className="min-w-[120px] text-right text-base text-gray-900 dark:text-gray-50"
                  placeholder="Your name"
                  placeholderTextColor={placeholderColor}
                />
              ) : (
                <View className="flex-row items-center">
                  <Text className="mr-1 text-sm text-gray-500 dark:text-gray-400">
                    {displayName || "User"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                </View>
              )
            }
            onPress={user ? () => setIsEditingName(true) : undefined}
          />
          <SettingsRow
            icon="mail"
            title="Email"
            subtitle={user?.email || "No email available"}
            accentBackground={accent[50]}
            accentColor={accent[600]}
            isLast
          />
        </SettingsCard>

        <SectionHeader title="Appearance" />
        <SettingsCard>
          <View className="border-b border-gray-100 px-4 py-4 dark:border-gray-800">
            <View className="mb-3 flex-row items-center">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: accent[50] }}
              >
                <Ionicons name="contrast" size={18} color={accent[600]} />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-gray-50">
                  Color Mode
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Match the app to your light or dark preference.
                </Text>
              </View>
            </View>
            <View
              className="flex-row rounded-2xl p-1"
              style={{ backgroundColor: segmentedBackground }}
            >
              {COLOR_MODE_OPTIONS.map((option) => {
                const isActive = colorMode === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setColorMode(option.value)}
                    className="flex-1 items-center rounded-xl py-2.5"
                    style={isActive ? { backgroundColor: accent[600] } : undefined}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={option.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={isActive ? "#ffffff" : chevronColor}
                      />
                      <Text
                        className={`ml-1 text-xs font-semibold ${
                          isActive ? "text-white" : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View className="px-4 py-4">
            <View className="mb-3 flex-row items-center">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: accent[50] }}
              >
                <Ionicons name="color-palette" size={18} color={accent[600]} />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-gray-50">
                  Accent Color
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Choose the color used for actions and highlights.
                </Text>
              </View>
            </View>
            <View className="-mx-1 flex-row flex-wrap">
              {ACCENT_OPTIONS.map((option) => {
                const palette = ACCENT_PALETTES[option.name as AccentName] as {
                  500: string;
                  600: string;
                };
                const isSelected = accentName === option.name;

                return (
                  <Pressable
                    key={option.name}
                    onPress={() => setAccentName(option.name)}
                    className="mb-2 w-1/4 px-1"
                  >
                    <View
                      className={`items-center rounded-2xl px-2 py-3 ${
                        isSelected
                          ? "border"
                          : "border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40"
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: palette[600],
                              backgroundColor: isDark ? "#111827" : accent[50],
                            }
                          : undefined
                      }
                    >
                      <View
                        className={`h-11 w-11 items-center justify-center rounded-full ${
                          isSelected ? "border-2" : "border border-gray-200 dark:border-gray-700"
                        }`}
                        style={[
                          { backgroundColor: palette[500] },
                          isSelected ? { borderColor: palette[600] } : undefined,
                        ]}
                      >
                        {isSelected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                      </View>
                      <Text
                        className={`mt-2 text-center text-xs font-medium ${
                          isSelected
                            ? isDark
                              ? "text-gray-50"
                              : "text-gray-900"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SettingsCard>

        <SectionHeader title="Preferences" />
        <SettingsCard>
          <SettingsRow
            icon="grid"
            title="Categories"
            subtitle="Show, hide, and reorder how categories appear in your lists."
            accentBackground={accent[50]}
            accentColor={accent[600]}
            rightContent={<Ionicons name="chevron-forward" size={18} color={chevronColor} />}
            onPress={() => router.push("/settings/categories")}
          />
          <SettingsRow
            icon="sparkles"
            title="Haptic Feedback"
            subtitle="Use subtle vibrations for taps and completed actions."
            accentBackground={accent[50]}
            accentColor={accent[600]}
            rightContent={
              <Switch
                value={preferences.hapticsEnabled}
                onValueChange={(value) => updatePreferences({ hapticsEnabled: value })}
                disabled={loading}
                trackColor={{
                  false: isDark ? "#374151" : "#e5e7eb",
                  true: accent[600],
                }}
                thumbColor={preferences.hapticsEnabled ? "#f8fafc" : isDark ? "#9ca3af" : "#f9fafb"}
              />
            }
            isLast
          />
        </SettingsCard>

        <SectionHeader title="About" />
        <SettingsCard>
          <SettingsRow
            icon="information-circle"
            title="Version"
            subtitle={appVersion}
            accentBackground={accent[50]}
            accentColor={accent[600]}
          />
          <SettingsRow
            icon="chatbubble-ellipses"
            title="Send Feedback"
            subtitle="Email bug reports, ideas, or anything that feels rough."
            accentBackground={accent[50]}
            accentColor={accent[600]}
            rightContent={<Ionicons name="chevron-forward" size={18} color={chevronColor} />}
            onPress={handleFeedback}
            isLast
          />
        </SettingsCard>

        <AppButton title="Sign Out" onPress={handleSignOut} variant="danger" className="mt-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
