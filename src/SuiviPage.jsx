import { useState, useEffect } from "react";
import { loadGlobal, deleteDevis, patchDevis, exportGlobalJSON } from "./storage.js";
import { ETATS, ETATS_SUIVI } from "./DevisPage.jsx";
import { T } from "./tokens.js";
import { useLanguage } from "./LanguageContext.jsx";

function EtatBadge({ etatId, lang }) {
  const e = ETATS.find(x => x.id === etatId) || ETATS[0];
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: `${e.color}18`,
      border: `1px solid ${e.color}45`,
      color: e.color,
      whiteSpace: "nowrap",
    }}>
      {e.label[lang]}
    </span>
  );
}

export default function SuiviPage({ onEdit }) {
  const { t, lang } = useLanguage();
  const [devis, setDevis]       = useState([]);
  const [search, setSearch]     = useState("");
  const [filterEtat, setFilter] = useState("tous");
  const [editingId, setEditingId] = useState(null); // id en cours d'édition inline
  const [toast, setToast]       = useState(null);
  const [confirmDel, setConfirm] = useState(null); // id à confirmer

  const reload = () => setDevis(loadGlobal().devis);
  useEffect(() => { reload(); }, []);

  const showToast = (msg, color = T.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2200);
  };

  const handleDelete = (id) => {
    deleteDevis(id);
    setConfirm(null);
    reload();
    showToast(t("suivi.toast.deleted"), T.red);
  };

  const handlePatch = (id, patch) => {
    patchDevis(id, patch);
    reload();
  };

  // Filtres
  const filtered = devis
    .filter(d => filterEtat === "tous" || d.etat === filterEtat)
    .filter(d => {
      const q = search.toLowerCase();
      return (
        (d.nomPiece || "").toLowerCase().includes(q) ||
        (d.client || "").toLowerCase().includes(q) ||
        (d.numero || "").includes(q)
      );
    });

  // Statistiques rapides
  const stats = {
    total:    devis.length,
    enCours:  devis.filter(d => ["en_cours","accepte"].includes(d.etat)).length,
    expedies: devis.filter(d => d.etat === "expedie").length,
    regles:   devis.filter(d => d.etat === "regle").length,
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 999,
          padding: "10px 18px", borderRadius: 10,
          background: toast.color, color: "#fff",
          fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "24px 28px",
            display: "flex", flexDirection: "column", gap: 16, maxWidth: 360,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{t("suivi.confirm.title")}</div>
            <div style={{ fontSize: 13, color: T.muted }}>
              {t("suivi.confirm.desc")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirm(null)} style={{
                flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.muted, fontWeight: 600, fontSize: 13,
              }}>{t("suivi.confirm.cancel")}</button>
              <button onClick={() => handleDelete(confirmDel)} style={{
                flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer",
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontWeight: 700, fontSize: 13,
              }}>{t("suivi.confirm.delete")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: t("suivi.stats.total"),      value: stats.total,    color: T.muted },
          { label: t("suivi.stats.inProgress"), value: stats.enCours,  color: T.accent },
          { label: t("suivi.stats.shipped"),    value: stats.expedies, color: "#8b5cf6" },
          { label: t("suivi.stats.paid"),       value: stats.regles,   color: T.green },
        ].map(s => (
          <div key={s.label} style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "12px 16px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: T.dim }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Barre de contrôles ── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder={t("suivi.search.placeholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            padding: "8px 12px", borderRadius: 9,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
            color: T.text, fontSize: 13, outline: "none",
          }}
        />
        <select
          value={filterEtat}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 9,
            background: T.card, border: `1px solid ${T.border}`,
            color: T.text, fontSize: 13, outline: "none", cursor: "pointer",
          }}
        >
          <option value="tous">{t("suivi.filter.all")}</option>
          {ETATS.map(e => (
            <option key={e.id} value={e.id}>{e.label[lang]}</option>
          ))}
        </select>
        <button onClick={() => { exportGlobalJSON(); showToast(t("suivi.toast.exported")); }} style={{
          padding: "8px 14px", borderRadius: 9, cursor: "pointer",
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
          color: T.gold, fontWeight: 700, fontSize: 12,
        }}>
          {t("suivi.export")}
        </button>
        <button onClick={reload} style={{
          padding: "8px 12px", borderRadius: 9, cursor: "pointer",
          background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`,
          color: T.dim, fontSize: 12,
        }}>↻</button>
      </div>

      {/* ── Tableau ── */}
      {filtered.length === 0 ? (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 10, padding: "60px 0", color: T.dim,
        }}>
          <div style={{ fontSize: 36 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {devis.length === 0 ? t("suivi.empty.noQuotes") : t("suivi.empty.noResults")}
          </div>
          <div style={{ fontSize: 12 }}>
            {devis.length === 0
              ? t("suivi.empty.createFirst")
              : t("suivi.empty.adjustSearch")}
          </div>
        </div>
      ) : (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* En-tête tableau */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "90px 110px 1fr 1fr 160px 120px 120px 90px",
            gap: "0 8px",
            padding: "9px 14px",
            background: "rgba(255,255,255,0.03)",
            borderBottom: `1px solid ${T.border}`,
          }}>
            {[t("suivi.table.numero"), t("suivi.table.date"), t("suivi.table.part"), t("suivi.table.client"), t("suivi.table.state"), t("suivi.table.reminder"), t("suivi.table.tracking"), t("suivi.table.actions")].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {h}
              </div>
            ))}
          </div>

          {/* Lignes */}
          {filtered.map((d, i) => {
            const isEditing = editingId === d.id;
            const showSuiviField = ETATS_SUIVI.includes(d.etat);

            return (
              <div
                key={d.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 110px 1fr 1fr 160px 120px 120px 90px",
                  gap: "0 8px",
                  padding: "10px 14px",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                  background: isEditing ? "rgba(99,102,241,0.05)" : "transparent",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
              >
                {/* N° Devis */}
                <div style={{
                  fontSize: 13, fontWeight: 800, color: T.text,
                  fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em",
                }}>
                  {d.numero || "——"}
                </div>

                {/* Date */}
                <div style={{ fontSize: 12, color: T.muted }}>
                  {d.date || "—"}
                </div>

                {/* Pièce — cliquable pour édition */}
                <button
                  onClick={() => onEdit && onEdit(d)}
                  title={t("suivi.editTitle")}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    textAlign: "left", padding: 0,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#7182d6", textDecoration: "underline", textDecorationStyle: "dotted" }}>
                    {d.nomPiece || "—"}
                  </div>
                  {d.revision && (
                    <div style={{ fontSize: 10, color: T.dim }}>{d.revision}</div>
                  )}
                </button>

                {/* Client */}
                <div style={{ fontSize: 13, color: T.text }}>{d.client || "—"}</div>

                {/* État — select inline */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <select
                    value={d.etat || "devis"}
                    onChange={e => handlePatch(d.id, { etat: e.target.value })}
                    style={{
                      padding: "4px 8px", borderRadius: 7, cursor: "pointer",
                      background: `${(ETATS.find(x => x.id === d.etat) || ETATS[0]).color}18`,
                      border: `1px solid ${(ETATS.find(x => x.id === d.etat) || ETATS[0]).color}40`,
                      color: (ETATS.find(x => x.id === d.etat) || ETATS[0]).color,
                      fontWeight: 700, fontSize: 11, outline: "none",
                    }}
                  >
                    {ETATS.map(e => (
                      <option key={e.id} value={e.id} style={{ background: T.card, color: T.text }}>
                        {e.label[lang]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date de relance */}
                <div>
                  <input
                    type="date"
                    value={d.dateRelance || ""}
                    onChange={e => handlePatch(d.id, { dateRelance: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "4px 6px", borderRadius: 6,
                      background: d.dateRelance ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${d.dateRelance ? "rgba(251,191,36,0.3)" : T.border}`,
                      color: d.dateRelance ? T.gold : T.dim,
                      fontSize: 11, outline: "none",
                    }}
                  />
                </div>

                {/* Numéro de suivi */}
                <div>
                  {showSuiviField ? (
                    <input
                      type="text"
                      value={d.numeroSuivi || ""}
                      onChange={e => handlePatch(d.id, { numeroSuivi: e.target.value })}
                      placeholder={t("suivi.trackingPlaceholder")}
                      style={{
                        width: "100%",
                        padding: "4px 6px", borderRadius: 6,
                        background: d.numeroSuivi ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${d.numeroSuivi ? "rgba(139,92,246,0.3)" : T.border}`,
                        color: d.numeroSuivi ? "#c4b5fd" : T.dim,
                        fontSize: 11, outline: "none",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, color: T.dim }}>—</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => onEdit && onEdit(d)}
                    title={t("suivi.edit")}
                    style={{
                      width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                      background: T.accentLo, border: "1px solid rgba(99,102,241,0.3)",
                      color: "#7182d6", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✏️</button>
                  <button
                    onClick={() => setConfirm(d.id)}
                    title={t("suivi.delete")}
                    style={{
                      width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                      color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 10, color: T.dim, paddingBottom: 8 }}>
        {filtered.length} {t("suivi.footerPrefix")} {devis.length} {t("suivi.footerSuffix")}
      </div>
    </div>
  );
}
