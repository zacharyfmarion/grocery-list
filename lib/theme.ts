import { MMKV } from "react-native-mmkv";

// ---------- storage ----------
const storage = new MMKV({ id: "theme" });

export type ColorMode = "light" | "dark" | "system";
export type AccentName =
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "pink"
  | "teal"
  | "red"
  | "amber";

const COLOR_MODE_KEY = "colorMode";
const ACCENT_KEY = "accentColor";

export function getStoredColorMode(): ColorMode {
  return (storage.getString(COLOR_MODE_KEY) as ColorMode) ?? "system";
}
export function setStoredColorMode(mode: ColorMode) {
  storage.set(COLOR_MODE_KEY, mode);
}

export function getStoredAccent(): AccentName {
  return (storage.getString(ACCENT_KEY) as AccentName) ?? "green";
}
export function setStoredAccent(accent: AccentName) {
  storage.set(ACCENT_KEY, accent);
}

// ---------- accent palettes ----------
// Each accent maps to its Tailwind CSS color scale (50–900).
// We only expose the tokens the app actually uses.

export interface AccentPalette {
  50: string;
  100: string;
  500: string;
  600: string;
  700: string;
}

export const ACCENT_PALETTES: Record<AccentName, AccentPalette> = {
  green: { 50: "#f0fdf4", 100: "#dcfce7", 500: "#22c55e", 600: "#16a34a", 700: "#15803d" },
  blue: { 50: "#eff6ff", 100: "#dbeafe", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
  purple: { 50: "#faf5ff", 100: "#f3e8ff", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce" },
  orange: { 50: "#fff7ed", 100: "#ffedd5", 500: "#f97316", 600: "#ea580c", 700: "#c2410c" },
  pink: { 50: "#fdf2f8", 100: "#fce7f3", 500: "#ec4899", 600: "#db2777", 700: "#be185d" },
  teal: { 50: "#f0fdfa", 100: "#ccfbf1", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e" },
  red: { 50: "#fef2f2", 100: "#fee2e2", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c" },
  amber: { 50: "#fffbeb", 100: "#fef3c7", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
};

export const ACCENT_OPTIONS: { name: AccentName; label: string }[] = [
  { name: "green", label: "Green" },
  { name: "blue", label: "Blue" },
  { name: "purple", label: "Purple" },
  { name: "orange", label: "Orange" },
  { name: "pink", label: "Pink" },
  { name: "teal", label: "Teal" },
  { name: "red", label: "Red" },
  { name: "amber", label: "Amber" },
];
