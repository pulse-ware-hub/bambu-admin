// ═══════════════════════════════════════════════════════════════
// HotendPage.jsx — Compatibilité hotends & buses
// Sources : wiki.bambulab.com + eu.store.bambulab.com (2025)
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";
import { T } from "./tokens.js";
import { HOTENDS, GROUP_COLORS } from "./data/hotends.js";
import COMPAT from "./data/compat.json";
import { useLanguage } from "./LanguageContext.jsx";

const GROUPS = [...new Set(COMPAT.map(c => c.group))];

function compatConfig(t) {
  return {
    "⭐":{ label:t("hotend.compat.recommended"), bg:"none",  border:"0",  color:"#34d399", icon:"⭐" },
    "✅":{ label:t("hotend.compat.compatible"),  bg:"none",  border:"none",  color:"#7182d6", icon:"✅" },
    "⚠️":{ label:t("hotend.compat.caution"),     bg:"none",  border:"none",  color:"#fbbf24", icon:"⚠️" },
    "❌":{ label:t("hotend.compat.forbidden"),   bg:"none",  border:"none",  color:"#475569", icon:"❌" },
  };
}

// ─── COMPOSANTS ───────────────────────────────────────────────
function HotendCard({ h, selected, onClick, lang }) {
  const position = h.position[lang];
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", gap: 8,
      padding: "14px 16px", borderRadius: 12, textAlign: "left",
      background: selected ? `${h.color}18` : T.card,
      border: `1px solid ${selected ? h.color + "55" : T.border}`,
      cursor: "pointer", transition: "all 0.15s",
      outline: "none",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, direction: h.position.fr.includes("Droite") ? "rtl" : "ltr" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${h.color}20`, border: `1px solid ${h.color}40`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>{h.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: selected ? h.color : T.text, lineHeight: 1.2 }}>
            {h.name[lang]}
          </div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{h.type[lang]}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
          background: (position.includes("Droite")||position.includes("Right")) ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.12)",
          border: `1px solid ${(position.includes("Droite")||position.includes("Right")) ? "rgba(99,102,241,0.3)" : "rgba(16,185,129,0.25)"}`,
          color: (position.includes("Droite")||position.includes("Right")) ? "#7182d6" : "#34d399",
        }}>{position}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
          background: T.overlay2, border: `1px solid ${T.border}`,
          color: T.muted,
        }}>{h.nozzleMat[lang]}</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {h.sizes.map(s => (
          <span key={s} style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 6,
            background: `${h.color}12`, border: `1px solid ${h.color}30`,
            color: h.color, fontWeight: 700,
          }}>{s}</span>
        ))}
      </div>
    </button>
  );
}

function CompatCell({ val, config }) {
  const c = config[val] || config["❌"];
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "6px 4px",
      background: c.bg, borderRadius: 6,
      border: `1px solid ${c.border}`,
      fontSize: 14,
    }} title={c.label}>
      {c.icon}
    </div>
  );
}

export default function HotendPage() {
  const { t, lang } = useLanguage();
  const COMPAT_CONFIG = compatConfig(t);
  const [selected, setSelected] = useState(null);
  const [filterGroup, setFilterGroup] = useState("Tous");
  const [view, setView] = useState("matrix"); // "matrix" | "detail"

  const activeHotend = HOTENDS.find(h => h.id === selected);

  const filteredCompat = filterGroup === "Tous"
    ? COMPAT
    : COMPAT.filter(c => c.group === filterGroup);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{t("hotend.title")}</h2>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {t("hotend.subtitle")}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["matrix","detail"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: view === v ? T.accentLo : T.overlay1,
              border: `1px solid ${view === v ? "rgba(99,102,241,0.4)" : T.border}`,
              color: view === v ? "#7182d6" : T.muted,
            }}>
              {v === "matrix" ? t("hotend.view.matrix") : t("hotend.view.detail")}
            </button>
          ))}
        </div>
      </div>
      {/* ── Cartes hotends ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          { key: "left", label: t("hotend.group.left"), color: "#34d399", hotends: HOTENDS.filter(h => h.position.fr.includes("Gauche")) },
          { key: "right", label: t("hotend.group.right"), color: "#7182d6", hotends: HOTENDS.filter(h => h.position.fr.includes("Droite")) },
        ].map(group => (
          <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: group.color,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {group.label}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {group.hotends.map(h => (
                <HotendCard
                  key={h.id} h={h} lang={lang}
                  selected={selected === h.id}
                  onClick={() => setSelected(selected === h.id ? null : h.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Panneau détail hotend sélectionné ── */}
      {activeHotend && (
        <div style={{
          background: `${activeHotend.color}0d`,
          border: `1px solid ${activeHotend.color}30`,
          borderRadius: 14, padding: "18px 20px",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
        }}>
          {/* Infos générales */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: activeHotend.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {activeHotend.icon} {activeHotend.name[lang]}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
              {[
                [t("hotend.detail.position"), activeHotend.position[lang]],
                [t("hotend.detail.type"), activeHotend.type[lang]],
                [t("hotend.detail.nozzleMat"), activeHotend.nozzleMat[lang]],
                [t("hotend.detail.maxTemp"), `${activeHotend.maxTemp}°C`],
                [t("hotend.detail.flowRate"), activeHotend.flowRate[lang]],
                [t("hotend.detail.heatingTime"), activeHotend.heatingTime[lang]],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: T.dim }}>{l}</div>
                  <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {activeHotend.sizes.map(s => (
                <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 8,
                    background: `${activeHotend.color}20`, border: `1px solid ${activeHotend.color}40`,
                    color: activeHotend.color, fontWeight: 800,
                  }}>{s}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>
                    ~{activeHotend.priceEur[s] || "?"}€
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              fontSize: 11, color: activeHotend.color,
              padding: "8px 10px", borderRadius: 8,
              background: `${activeHotend.color}10`,
              border: `1px solid ${activeHotend.color}25`,
              lineHeight: 1.5,
            }}>
              {activeHotend.note[lang]}
            </div>
          </div>

          {/* Atouts */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.green, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
              {t("hotend.strengths")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {activeHotend.features[lang].map((f, i) => (
                <div key={i} style={{
                  fontSize: 11, color: T.green,
                  padding: "4px 8px", borderRadius: 6,
                  background: "rgba(16,185,129,0.07)",
                  border: "1px solid rgba(16,185,129,0.15)",
                  lineHeight: 1.4,
                }}>{f}</div>
              ))}
            </div>
          </div>

          {/* Limitations */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.red, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
              {t("hotend.limitationsTitle")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {activeHotend.limitations[lang].map((l, i) => (
                <div key={i} style={{
                  fontSize: 11, color: "#fa8989",
                  padding: "4px 8px", borderRadius: 6,
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  lineHeight: 1.4,
                }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MATRICE ── */}
      {view === "matrix" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Filtre groupe */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.dim, fontWeight: 700, textTransform: "uppercase", marginRight: 4 }}>{t("hotend.filterFamily")}</span>
            {["Tous", ...GROUPS].map(g => (
              <button key={g} onClick={() => setFilterGroup(g)} style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: filterGroup === g
                  ? (g === "Tous" ? T.accentLo : `${GROUP_COLORS[g]}20`)
                  : T.overlay1,
                border: `1px solid ${filterGroup === g
                  ? (g === "Tous" ? "rgba(99,102,241,0.4)" : GROUP_COLORS[g] + "50")
                  : T.border}`,
                color: filterGroup === g
                  ? (g === "Tous" ? "#7182d6" : GROUP_COLORS[g])
                  : T.muted,
              }}>{g==="Tous"?t("cats.all"):g}</button>
            ))}
          </div>

          {/* Légende */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(COMPAT_CONFIG).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: v.color }}>
                <span>{v.icon}</span><span>{v.label}</span>
              </div>
            ))}
          </div>

          {/* Tableau */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, overflow: "auto",
          }}>
            {/* En-tête colonnes */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `220px repeat(${HOTENDS.length}, 1fr)`,
              borderBottom: `1px solid ${T.border}`,
              background: T.overlay1,
              position: "sticky", top: 0, zIndex: 10,
            }}>
              <div style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase" }}>
                {t("hotend.table.filament")}
              </div>
              {HOTENDS.map(h => (
                <div key={h.id} style={{
                  padding: "8px 4px", textAlign: "center",
                  borderLeft: `1px solid ${T.border}`,
                }}>
                  <div style={{ fontSize: 15 }}>{h.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: h.color, lineHeight: 1.2, marginTop: 2 }}>
                    {h.shortName[lang]}
                  </div>
                  <div style={{ fontSize: 9, color: T.dim, marginTop: 1 }}>
                    {h.sizes.join(" / ")}
                  </div>
                </div>
              ))}
            </div>

            {/* Lignes filaments */}
            {filteredCompat.map((row, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: `220px repeat(${HOTENDS.length}, 1fr)`,
                borderBottom: i < filteredCompat.length - 1 ? `1px solid ${T.border}` : "none",
                background: i % 2 === 0 ? "transparent" : T.overlay1,
              }}>
                <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                    background: GROUP_COLORS[row.group] || T.muted,
                  }}/>
                  <div>
                    <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{row.filament}</div>
                    <div style={{ fontSize: 9, color: T.dim }}>{row.group}</div>
                  </div>
                </div>
                {row.vals.map((val, j) => (
                  <div key={j} style={{
                    padding: "6px 4px",
                    borderLeft: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CompatCell val={val} config={COMPAT_CONFIG} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VUE DÉTAIL : règles critiques H2C ── */}
      {view === "detail" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Règles critiques */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "18px 20px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.red, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {t("hotend.rules.title")}
            </div>
            {[
              { icon:"❌", text:{
                  fr:"PET-CF, PPA-CF, PPS-CF → GAUCHE (lifting) UNIQUEMENT. Le tube du hotend droit se plie lors du homing et casse ces filaments cassants.",
                  en:"PET-CF, PPA-CF, PPS-CF → LEFT (lifting) ONLY. The right hotend's tube bends during homing and breaks these brittle filaments.",
                }, isRed: true },
              { icon:"❌", text:{
                  fr:"TPU 85A → DROITE (fixe) UNIQUEMENT. Trop souple pour passer dans le mécanisme du hotend gauche.",
                  en:"TPU 85A → RIGHT (fixed) ONLY. Too soft to go through the left hotend's mechanism.",
                }, isRed: true },
              { icon:"⚠️", text:{
                  fr:"TPU 95A HF / 90A → DROITE recommandé (support gauche prévu firmware U2+). À vérifier selon version firmware.",
                  en:"TPU 95A HF / 90A → RIGHT recommended (left support planned in firmware U2+). Check your firmware version.",
                }, isRed: false },
              { icon:"⚠️", text:{
                  fr:"Filaments haute T° (ABS/ASA/PC/PA/PPS) + filaments basse T° (PLA/PETG/TPU) = IMPOSSIBLE dans le même job Bambu Studio.",
                  en:"High-temp filaments (ABS/ASA/PC/PA/PPS) + low-temp filaments (PLA/PETG/TPU) = IMPOSSIBLE in the same Bambu Studio job.",
                }, isRed: false },
              { icon:"❌", text:{
                  fr:"PVA + PETG simultané sur les deux hotends = INTERDIT. La chaleur PETG (lit 70°C) dégrade le PVA dans l'autre hotend.",
                  en:"PVA + PETG at the same time on both hotends = FORBIDDEN. PETG heat (70°C bed) degrades the PVA in the other hotend.",
                }, isRed: true },
              { icon:"❌", text:{
                  fr:"Tailles de buse différentes gauche/droite = NON supporté par le firmware actuel (même taille obligatoire).",
                  en:"Different left/right nozzle sizes = NOT supported by current firmware (same size mandatory).",
                }, isRed: true },
              { icon:"⚠️", text:{
                  fr:"CF/GF dans un hotend HF 0.4mm = déconseillé (colmatage difficile à nettoyer). Préférer 0.6mm.",
                  en:"CF/GF in a 0.4mm HF hotend = not recommended (clogs are hard to clear). Prefer 0.6mm.",
                }, isRed: false },
              { icon:"❌", text:{
                  fr:"Hotend TPU (droite) : filaments durs INTERDITS. Le revêtement interne est détruit par PLA/PETG/ABS.",
                  en:"TPU hotend (right): rigid filaments FORBIDDEN. The internal coating is destroyed by PLA/PETG/ABS.",
                }, isRed: true },
              { icon:"❌", text:{
                  fr:"Tungsten Carbide H2C : GAUCHE uniquement. Non disponible pour le système Vortek droit.",
                  en:"Tungsten Carbide H2C: LEFT only. Not available for the right Vortek system.",
                }, isRed: true },
              { icon:"⚠️", text:{
                  fr:"PVA 0.2mm standard sur H2C : NON supporté. Utiliser 0.4mm minimum.",
                  en:"Standard PVA 0.2mm on H2C: NOT supported. Use 0.4mm minimum.",
                }, isRed: false },
            ].map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "8px 12px",
                borderRadius: 8, alignItems: "flex-start",
                background: r.isRed ? "rgba(239,68,68,0.07)" : "rgba(251,191,36,0.07)",
                border: `1px solid ${r.isRed ? "rgba(239,68,68,0.2)" : "rgba(251,191,36,0.2)"}`,
              }}>
                <span style={{ fontSize: 10, flexShrink: 0 }}>{r.icon}</span>
                <span style={{ fontSize: 12, color: r.isRed ? "#fa8989" : "#af983f", lineHeight: 1.5 }}>
                  {r.text[lang]}
                </span>
              </div>
            ))}
          </div>

          {/* Guide usage Vortek */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "18px 20px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.accent, marginBottom: 10 }}>
                {t("hotend.vortek.strategy")}
              </div>
              {[
                { slot:"Induction 1 (0.4mm)", usage:{ fr:"Matériau principal PLA/PETG/ABS/ASA", en:"Main material PLA/PETG/ABS/ASA" }, color:"#4ade80" },
                { slot:"Induction 2 (0.4mm)", usage:{ fr:"2e couleur ou 2e matériau low-temp", en:"2nd color or 2nd low-temp material" }, color:"#60a5fa" },
                { slot:"Induction 3 (0.4mm)", usage:{ fr:"3e couleur / Support PLA-PETG", en:"3rd color / PLA-PETG support" }, color:"#7182d6" },
                { slot:"Induction 4 (0.6mm)", usage:{ fr:"Matériaux CF/GF ou Support PA/PET", en:"CF/GF materials or PA/PET support" }, color:"#fbbf24" },
                { slot:"Induction 5 (0.6mm)", usage:{ fr:"Engineering haute vitesse", en:"High-speed engineering" }, color:"#f97316" },
                { slot:"Induction 6 (0.6mm)", usage:{ fr:"Filament dédié production / test", en:"Dedicated production / test filament" }, color:"#8b5cf6" },
              ].map((s, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "6px 10px", borderRadius: 7, marginBottom: 4,
                  background: T.overlay1, border: `1px solid ${T.border}`,
                  alignItems: "center",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.slot}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{s.usage[lang]}</div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.green, marginBottom: 10 }}>
                {t("hotend.left.usage")}
              </div>
              {[
                { mat:"PET-CF / PPA-CF / PPS-CF", hotend:{ fr:"Tungsten 0.6mm ← obligatoire", en:"Tungsten 0.6mm ← mandatory" }, urgent: true },
                { mat:"PA-CF / PAHT-CF", hotend:{ fr:"Tungsten 0.6mm ← recommandé", en:"Tungsten 0.6mm ← recommended" }, urgent: false },
                { mat:"PETG-CF / ASA-CF", hotend:{ fr:"Standard ou Tungsten 0.6mm", en:"Standard or Tungsten 0.6mm" }, urgent: false },
                { mat:"Support PA/PET", hotend:{ fr:"Standard 0.6mm dédié", en:"Dedicated Standard 0.6mm" }, urgent: false },
                { mat:"PVA (support soluble)", hotend:{ fr:"Standard 0.4mm (pas 0.2mm)", en:"Standard 0.4mm (not 0.2mm)" }, urgent: false },
                { mat:"TPU 95A HF / 90A", hotend:{ fr:"Standard 0.4mm+ (firmware U2)", en:"Standard 0.4mm+ (firmware U2)" }, urgent: false },
              ].map((r, i) => (
                <div key={i} style={{
                  padding: "7px 10px", borderRadius: 7, marginBottom: 4,
                  background: r.urgent ? "rgba(239,68,68,0.06)" : T.overlay1,
                  border: `1px solid ${r.urgent ? "rgba(239,68,68,0.2)" : T.border}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: r.urgent ? "#f87171" : T.text }}>{r.mat}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{r.hotend[lang]}</div>
                </div>
              ))}

              <div style={{ fontSize: 13, fontWeight: 800, color: T.purple, marginBottom: 10, paddingTop:"15px" }}>
                {t("hotend.tpu.title")}
              </div>
              <div style={{ padding: "7px 10px", borderRadius: 7, marginBottom: 4, background: T.overlay1, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{t("hotend.tpu.only")}</div>
              </div>
              <div style={{ padding: "7px 10px", borderRadius: 7, marginBottom: 4, background: T.overlay1, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{t("hotend.tpu.multimat")}</div>
              </div>
              <div style={{ padding: "7px 10px", borderRadius: 7, marginBottom: 4, background: T.overlay1, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{t("hotend.tpu.ams")}</div>
              </div>

            </div>
          </div>

          {/* Tableau tarifs */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "18px 20px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12 }}>
              {t("hotend.pricing.title")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `1fr repeat(4, 80px)`, gap: "0 4px" }}>
              {["Hotend", "0.2mm", "0.4mm", "0.6mm", "0.8mm"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", padding: "4px 8px", borderBottom: `1px solid ${T.border}` }}>
                  {h}
                </div>
              ))}
              {HOTENDS.map(h => (
                <>
                  <div style={{ padding: "7px 8px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 13 }}>{h.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: h.color }}>{h.shortName[lang]}</div>
                      <div style={{ fontSize: 9, color: T.dim }}>{h.position[lang]}</div>
                    </div>
                  </div>
                  {["0.2mm","0.4mm","0.6mm","0.8mm"].map(s => (
                    <div key={s} style={{
                      padding: "7px 4px", textAlign: "center",
                      borderBottom: `1px solid ${T.border}`,
                      fontSize: 12, fontWeight: h.priceEur[s] ? 700 : 400,
                      color: h.priceEur[s] ? T.text : T.dim,
                    }}>
                      {h.priceEur[s] ? `~${h.priceEur[s]}€` : "—"}
                    </div>
                  ))}
                </>
              ))}
            </div>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 10 }}>
              {t("hotend.pricing.note")}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: T.dim, lineHeight: 1.5, paddingBottom: 8 }}>
        {t("hotend.sources")}
      </div>
    </div>
  );
}
