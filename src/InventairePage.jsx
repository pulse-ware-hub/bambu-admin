import { useState, useEffect, useCallback } from "react";
import { T } from "./tokens.js";
import { HOTENDS } from "./data/hotends.js";
import { FILAMENTS } from "./data/filaments.js";
import { useLanguage } from "./LanguageContext.jsx";

// ── API ───────────────────────────────────────────────────────
async function loadInv() {
  const res = await fetch("/api/inventaire");
  if (!res.ok) return { hotends: [], filaments: [] };
  return res.json();
}

async function saveInv(data) {
  await fetch("/api/inventaire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }

// ── UI primitives ─────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: "22px 26px", width: 500, maxWidth: "calc(100vw - 32px)",
        maxHeight: "85vh", overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.dim, fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      {children}
    </div>
  );
}

function Inp({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "8px 10px", borderRadius: 8, fontSize: 13,
        background: T.surface, border: `1px solid ${T.border}`,
        color: T.text, outline: "none", width: "100%", boxSizing: "border-box",
      }}
    />
  );
}

function Sel({ value, onChange, children }) {
  return (
    <select value={value ?? ""} onChange={e => onChange(e.target.value)} style={{
      padding: "8px 10px", borderRadius: 8, fontSize: 13,
      background: T.surface, border: `1px solid ${T.border}`,
      color: T.text, outline: "none", cursor: "pointer", width: "100%",
    }}>
      {children}
    </select>
  );
}

function BtnSave({ onClick }) {
  const { t } = useLanguage();
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 8, cursor: "pointer",
      background: T.accentLo, border: `1px solid ${T.accentBd}`,
      color: "#7182d6", fontWeight: 700, fontSize: 13,
    }}>{t("inv.save")}</button>
  );
}
function BtnCancel({ onClick }) {
  const { t } = useLanguage();
  return (
    <button onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 8, cursor: "pointer",
      background: T.surface, border: `1px solid ${T.border}`, color: T.muted, fontSize: 13,
    }}>{t("inv.cancel")}</button>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOTENDS TAB
// ═══════════════════════════════════════════════════════════════
function HotendsTab({ hotends, onSave }) {
  const { t, lang } = useLanguage();
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]     = useState({});

  const vortek  = hotends.find(h => h.location === "vortek");
  const left    = hotends.find(h => h.location === "left");
  const inStock = hotends.filter(h => h.location === "stock");

  const applyLocation = (entries, targetId, location) =>
    entries.map(h => {
      if (h.id === targetId) return { ...h, location };
      if ((location === "vortek" || location === "left") && h.location === location)
        return { ...h, location: "stock" };
      return h;
    });

  const setLocation = (id, loc) => onSave(applyLocation(hotends, id, loc));

  const openAdd = () => {
    const cat = HOTENDS[0];
    setForm({ catalogId: cat.id, name: cat.name[lang], color: cat.color, location: "stock", notes: "" });
    setModal({ mode: "add" });
  };

  const openEdit = (item) => { setForm({ ...item }); setModal({ mode: "edit", id: item.id }); };

  const handleSave = () => {
    const cat = HOTENDS.find(h => h.id === form.catalogId);
    const entry = {
      id:       modal.mode === "edit" ? modal.id : uid(),
      catalogId: form.catalogId || "custom",
      name:     form.name  || cat?.name?.[lang]  || "Hotend",
      color:    form.color || cat?.color || "#6366f1",
      location: form.location || "stock",
      notes:    form.notes || "",
    };
    let updated = modal.mode === "edit"
      ? hotends.map(h => h.id === entry.id ? entry : h)
      : [...hotends, entry];
    updated = applyLocation(updated, entry.id, entry.location);
    onSave(updated);
    setModal(null);
  };

  const handleDelete = (id) => { onSave(hotends.filter(h => h.id !== id)); setConfirm(null); };
  const catForForm = HOTENDS.find(h => h.id === form.catalogId);

  const locColor = (loc) =>
    loc === "vortek" ? "#6366f1" : loc === "left" ? "#06b6d4" : T.dim;

  const SLOTS = [
    { key: "left",   label: t("inv.hotend.slotLeft"),   icon: "◀", desc: t("inv.hotend.slotLeftDesc") },
    { key: "vortek", label: t("inv.hotend.slotVortek"), icon: "V", desc: t("inv.hotend.slotVortekDesc") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Config H2C ── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 14 }}>
          {t("inv.hotend.configTitle")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SLOTS.map(slot => {
            const installed = slot.key === "left" ? left : vortek;
            return (
              <div key={slot.key} style={{
                border: `2px solid ${installed ? installed.color + "80" : T.border}`,
                borderRadius: 10, padding: "14px 16px",
                background: installed ? installed.color + "0c" : T.surface,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: installed ? installed.color + "22" : T.overlay2,
                    border: `1px solid ${installed ? installed.color + "50" : T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800,
                    color: installed ? installed.color : T.dim,
                  }}>{slot.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{slot.label}</div>
                    <div style={{ fontSize: 10, color: T.dim }}>{slot.desc}</div>
                  </div>
                </div>

                {installed ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: installed.color, flexShrink: 0 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{installed.name}</div>
                    </div>
                    {installed.notes && <div style={{ fontSize: 11, color: T.dim }}>{installed.notes}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(installed)} style={{
                        padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                        background: T.accentLo, border: `1px solid ${T.accentBd}`, color: "#7182d6",
                      }}>{t("inv.hotend.modify")}</button>
                      <button onClick={() => setLocation(installed.id, "stock")} style={{
                        padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171",
                      }}>{t("inv.hotend.remove")}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: T.dim }}>{t("inv.hotend.none")}</div>
                    {inStock.length > 0 ? (
                      <select
                        key={inStock.map(h => h.id).join(",")}
                        defaultValue=""
                        onChange={e => { if (e.target.value) setLocation(e.target.value, slot.key); }}
                        style={{
                          padding: "5px 8px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                          background: T.surface, border: `1px solid ${T.border}`, color: T.muted, outline: "none",
                        }}
                      >
                        <option value="">{t("inv.hotend.installFromStock")}</option>
                        {inStock.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    ) : (
                      <div style={{ fontSize: 11, color: T.dim, fontStyle: "italic" }}>{t("inv.hotend.noStock")}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
          {t("inv.hotend.inventoryPrefix")} {hotends.length} {t("inv.hotend.unit")}{hotends.length !== 1 ? "s" : ""}
        </div>
        <button onClick={openAdd} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer",
          background: T.accentLo, border: `1px solid ${T.accentBd}`,
          color: "#7182d6", fontSize: 12, fontWeight: 700,
        }}>{t("inv.add")}</button>
      </div>

      {hotends.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: T.dim, fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔩</div>
          {t("inv.hotend.empty")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {hotends.map(h => {
            const lc = locColor(h.location);
            const locLabel = h.location === "vortek" ? "Vortek" : h.location === "left" ? "Gauche" : "Stock";
            return (
              <div key={h.id} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: "11px 14px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: h.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</div>
                  {h.notes && <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{h.notes}</div>}
                </div>
                <select
                  value={h.location}
                  onChange={e => setLocation(h.id, e.target.value)}
                  style={{
                    padding: "4px 8px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                    background: lc + "15", border: `1px solid ${lc}35`, color: lc,
                    fontWeight: 700, outline: "none", flexShrink: 0,
                  }}
                >
                  <option value="stock"  style={{ background: "var(--color-card)", color: "var(--color-text)" }}>{t("inv.hotend.locStock")}</option>
                  <option value="vortek" style={{ background: "var(--color-card)", color: "var(--color-text)" }}>{t("inv.hotend.locVortek")}</option>
                  <option value="left"   style={{ background: "var(--color-card)", color: "var(--color-text)" }}>{t("inv.hotend.locLeft")}</option>
                </select>
                <button onClick={() => openEdit(h)} style={{
                  width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                  background: T.accentLo, border: `1px solid ${T.accentBd}`,
                  color: "#7182d6", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                }}>✏️</button>
                <button onClick={() => setConfirm(h.id)} style={{
                  width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                }}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={modal.mode === "add" ? t("inv.hotend.addTitle") : t("inv.hotend.editTitle")} onClose={() => setModal(null)}>
          <Field label={t("inv.field.catalogModel")}>
            <Sel value={form.catalogId} onChange={v => {
              const cat = HOTENDS.find(h => h.id === v);
              setForm(f => ({ ...f, catalogId: v, name: cat?.name?.[lang] || f.name, color: cat?.color || f.color }));
            }}>
              {HOTENDS.map(h => <option key={h.id} value={h.id}>{h.name[lang]}</option>)}
              <option value="custom">{t("inv.custom")}</option>
            </Sel>
          </Field>
          <Field label={t("inv.field.displayName")}>
            <Inp value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder={catForForm?.name?.[lang] || t("inv.hotend.namePlaceholder")} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("inv.field.color")}>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="color" value={form.color || "#6366f1"} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 36, height: 34, borderRadius: 7, border: `1px solid ${T.border}`, cursor: "pointer", background: "none", flexShrink: 0 }} />
                <Inp value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="#6366f1" />
              </div>
            </Field>
            <Field label={t("inv.field.location")}>
              <Sel value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))}>
                <option value="stock">{t("inv.hotend.locStock")}</option>
                <option value="vortek">{t("inv.hotend.slotVortek")}</option>
                <option value="left">{t("inv.hotend.slotLeft")}</option>
              </Sel>
            </Field>
          </div>
          <Field label={t("inv.field.notes")}>
            <Inp value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder={t("inv.hotend.notesPlaceholder")} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <BtnCancel onClick={() => setModal(null)} />
            <BtnSave onClick={handleSave} />
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal title={t("inv.hotend.deleteTitle")} onClose={() => setConfirm(null)}>
          <div style={{ fontSize: 13, color: T.muted }}>{t("inv.deleteConfirmDesc")}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <BtnCancel onClick={() => setConfirm(null)} />
            <button onClick={() => handleDelete(confirm)} style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer",
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171", fontWeight: 700, fontSize: 13,
            }}>{t("suivi.confirm.delete")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILAMENTS TAB
// ═══════════════════════════════════════════════════════════════
function PrinterAmsTray({ tray }) {
  if (!tray?.present) {
    return (
      <div style={{
        border: `1px dashed ${T.border}`, borderRadius: 7, padding: "8px 6px",
        textAlign: "center", fontSize: 10, color: T.dim,
      }}>—</div>
    );
  }
  return (
    <div style={{
      border: `1px solid ${tray.color || T.border}80`, borderRadius: 7, padding: "8px 6px",
      textAlign: "center", background: tray.color ? tray.color + "10" : T.surface,
    }}>
      <div style={{ width: 16, height: 16, borderRadius: 4, margin: "0 auto 5px", background: tray.color || "#64748b" }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{tray.name || tray.material || "—"}</div>
      {tray.remain >= 0 && <div style={{ fontSize: 8, color: T.dim, marginTop: 2 }}>{tray.remain}%</div>}
    </div>
  );
}

function PrinterAmsCard({ p, status, t }) {
  const connected = status?.connectionStatus === "connected";
  const units = status?.ams?.units || [];
  const vtTray = status?.vtTray;
  const dotColor = connected ? "#10b981" : status?.connectionStatus === "connecting" ? "#fbbf24" : "#475569";

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", flexDirection: "row", gap: 14, alignItems: "flex-start" }}>

        {/* ── Infos imprimante ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0, minWidth: 110 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>🖨️ {p.name || p.model || "—"}</span>
        </div>

        {/* ── Infos AMS (si disponibles) ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!connected ? (
            <div style={{ fontSize: 11, color: T.dim, fontStyle: "italic" }}>{t("inv.fil.notConnected")}</div>
          ) : units.length === 0 && !vtTray?.present ? (
            <div style={{ fontSize: 11, color: T.dim, fontStyle: "italic" }}>{t("inv.fil.noAms")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {units.map(unit => (
                <div key={unit.id}>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>AMS {Number(unit.id) + 1}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
                    {unit.trays.map((tray, i) => <PrinterAmsTray key={i} tray={tray} />)}
                  </div>
                </div>
              ))}
              {vtTray?.present && (
                <div>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>{t("inv.fil.externalSpool")}</div>
                  <div style={{ maxWidth: 70 }}><PrinterAmsTray tray={vtTray} /></div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function PrintersAmsOverview() {
  const { t } = useLanguage();
  const [printers, setPrinters] = useState([]);
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/printers").then(r => r.json()).then(list => { if (!cancelled) setPrinters(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (printers.length === 0) return;
    let cancelled = false;
    const poll = () => {
      printers.forEach(p => {
        fetch(`/api/printer-status/${p.id}`).then(r => r.json()).then(s => {
          if (!cancelled) setStatuses(prev => ({ ...prev, [p.id]: s }));
        }).catch(() => {});
      });
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [printers]);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.09em" }}>
        {t("inv.fil.printersTitle")}
      </div>
      {printers.length === 0 ? (
        <div style={{ fontSize: 12, color: T.dim, fontStyle: "italic" }}>{t("inv.fil.noPrinters")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 10 }}>
          {printers.map(p => <PrinterAmsCard key={p.id} p={p} status={statuses[p.id]} t={t} />)}
        </div>
      )}
    </div>
  );
}

function FilamentsTab({ filaments, onSave }) {
  const { t } = useLanguage();
  const [modal, setModal]     = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]       = useState({});

  const openAdd = () => {
    const cat = FILAMENTS[0];
    setForm({ catalogId: cat.id, name: cat.name, color: cat.color, brand: "Bambu Lab", weightTotalG: 1000, weightRemainingG: 1000, slotAMS: "", notes: "" });
    setModal({ mode: "add" });
  };

  const openEdit = (item) => {
    setForm({ ...item, slotAMS: item.slotAMS != null ? String(item.slotAMS) : "" });
    setModal({ mode: "edit", id: item.id });
  };

  const handleSave = () => {
    const cat   = FILAMENTS.find(f => f.id === form.catalogId);
    const total = Number(form.weightTotalG) || 1000;
    const entry = {
      id:               modal.mode === "edit" ? modal.id : uid(),
      catalogId:        form.catalogId || "custom",
      name:             form.name  || cat?.name  || "Filament",
      color:            form.color || cat?.color || "#64748b",
      brand:            form.brand || "Bambu Lab",
      weightTotalG:     total,
      weightRemainingG: Math.min(Number(form.weightRemainingG) ?? total, total),
      slotAMS:          form.slotAMS !== "" ? Number(form.slotAMS) : null,
      notes:            form.notes || "",
    };
    const updated = modal.mode === "edit"
      ? filaments.map(f => f.id === entry.id ? entry : f)
      : [...filaments, entry];
    onSave(updated);
    setModal(null);
  };

  const handleDelete = (id) => { onSave(filaments.filter(f => f.id !== id)); setConfirm(null); };
  const catForForm = FILAMENTS.find(f => f.id === form.catalogId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── AMS imprimantes (live, lecture seule) ── */}
      <PrintersAmsOverview />

      {/* ── List ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
          {t("inv.fil.inventoryPrefix")} {filaments.length} {t("inv.fil.unit")}{filaments.length !== 1 ? "s" : ""}
        </div>
        <button onClick={openAdd} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer",
          background: T.accentLo, border: `1px solid ${T.accentBd}`,
          color: "#7182d6", fontSize: 12, fontWeight: 700,
        }}>{t("inv.add")}</button>
      </div>

      {filaments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: T.dim, fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧵</div>
          {t("inv.fil.empty")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 10 }}>
          {filaments.map(f => {
            const pct = Math.round((f.weightRemainingG / f.weightTotalG) * 100);
            const barColor = pct > 50 ? "#10b981" : pct > 20 ? "#fbbf24" : "#ef4444";
            return (
              <div key={f.id} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, background: f.color, flexShrink: 0, marginTop: 1,
                    boxShadow: `0 0 8px ${f.color}50`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{f.brand}</div>
                  </div>
                  {f.slotAMS != null && (
                    <span style={{
                      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0,
                      background: T.accentLo, border: `1px solid ${T.accentBd}`, color: "#7182d6",
                    }}>AMS {f.slotAMS}</span>
                  )}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{t("inv.fil.remaining")}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>
                      {f.weightRemainingG}g / {f.weightTotalG}g ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: T.overlay2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>
                {f.notes && <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>{f.notes}</div>}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => openEdit(f)} style={{
                    width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                    background: T.accentLo, border: `1px solid ${T.accentBd}`,
                    color: "#7182d6", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>✏️</button>
                  <button onClick={() => setConfirm(f.id)} style={{
                    width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                    color: "#f87171", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={modal.mode === "add" ? t("inv.fil.addTitle") : t("inv.fil.editTitle")} onClose={() => setModal(null)}>
          <Field label={t("inv.field.catalogModel")}>
            <Sel value={form.catalogId} onChange={v => {
              const cat = FILAMENTS.find(f => f.id === v);
              setForm(f => ({ ...f, catalogId: v, name: cat?.name || f.name, color: cat?.color || f.color }));
            }}>
              {FILAMENTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              <option value="custom">{t("inv.custom")}</option>
            </Sel>
          </Field>
          <Field label={t("inv.field.displayName")}>
            <Inp value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder={catForForm?.name || t("inv.fil.namePlaceholder")} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("inv.field.color")}>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="color" value={form.color || "#64748b"} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 36, height: 34, borderRadius: 7, border: `1px solid ${T.border}`, cursor: "pointer", background: "none", flexShrink: 0 }} />
                <Inp value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="#64748b" />
              </div>
            </Field>
            <Field label={t("inv.field.brand")}>
              <Inp value={form.brand} onChange={v => setForm(f => ({ ...f, brand: v }))} placeholder="Bambu Lab" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("inv.fil.totalWeight")}>
              <Inp type="number" value={form.weightTotalG} onChange={v => setForm(f => ({ ...f, weightTotalG: v }))} placeholder="1000" />
            </Field>
            <Field label={t("inv.fil.remainingWeight")}>
              <Inp type="number" value={form.weightRemainingG} onChange={v => setForm(f => ({ ...f, weightRemainingG: v }))} placeholder="1000" />
            </Field>
          </div>
          <Field label={t("inv.field.notes")}>
            <Inp value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder={t("inv.fil.notesPlaceholder")} />
          </Field>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, color: T.dim, lineHeight: 1.4 }}>{t("inv.fil.modalAmsNote")}</div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <BtnCancel onClick={() => setModal(null)} />
              <BtnSave onClick={handleSave} />
            </div>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal title={t("inv.fil.deleteTitle")} onClose={() => setConfirm(null)}>
          <div style={{ fontSize: 13, color: T.muted }}>{t("inv.deleteConfirmDesc")}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <BtnCancel onClick={() => setConfirm(null)} />
            <button onClick={() => handleDelete(confirm)} style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer",
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171", fontWeight: 700, fontSize: 13,
            }}>{t("suivi.confirm.delete")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export default function InventairePage() {
  const { t } = useLanguage();
  const [tab, setTab]   = useState("hotends");
  const [data, setData] = useState({ hotends: [], filaments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInv().then(d => { setData(d); setLoading(false); });
  }, []);

  const updateHotends = useCallback((hotends) => {
    const next = { ...data, hotends };
    setData(next);
    saveInv(next);
  }, [data]);

  const updateFilaments = useCallback((filaments) => {
    const next = { ...data, filaments };
    setData(next);
    saveInv(next);
  }, [data]);

  const TABS = [
    { id: "hotends",   icon: "🔩", label: t("inv.tab.hotends"),   count: data.hotends.length },
    { id: "filaments", icon: "🧵", label: t("inv.tab.filaments"), count: data.filaments.length },
  ];

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 13 }}>
        {t("inv.loading")}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: T.surface, borderRadius: 10, padding: 4, width: "fit-content", border: `1px solid ${T.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700,
            background: tab === t.id ? T.card : "transparent",
            border: tab === t.id ? `1px solid ${T.border}` : "1px solid transparent",
            color: tab === t.id ? T.text : T.dim,
            display: "flex", alignItems: "center", gap: 7,
            boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
            transition: "all 0.15s",
          }}>
            {t.icon} {t.label}
            <span style={{
              padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 800,
              background: tab === t.id ? T.accentLo : T.overlay2,
              color: tab === t.id ? "#7182d6" : T.dim,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "hotends"
        ? <HotendsTab  hotends={data.hotends}    onSave={updateHotends} />
        : <FilamentsTab filaments={data.filaments} onSave={updateFilaments} />
      }
    </div>
  );
}
