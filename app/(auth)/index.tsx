import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { loginSchema, type LoginFormData, mapFirebaseAuthError } from "@/lib/schemas";
import { FormInput } from "@/components/FormInput";
import { AppButton } from "@/components/ui/AppButton";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { accent } = useTheme();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data.email.trim(), data.password);
    } catch (error: any) {
      const mapped = mapFirebaseAuthError(error.code);
      const field = (mapped.field ?? "root") as "email" | "password" | "root";
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
              Grocery List
            </Text>
            <Text className="text-lg text-gray-500 dark:text-gray-400">
              Sign in to your shared lists
            </Text>
          </View>

          <View className="gap-4">
            <FormInput
              control={control}
              name="email"
              testID="login-email"
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <FormInput
              control={control}
              name="password"
              testID="login-password"
              placeholder="Password"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />

            {errors.root && (
              <Text className="text-red-500 text-sm text-center">
                {errors.root.message}
              </Text>
            )}

            <AppButton
              testID="login-submit"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              loading={isSubmitting}
              title="Sign In"
              className="mt-2"
            />
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500 dark:text-gray-400">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity testID="login-goto-register">
                <Text
                  className="font-semibold"
                  style={{ color: accent[600] }}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
