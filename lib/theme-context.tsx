import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useNWColorScheme } from "nativewind";
import {
  type AccentName,
  type AccentPalette,
  type ColorMode,
  ACCENT_PALETTES,
  getStoredAccent,
  getStoredColorMode,
  setStoredAccent,
  setStoredColorMode,
} from "./theme";

interface ThemeContextValue {
  /** The user-chosen mode (light / dark / system) */
  colorMode: ColorMode;
  /** Set the color mode and persist to MMKV */
  setColorMode: (mode: ColorMode) => void;
  /** Whether the effective scheme is dark right now */
  isDark: boolean;
  /** Current accent color name */
  accentName: AccentName;
  /** Set accent and persist to MMKV */
  setAccentName: (name: AccentName) => void;
  /** Resolved accent palette for the current accent */
  accent: AccentPalette;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useNWColorScheme();

  const [colorMode, setColorModeState] = useState<ColorMode>(
    getStoredColorMode,
  );
  const [accentName, setAccentNameState] = useState<AccentName>(
    getStoredAccent,
  );

  // Sync NativeWind whenever the user's choice changes.
  useEffect(() => {
    // NativeWind's setColorScheme doesn't accept "system" on Android —
    // only pass "light" or "dark".
    if (colorMode === "light" || colorMode === "dark") {
      setColorScheme(colorMode);
    }
  }, [colorMode, setColorScheme]);

  const handleSetColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    setStoredColorMode(mode);
  }, []);

  const handleSetAccent = useCallback((name: AccentName) => {
    setAccentNameState(name);
    setStoredAccent(name);
  }, []);

  const accent = ACCENT_PALETTES[accentName];
  const isDark = colorScheme === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorMode,
      setColorMode: handleSetColorMode,
      isDark,
      accentName,
      setAccentName: handleSetAccent,
      accent,
    }),
    [colorMode, handleSetColorMode, isDark, accentName, handleSetAccent, accent],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
