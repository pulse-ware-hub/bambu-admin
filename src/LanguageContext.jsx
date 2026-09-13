import { createContext, useContext, useEffect, useState } from "react";
import { STRINGS } from "./data/i18n.js";

const LanguageContext = createContext({ lang: "fr", toggle: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem("lang") || "fr"
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("lang", lang);
  }, [lang]);

  const toggle = () => setLang(l => (l === "fr" ? "en" : "fr"));
  const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.fr[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageToggle() {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={toggle}
      title={lang === "fr" ? "Switch to English" : "Passer en français"}
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
      🌐
      <span>{lang === "fr" ? "FR" : "EN"}</span>
    </button>
  );
}
