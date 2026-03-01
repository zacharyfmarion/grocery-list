import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  registerSchema,
  type RegisterFormData,
  mapFirebaseAuthError,
} from "@/lib/schemas";
import { FormInput } from "@/components/FormInput";
import { AppButton } from "@/components/ui/AppButton";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { accent } = useTheme();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await signUp(data.email.trim(), data.password, data.displayName.trim());
      // Auth state change will redirect automatically
    } catch (error: any) {
      const mapped = mapFirebaseAuthError(error.code);
      const field = (mapped.field ?? "root") as "email" | "password" | "displayName" | "root";
      setError(field, { message: mapped.message });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <View className="mb-12">
            <Text className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">
              Create Account
            </Text>
            <Text className="text-lg text-gray-500 dark:text-gray-400">
              Start sharing grocery lists
            </Text>
          </View>

          <View className="gap-4">
            <FormInput
              control={control}
              name="displayName"
              testID="register-name"
              placeholder="Display name"
              hint="This is how your partner will see you"
              autoComplete="name"
              textContentType="name"
            />

            <FormInput
              control={control}
              name="email"
              testID="register-email"
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <FormInput
              control={control}
              name="password"
              testID="register-password"
              placeholder="Password"
              hint="Must be at least 6 characters"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />

            {errors.root && (
              <Text className="text-red-500 text-sm text-center">
                {errors.root.message}
              </Text>
            )}

            <AppButton
              testID="register-submit"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              loading={isSubmitting}
              title="Create Account"
              className="mt-2"
            />
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500 dark:text-gray-400">Already have an account? </Text>
            <TouchableOpacity testID="register-goto-login" onPress={() => router.back()}>
              <Text className="font-semibold" style={{ color: accent[600] }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
