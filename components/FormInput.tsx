import { View, Text, type TextInputProps } from "react-native";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { AppTextInput } from "./ui/AppTextInput";

interface FormInputProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  hint?: string;
  testID?: string;
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  testID,
  ...textInputProps
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View className="mb-4">
          <AppTextInput
            label={label}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={error?.message}
            testID={testID ?? `input-${String(name)}`}
            {...textInputProps}
          />
          {hint && !error && (
            <Text className="text-xs text-gray-500 mt-1">{hint}</Text>
          )}
        </View>
      )}
    />
  );
}
