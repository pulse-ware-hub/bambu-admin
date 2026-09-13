import { createContext, useContext, useEffect, useState } from "react";
import { useLanguage } from "./LanguageContext.jsx";

const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 8, cursor: "pointer",
        background: "var(--color-overlay-2)",
        border: "1px solid var(--color-border)",
        color: "var(--color-muted)",
        fontSize: 12, fontWeight: 600,
        transition: "all 0.15s",
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
      <span>{theme === "dark" ? t("theme.light") : t("theme.dark")}</span>
    </button>
  );
}
