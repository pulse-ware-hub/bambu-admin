import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { upsertDevis, exportGlobalJSON, genId } from "./storage.js";
import { T } from "./tokens.js";
import ETATS_DATA from "./data/etats.json";
import { useLanguage } from "./LanguageContext.jsx";

export const ETATS = ETATS_DATA;
export const ETATS_SUIVI = ["preparation", "expedie"];

// ─── ÉTAT INITIAL ─────────────────────────────────────────────
function makeInitialForm() {
  return {
    // Identifiants
    id:      null,   // uuid interne (timestamp)
    numero:  null,   // numéro 6 chiffres affiché
    etat:    "devis",
    dateRelance:   "",
    numeroSuivi:   "",

    // Entête
    nomPiece:    "",
    revision:    "V1",
    date:        new Date().toLocaleDateString("fr-FR"),
    preparePar:  "",
    client:      "",

    // Matériau principal
    materiau:         "PLA Basic",
    coutFilament:     14,
    filamentReqs:     100,
    tempsImpression:  1,
    mainOeuvre:       10,

    // Matériaux additionnels (7 lignes)
    materiaux: Array(7).fill(null).map(() => ({ nom: "", qte: "", prixUnit: "" })),

    // Emballage (7 lignes)
    emballages: Array(7).fill(null).map(() => ({ nom: "", qte: "", prixUnit: "" })),
    fraisPort: 0,

    // Entrées avancées
    facteurEfficacite:  1.1,
    tauxHoraireMO:      20,
    prixImprimante:     2323,
    coutSupplementaire: 96,
    fraisMaintenanceAn: 100,
    dureeVie:           3,
    tauxDispo:          0.5,
    consommationW:      200,
    coutKwh:            0.2,
    facteurMarge:       1.3,

    // Marges suggérées
    marge1: 50,
    marge2: 60,
    marge3: 70,
  };
}

// ─── CALCULS ──────────────────────────────────────────────────
export function compute(f) {
  const investTotal    = (f.prixImprimante || 0) + (f.coutSupplementaire || 0);
  const coutVie        = investTotal + (f.fraisMaintenanceAn || 0) * (f.dureeVie || 1);
  const heuresAn       = 8760 * (f.tauxDispo || 0.5);
  const coutInvestH    = coutVie / ((f.dureeVie || 1) * heuresAn);
  const coutElecH      = ((f.consommationW || 0) / 1000) * (f.coutKwh || 0);
  const tauxHoraireImp = (coutInvestH + coutElecH) * (f.facteurMarge || 1);

  const coutFilamentPiece = ((f.coutFilament || 0) / 1000) * (f.filamentReqs || 0) * (f.facteurEfficacite || 1);

  const coutMateriaux = (f.materiaux || []).reduce((s, m) => {
    return s + (parseFloat(m.qte) || 0) * (parseFloat(m.prixUnit) || 0);
  }, 0) + coutFilamentPiece;

  const coutMO = ((f.mainOeuvre || 0) / 60) * (f.tauxHoraireMO || 0);

  const coutEmballage = (f.emballages || []).reduce((s, e) => {
    return s + (parseFloat(e.qte) || 0) * (parseFloat(e.prixUnit) || 0);
  }, 0) + parseFloat(f.fraisPort || 0);

  const coutMachine    = tauxHoraireImp * (f.tempsImpression || 0);
  const totalLivraison = coutMateriaux + coutMO + coutEmballage + coutMachine;
  const prix = (marge) => marge >= 100 ? 0 : totalLivraison / (1 - marge / 100);

  return {
    investTotal, coutVie, heuresAn, coutInvestH, coutElecH,
    tauxHoraireImp, coutFilamentPiece, coutMateriaux,
    coutMO, coutEmballage, coutMachine, totalLivraison,
    prix1: prix(f.marge1 || 50),
    prix2: prix(f.marge2 || 60),
    prix3: prix(f.marge3 || 70),
  };
}

// ─── HELPERS UI ───────────────────────────────────────────────
const fmt = (n) => (typeof n === "number" && isFinite(n)) ? n.toFixed(2) : "0.00";

function Field({ label, value, onChange, type = "text", unit, small, readOnly, highlight, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: "0.05em" }}>
          {label}
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type={type}
          value={value ?? ""}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: readOnly
              ? "rgba(255,255,255,0.02)"
              : highlight
              ? "rgba(99,102,241,0.08)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${highlight ? "rgba(99,102,241,0.35)" : T.border}`,
            borderRadius: 7,
            padding: small ? "5px 8px" : "7px 10px",
            fontSize: small ? 11 : 12,
            color: readOnly ? T.muted : T.text,
            outline: "none",
            width: "100%",
          }}
        />
        {unit && <span style={{ fontSize: 11, color: T.dim, whiteSpace: "nowrap" }}>{unit}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ icon, label, color = T.cyan }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 0 6px",
      borderBottom: `1px solid ${T.border}`,
      marginBottom: 10,
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function ResultLine({ label, value, bold, big }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: bold ? "7px 10px" : "4px 10px",
      borderRadius: bold ? 8 : 0,
      background: bold ? "rgba(255,255,255,0.03)" : "transparent",
      borderBottom: bold ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: big ? 13 : 11, color: bold ? T.text : T.muted, fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: big ? 16 : 12, fontWeight: bold ? 800 : 600, color: bold ? T.text : T.muted, fontVariantNumeric: "tabular-nums" }}>
        {fmt(value)} €
      </span>
    </div>
  );
}

// ─── EXPORT EXCEL ─────────────────────────────────────────────
function exportExcel(form, calc, lang = "fr") {
  const wb = XLSX.utils.book_new();
  const etatLabel = ETATS.find(e => e.id === form.etat)?.label?.[lang] || form.etat;

  const rows = [
    ["3D Printed Product Pricing Sheet — Bambu Admin"],
    [],
    ["N° Devis :", form.numero || "—", "", "État :", etatLabel],
    ["Nom de la pièce :", form.nomPiece, "", "Révision :", form.revision],
    ["Client :", form.client, "", "Date :", form.date],
    ["Préparé par :", form.preparePar],
    ...(ETATS_SUIVI.includes(form.etat) && form.numeroSuivi
      ? [["N° Suivi :", form.numeroSuivi]]
      : []),
    [],
    ["Matériau :", form.materiau, "", "Coût filament (€/kg) :", form.coutFilament],
    ["Filament requis (g) :", form.filamentReqs, "", "Temps impression (h) :", form.tempsImpression],
    ["Main-d'œuvre (min) :", form.mainOeuvre],
    [],
    ["─── MATÉRIAUX ───"],
    ["", "Nom", "Quantité", "Prix unitaire", "Coût Total"],
    ["Pièce imprimée", form.nomPiece || "Pièce", 1, parseFloat(fmt(calc.coutFilamentPiece)), calc.coutFilamentPiece],
    ...form.materiaux.map((m, i) => [
      `Matériel ${i + 1}`,
      m.nom || "(vide)",
      parseFloat(m.qte) || "",
      parseFloat(m.prixUnit) || "",
      (parseFloat(m.qte) || 0) * (parseFloat(m.prixUnit) || 0),
    ]),
    [],
    ["", "", "", "Coût total matériaux (€) :", calc.coutMateriaux],
    ["", "", "", "Coût main-d'œuvre (€) :", calc.coutMO],
    [],
    ["─── EMBALLAGE & EXPÉDITION ───"],
    ["", "Nom", "Quantité", "Prix unitaire", "Coût Total"],
    ...form.emballages.map((e, i) => [
      `Emballage ${i + 1}`,
      e.nom || "(vide)",
      parseFloat(e.qte) || "",
      parseFloat(e.prixUnit) || "",
      (parseFloat(e.qte) || 0) * (parseFloat(e.prixUnit) || 0),
    ]),
    ["Frais de port", "Expédition", 1, form.fraisPort, form.fraisPort],
    [],
    ["", "", "", "Coût total emballage (€) :", calc.coutEmballage],
    ["", "", "", "Coût machine (€) :", calc.coutMachine],
    [],
    ["", "", "", "COÛT TOTAL LIVRAISON (€) :", calc.totalLivraison],
    [],
    ["─── PRIX SUGGÉRÉS ───"],
    ["", "", "", `${form.marge1}% de marge`, calc.prix1],
    ["", "", "", `${form.marge2}% de marge`, calc.prix2],
    ["", "", "", `${form.marge3}% de marge`, calc.prix3],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 26 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Devis");

  const advRows = [
    ["Entrées avancées"],
    [],
    ["Paramètre", "Valeur", "Description"],
    ["Facteur d'efficacité matériaux", form.facteurEfficacite, "Pertes impression (1.1 = 110%)"],
    ["Taux horaire impression (€/h)", calc.tauxHoraireImp, "Coût machine calculé"],
    ["Taux horaire MO (€/h)", form.tauxHoraireMO, "Main-d'œuvre post-traitement"],
    [],
    ["Prix imprimante (€)", form.prixImprimante],
    ["Coût supplémentaire (€)", form.coutSupplementaire],
    ["Investissement total (€)", calc.investTotal],
    ["Maintenance annuelle (€)", form.fraisMaintenanceAn],
    ["Coût total sur durée de vie (€)", calc.coutVie],
    [],
    ["Durée de vie (ans)", form.dureeVie],
    ["Taux disponibilité", form.tauxDispo],
    ["Heures/an calculées", calc.heuresAn],
    [],
    ["Consommation (W)", form.consommationW],
    ["Coût électricité (€/kWh)", form.coutKwh],
    ["Facteur marge machine", form.facteurMarge],
    [],
    ["Coût investissement/h (€/h)", calc.coutInvestH],
    ["Coût électrique/h (€/h)", calc.coutElecH],
    ["Taux horaire impression total (€/h)", calc.tauxHoraireImp],
  ];

  const wsAdv = XLSX.utils.aoa_to_sheet(advRows);
  wsAdv["!cols"] = [{ wch: 38 }, { wch: 16 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsAdv, "Adv. Inputs");

  XLSX.writeFile(wb, `Devis_${form.numero || "000000"}_${form.nomPiece || "sans-nom"}.xlsx`);
}

// ─── EXPORT PDF ───────────────────────────────────────────────
function exportPDF(form, calc, lang = "fr") {
  const etatLabel = ETATS.find(e => e.id === form.etat)?.label?.[lang] || form.etat;
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<title>Devis N°${form.numero} — ${form.nomPiece}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;margin:0;padding:24px}
  h1{font-size:16px;color:#1e3a5f;margin-bottom:4px}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;background:#f1f5f9;color:#475569;margin-left:10px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:16px;font-size:10px}
  .meta strong{color:#475569}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th{background:#f1f5f9;font-size:10px;text-align:left;padding:5px 8px;border:1px solid #e2e8f0}
  td{padding:4px 8px;border:1px solid #e2e8f0;font-size:10px}
  .section{font-size:11px;font-weight:800;color:#1e3a5f;margin:14px 0 5px;border-bottom:2px solid #e2e8f0;padding-bottom:3px}
  .total{background:#f8fafc;font-weight:700}
  .prix{background:#eff6ff;font-weight:800;font-size:12px}
  .right{text-align:right}
  .footer{margin-top:24px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
</style></head><body>
<h1>Devis N°${form.numero || "—"} — ${form.nomPiece || "Sans nom"}
  <span class="badge">${etatLabel}</span>
</h1>
<div class="meta">
  <div><strong>Client :</strong> ${form.client || "—"}</div>
  <div><strong>Révision :</strong> ${form.revision}</div>
  <div><strong>Préparé par :</strong> ${form.preparePar || "—"}</div>
  <div><strong>Date :</strong> ${form.date}</div>
  <div><strong>Matériau :</strong> ${form.materiau}</div>
  <div><strong>Filament :</strong> ${form.filamentReqs} g @ ${form.coutFilament} €/kg</div>
  <div><strong>Temps impression :</strong> ${form.tempsImpression} h</div>
  <div><strong>Main-d'œuvre :</strong> ${form.mainOeuvre} min</div>
  ${ETATS_SUIVI.includes(form.etat) && form.numeroSuivi
    ? `<div><strong>N° suivi :</strong> ${form.numeroSuivi}</div>` : ""}
  ${form.dateRelance ? `<div><strong>Date de relance :</strong> ${form.dateRelance}</div>` : ""}
</div>
<div class="section">Matériaux</div>
<table>
  <tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th class="right">Coût total</th></tr>
  <tr><td>${form.nomPiece || "Pièce imprimée"}</td><td>1</td><td>${fmt(calc.coutFilamentPiece)} €</td><td class="right">${fmt(calc.coutFilamentPiece)} €</td></tr>
  ${form.materiaux.filter(m => m.nom).map(m =>
    `<tr><td>${m.nom}</td><td>${m.qte}</td><td>${m.prixUnit} €</td><td class="right">${fmt((parseFloat(m.qte)||0)*(parseFloat(m.prixUnit)||0))} €</td></tr>`
  ).join("")}
  <tr class="total"><td colspan="3">Coût total matériaux</td><td class="right">${fmt(calc.coutMateriaux)} €</td></tr>
  <tr class="total"><td colspan="3">Coût main-d'œuvre</td><td class="right">${fmt(calc.coutMO)} €</td></tr>
</table>
<div class="section">Emballage & Expédition</div>
<table>
  <tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th class="right">Coût total</th></tr>
  ${form.emballages.filter(e => e.nom).map(e =>
    `<tr><td>${e.nom}</td><td>${e.qte}</td><td>${e.prixUnit} €</td><td class="right">${fmt((parseFloat(e.qte)||0)*(parseFloat(e.prixUnit)||0))} €</td></tr>`
  ).join("")}
  ${form.fraisPort > 0 ? `<tr><td>Frais de port</td><td>1</td><td>${form.fraisPort} €</td><td class="right">${fmt(parseFloat(form.fraisPort))} €</td></tr>` : ""}
  <tr class="total"><td colspan="3">Coût total emballage</td><td class="right">${fmt(calc.coutEmballage)} €</td></tr>
</table>
<div class="section">Récapitulatif</div>
<table>
  <tr><td>Coût machine (${form.tempsImpression} h × ${fmt(calc.tauxHoraireImp)} €/h)</td><td class="right">${fmt(calc.coutMachine)} €</td></tr>
  <tr class="total"><td><strong>COÛT TOTAL À LA LIVRAISON</strong></td><td class="right"><strong>${fmt(calc.totalLivraison)} €</strong></td></tr>
</table>
<div class="section">Prix suggérés</div>
<table>
  <tr class="prix"><td>Marge ${form.marge1}%</td><td class="right"><strong>${fmt(calc.prix1)} €</strong></td></tr>
  <tr class="prix"><td>Marge ${form.marge2}%</td><td class="right"><strong>${fmt(calc.prix2)} €</strong></td></tr>
  <tr class="prix"><td>Marge ${form.marge3}%</td><td class="right"><strong>${fmt(calc.prix3)} €</strong></td></tr>
</table>
<div class="footer">Généré par Bambu Admin · H2C Production · ${new Date().toLocaleString("fr-FR")}</div>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function DevisPage({ editEntry, onSaved }) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState(() => {
    if (editEntry) return { ...editEntry };
    const f = makeInitialForm();
    f.id = Date.now().toString();
    f.numero = null; // sera généré à l'enregistrement
    return f;
  });
  const [showAdv, setShowAdv] = useState(false);
  const [toast, setToast]     = useState(null);
  const calc = compute(form);

  // Rechargement si on édite un autre devis
  useEffect(() => {
    if (editEntry) setForm({ ...editEntry });
  }, [editEntry?.id]);

  const set = useCallback((key, val) => setForm(f => ({ ...f, [key]: val })), []);

  const setMat = (i, field, val) => setForm(f => ({
    ...f,
    materiaux: f.materiaux.map((m, idx) => idx === i ? { ...m, [field]: val } : m),
  }));

  const setEmb = (i, field, val) => setForm(f => ({
    ...f,
    emballages: f.emballages.map((e, idx) => idx === i ? { ...e, [field]: val } : e),
  }));

  const showToast = (msg, color = T.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Enregistrer (écrase ou crée selon id) ──
  const handleSave = (asNew = false) => {
    if (!form.nomPiece.trim()) { showToast(t("devis.toast.needName"), T.red); return; }
    if (!form.client.trim())   { showToast(t("devis.toast.needClient"), T.red); return; }

    let entry = { ...form };

    if (asNew) {
      entry.id     = Date.now().toString();
      entry.numero = genId();
      entry.revision = bumpRevision(form.revision);
    } else {
      if (!entry.numero) entry.numero = genId();
      if (!entry.id)     entry.id = Date.now().toString();
    }

    upsertDevis(entry);
    setForm(entry);
    showToast(asNew ? `${t("devis.toast.newQuote")} ${entry.numero} ${t("devis.toast.created")}` : `${t("devis.toast.quote")} ${entry.numero} ${t("devis.toast.saved")}`);
    if (onSaved) onSaved(entry);
  };

  const card = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const etatActuel = ETATS.find(e => e.id === form.etat) || ETATS[0];
  const showSuivi  = ETATS_SUIVI.includes(form.etat);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", position: "relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 999,
          padding: "10px 18px", borderRadius: 10,
          background: toast.color, color: "#fff",
          fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        {/* ── COLONNE GAUCHE ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Identité devis */}
          <div style={card}>
            <SectionTitle icon="📋" label={t("devis.section.identification")} />

            {/* Numéro + état */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                fontSize: 14, fontWeight: 800, color: T.text,
                letterSpacing: "0.08em", fontVariantNumeric: "tabular-nums",
              }}>
                N° {form.numero || "——————"}
              </div>
              <select
                value={form.etat}
                onChange={e => set("etat", e.target.value)}
                style={{
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  background: `${etatActuel.color}22`,
                  border: `1px solid ${etatActuel.color}55`,
                  color: etatActuel.color, fontWeight: 700, fontSize: 13,
                  outline: "none",
                }}
              >
                {ETATS.map(e => (
                  <option key={e.id} value={e.id} style={{ background: T.card, color: T.text }}>
                    {e.label[lang]}
                  </option>
                ))}
              </select>
              {form.dateRelance && (
                <div style={{ fontSize: 11, color: T.gold }}>
                  {t("devis.field.reminder")} {form.dateRelance}
                </div>
              )}
            </div>

            {/* Numéro de suivi (conditionnel) */}
            {showSuivi && (
              <div style={{
                padding: "10px 14px", borderRadius: 9,
                background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
              }}>
                <Field
                  label={t("devis.field.trackingLabel")}
                  value={form.numeroSuivi}
                  onChange={e => set("numeroSuivi", e.target.value)}
                  placeholder={t("devis.field.trackingPlaceholder")}
                  highlight
                />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label={t("devis.field.partName")} value={form.nomPiece} onChange={e => set("nomPiece", e.target.value)} highlight />
              <Field label={t("devis.field.client")} value={form.client} onChange={e => set("client", e.target.value)} />
              <Field label={t("devis.field.preparedBy")} value={form.preparePar} onChange={e => set("preparePar", e.target.value)} />
              <Field label={t("devis.field.revision")} value={form.revision} onChange={e => set("revision", e.target.value)} />
              <Field label={t("devis.field.date")} value={form.date} onChange={e => set("date", e.target.value)} />
              <Field
                label={t("devis.field.reminderDate")}
                value={form.dateRelance}
                type="date"
                onChange={e => set("dateRelance", e.target.value)}
              />
            </div>
          </div>

          {/* Paramètres impression */}
          <div style={card}>
            <SectionTitle icon="🖨️" label={t("devis.section.printParams")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label={t("devis.field.material")} value={form.materiau} onChange={e => set("materiau", e.target.value)} highlight />
              <Field label={t("devis.field.filamentCost")} value={form.coutFilament} type="number" unit="€/kg" onChange={e => set("coutFilament", parseFloat(e.target.value)||0)} highlight />
              <Field label={t("devis.field.filamentReq")} value={form.filamentReqs} type="number" unit="g" onChange={e => set("filamentReqs", parseFloat(e.target.value)||0)} highlight />
              <Field label={t("devis.field.printTime")} value={form.tempsImpression} type="number" unit="h" onChange={e => set("tempsImpression", parseFloat(e.target.value)||0)} highlight />
              <Field label={t("devis.field.labor")} value={form.mainOeuvre} type="number" unit="min" onChange={e => set("mainOeuvre", parseFloat(e.target.value)||0)} highlight />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{t("devis.field.computedPartCost")}</label>
                <div style={{
                  padding: "7px 10px", borderRadius: 7,
                  background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: 14, fontWeight: 700, color: T.green,
                }}>
                  {fmt(calc.coutFilamentPiece)} €
                </div>
              </div>
            </div>
          </div>

          {/* Matériaux additionnels */}
          <div style={card}>
            <SectionTitle icon="🧱" label={t("devis.section.materials")} />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", gap: "5px 8px", alignItems: "end" }}>
              {[t("devis.table.name"), t("devis.table.qty"), t("devis.table.unitPrice"), t("devis.table.total")].map(h => (
                <span key={h} style={{ fontSize: 10, color: T.dim, fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
              ))}
              {form.materiaux.map((m, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <Field value={m.nom} small onChange={e => setMat(i, "nom", e.target.value)} />
                  <Field value={m.qte} type="number" small onChange={e => setMat(i, "qte", e.target.value)} />
                  <Field value={m.prixUnit} type="number" unit="€" small onChange={e => setMat(i, "prixUnit", e.target.value)} />
                  <div style={{ fontSize: 12, color: T.muted, padding: "5px 0", textAlign: "right" }}>
                    {fmt((parseFloat(m.qte)||0)*(parseFloat(m.prixUnit)||0))} €
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emballage */}
          <div style={card}>
            <SectionTitle icon="📦" label={t("devis.section.packaging")} />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", gap: "5px 8px", alignItems: "end" }}>
              {[t("devis.table.name"), t("devis.table.qty"), t("devis.table.unitPrice"), t("devis.table.total")].map(h => (
                <span key={h} style={{ fontSize: 10, color: T.dim, fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
              ))}
              {form.emballages.map((e, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <Field value={e.nom} small onChange={ev => setEmb(i, "nom", ev.target.value)} />
                  <Field value={e.qte} type="number" small onChange={ev => setEmb(i, "qte", ev.target.value)} />
                  <Field value={e.prixUnit} type="number" unit="€" small onChange={ev => setEmb(i, "prixUnit", ev.target.value)} />
                  <div style={{ fontSize: 12, color: T.muted, padding: "5px 0", textAlign: "right" }}>
                    {fmt((parseFloat(e.qte)||0)*(parseFloat(e.prixUnit)||0))} €
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginTop: 4 }}>
              <Field label={t("devis.field.shipping")} value={form.fraisPort} type="number" unit="€" onChange={e => set("fraisPort", parseFloat(e.target.value)||0)} />
            </div>
          </div>

          {/* Entrées avancées */}
          <div style={card}>
            <button onClick={() => setShowAdv(!showAdv)} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>
              <span style={{ fontSize: 13 }}>⚙️</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: T.gold, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {t("devis.section.advanced")}
              </span>
              <span style={{ fontSize: 11, color: T.dim, marginLeft: "auto" }}>{showAdv ? "▲" : "▼"}</span>
            </button>
            {showAdv && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <Field label={t("devis.adv.efficiency")} value={form.facteurEfficacite} type="number" onChange={e => set("facteurEfficacite", parseFloat(e.target.value)||1)} />
                  <Field label={t("devis.adv.laborRate")} value={form.tauxHoraireMO} type="number" onChange={e => set("tauxHoraireMO", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.marginFactor")} value={form.facteurMarge} type="number" onChange={e => set("facteurMarge", parseFloat(e.target.value)||1)} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("devis.adv.machineCost")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <Field label={t("devis.adv.printerPrice")} value={form.prixImprimante} type="number" onChange={e => set("prixImprimante", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.extraCost")} value={form.coutSupplementaire} type="number" onChange={e => set("coutSupplementaire", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.maintenance")} value={form.fraisMaintenanceAn} type="number" onChange={e => set("fraisMaintenanceAn", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.lifespan")} value={form.dureeVie} type="number" onChange={e => set("dureeVie", parseFloat(e.target.value)||1)} />
                  <Field label={t("devis.adv.availability")} value={form.tauxDispo} type="number" onChange={e => set("tauxDispo", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.consumption")} value={form.consommationW} type="number" onChange={e => set("consommationW", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.elecCost")} value={form.coutKwh} type="number" onChange={e => set("coutKwh", parseFloat(e.target.value)||0)} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{t("devis.adv.computedRate")}</label>
                    <div style={{ padding: "7px 10px", borderRadius: 7, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, fontSize: 13, color: T.text, fontWeight: 700 }}>
                      {fmt(calc.tauxHoraireImp)} €/h
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("devis.adv.margins")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <Field label={t("devis.adv.margin1")} value={form.marge1} type="number" onChange={e => set("marge1", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.margin2")} value={form.marge2} type="number" onChange={e => set("marge2", parseFloat(e.target.value)||0)} />
                  <Field label={t("devis.adv.margin3")} value={form.marge3} type="number" onChange={e => set("marge3", parseFloat(e.target.value)||0)} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── COLONNE DROITE ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>

          {/* Récapitulatif */}
          <div style={{ ...card, gap: 8 }}>
            <SectionTitle icon="💶" label={t("devis.section.summary")} color={T.green} />
            <ResultLine label={t("devis.result.filamentPerPart")} value={calc.coutFilamentPiece} />
            <ResultLine label={t("devis.result.totalMaterials")} value={calc.coutMateriaux} />
            <ResultLine label={t("devis.result.labor")} value={calc.coutMO} />
            <ResultLine label={t("devis.result.packaging")} value={calc.coutEmballage} />
            <ResultLine label={`${t("devis.result.machinePrefix")}${form.tempsImpression}${t("devis.result.machineSuffix")}`} value={calc.coutMachine} />
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 4 }}>
              <ResultLine label={t("devis.result.totalDelivery")} value={calc.totalLivraison} bold big />
            </div>
          </div>

          {/* Prix suggérés */}
          <div style={{ ...card, gap: 8 }}>
            <SectionTitle icon="🏷️" label={t("devis.section.suggestedPrices")} color={T.gold} />
            {[
              [form.marge1, calc.prix1, T.muted],
              [form.marge2, calc.prix2, T.cyan],
              [form.marge3, calc.prix3, T.green],
            ].map(([m, p, c]) => (
              <div key={m} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", borderRadius: 9,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{t("devis.price.margin")} {m}%</div>
                  <div style={{ fontSize: 10, color: T.dim }}>{t("devis.price.profit")} {fmt(p - calc.totalLivraison)} €</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(p)} €
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

            {/* Enregistrer (révision) */}
            <button onClick={() => handleSave(false)} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: 14,
              background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.45)",
              color: "#7182d6",
            }}>
              {t("devis.action.save")}{form.numero ? ` — N°${form.numero}` : ""}
            </button>

            {/* Enregistrer comme nouvelle pièce */}
            {form.numero && (
              <button onClick={() => handleSave(true)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12,
                background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.3)",
                color: T.cyan,
              }}>
                {t("devis.action.saveNew")}
              </button>
            )}

            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => exportExcel(form, calc, lang)} style={{
                flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12,
                background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.3)", color: T.green,
              }}>{t("devis.action.excel")}</button>
              <button onClick={() => exportPDF(form, calc, lang)} style={{
                flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171",
              }}>{t("devis.action.pdf")}</button>
              <button onClick={() => exportGlobalJSON()} style={{
                flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12,
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: T.gold,
              }}>{t("devis.action.json")}</button>
            </div>

            <button onClick={() => {
              const f = makeInitialForm();
              f.id     = Date.now().toString();
              f.numero = null;
              setForm(f);
            }} style={{
              padding: "7px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, color: T.dim,
            }}>
              {t("devis.action.newQuote")}
            </button>
          </div>

          <div style={{
            fontSize: 10, color: T.dim, lineHeight: 1.5,
            padding: "8px 10px", borderRadius: 8,
            background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`,
          }}>
            {t("devis.footer")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UTILS ────────────────────────────────────────────────────
function bumpRevision(rev) {
  const match = rev?.match(/^V(\d+)$/i);
  if (match) return `V${parseInt(match[1]) + 1}`;
  return `${rev || "V1"}.1`;
}
