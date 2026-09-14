import { useState, useEffect, useCallback } from "react";
import { T } from "./tokens.js";
import { HOTENDS } from "./data/hotends.js";
import { FILAMENTS } from "./data/filaments.js";
import { HOTEND_COLORS, NOZZLE_SIZES } from "./data/hotend-colors.js";
import PRINTER_MODELS from "./data/printer-models.json";
import { useLanguage } from "./LanguageContext.jsx";

// ── API ───────────────────────────────────────────────────────
async function loadPrinters() {
  try {
    const res = await fetch("/api/printers");
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

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

function Sel({ value, onChange, children, disabled = false }) {
  return (
    <select value={value ?? ""} onChange={e => onChange(e.target.value)} disabled={disabled} style={{
      padding: "8px 10px", borderRadius: 8, fontSize: 13,
      background: T.surface, border: `1px solid ${T.border}`,
      color: T.text, outline: "none", cursor: disabled ? "not-allowed" : "pointer", width: "100%",
      opacity: disabled ? 0.6 : 1,
    }}>
      {children}
    </select>
  );
}

function ColorSwatchPicker({ value, onChange, lang }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {HOTEND_COLORS.map(c => {
        const selected = (value || "").toLowerCase() === c.hex.toLowerCase();
        return (
          <button
            key={c.id} type="button" onClick={() => onChange(c.hex)}
            title={c.label[lang] || c.label.fr}
            style={{
              width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
              background: c.hex, border: selected ? `2px solid ${T.text}` : `1px solid ${T.border}`,
              boxShadow: selected ? `0 0 0 2px ${c.hex}55` : "none",
              padding: 0,
            }}
          />
        );
      })}
    </div>
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
function printerKind(printer) {
  const model = PRINTER_MODELS.find(m => m.name === printer.model);
  if (!model) return null;
  if (model.nozzle === "single_nozzle") return "single";
  // Le kit Vortek est de série sur certains modèles (H2D/H2C) — dans ce cas
  // il est toujours actif, indépendamment du flag "vertex" enregistré (qui ne
  // reflète que le kit optionnel, ex. X2D).
  const hasVortex = model.factoryUpgrade === "vortek" || !!printer.vertex;
  return hasVortex ? "vortex" : "dual";
}

function slotsForKind(kind, t) {
  if (kind === "single") {
    return [{ key: "single", label: t("inv.hotend.slotSingle"), desc: t("inv.hotend.slotSingleDesc"), icon: "●" }];
  }
  const left = { key: "left", label: t("inv.hotend.slotLeft"), desc: t("inv.hotend.slotLeftDesc"), icon: "◀" };
  if (kind === "dual") {
    return [left, { key: "right", label: t("inv.hotend.slotRight"), desc: t("inv.hotend.slotRightDesc"), icon: "▶" }];
  }
  if (kind === "vortex") {
    const vortexSlots = Array.from({ length: 6 }, (_, i) => ({
      key: `vortex${i + 1}`,
      label: `${t("inv.hotend.slotVortexPrefix")} ${i + 1}`,
      desc: "",
      icon: "V",
    }));
    return [left, ...vortexSlots];
  }
  return [];
}

function locationLabel(h, printers, t) {
  if (!h.location || h.location === "stock") return t("inv.hotend.locStock");
  const printer = printers.find(p => p.id === h.printerId);
  const printerName = printer?.name || printer?.model || "?";
  let slotLabel;
  if (h.location === "left") slotLabel = t("inv.hotend.locLeft");
  else if (h.location === "right") slotLabel = t("inv.hotend.locRight");
  else if (h.location === "single") slotLabel = t("inv.hotend.locSingle");
  else if (h.location.startsWith("vortex")) slotLabel = `${t("inv.hotend.locVortek")} ${h.location.slice(6)}`;
  else slotLabel = h.location;
  return `${printerName} · ${slotLabel}`;
}

function HotendsTab({ hotends, onSave }) {
  const { t, lang } = useLanguage();
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]     = useState({});
  const [printers, setPrinters] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadPrinters().then(list => { if (!cancelled) setPrinters(list); });
    return () => { cancelled = true; };
  }, []);

  // Migration des anciennes entrées ("vortek"/"left" sans printerId) vers le nouveau modèle multi-imprimantes.
  useEffect(() => {
    if (printers.length === 0) return;
    const needsMigration = hotends.some(h =>
      h.location === "vortek" || (h.location && h.location !== "stock" && h.printerId == null)
    );
    if (!needsMigration) return;
    const defaultPrinterId = printers[0].id;
    const migrated = hotends.map(h => {
      if (h.location === "vortek") return { ...h, location: "vortex1", printerId: h.printerId || defaultPrinterId };
      if (h.location && h.location !== "stock" && h.printerId == null) return { ...h, printerId: defaultPrinterId };
      return h;
    });
    onSave(migrated);
  }, [printers, hotends]);

  // Backfill du champ "side" (gauche/droite) sur les anciennes entrées à partir du catalogue.
  useEffect(() => {
    const needsSide = hotends.some(h => h.side == null && HOTENDS.some(c => c.id === h.catalogId));
    if (!needsSide) return;
    const updated = hotends.map(h => {
      if (h.side != null) return h;
      const cat = HOTENDS.find(c => c.id === h.catalogId);
      return cat ? { ...h, side: cat.side } : h;
    });
    onSave(updated);
  }, [hotends]);

  const inStock = hotends.filter(h => h.location === "stock" || !h.location);
  const inStockForSlot = (slotKey) => {
    if (slotKey === "single") return inStock;
    const side = slotKey === "left" ? "left" : "right";
    return inStock.filter(h => !h.side || h.side === side);
  };

  const assignSlot = (id, printerId, slotKey) => {
    const updated = hotends.map(h => {
      if (h.id === id) return { ...h, printerId, location: slotKey };
      if (slotKey !== "stock" && h.printerId === printerId && h.location === slotKey) return { ...h, printerId: undefined, location: "stock" };
      return h;
    });
    onSave(updated);
  };
  const removeFromSlot = (id) => assignSlot(id, undefined, "stock");

  const openAdd = () => {
    const cat = HOTENDS[0];
    setForm({ catalogId: cat.id, name: cat.name[lang], color: cat.color, side: cat.side, size: NOZZLE_SIZES[1], notes: "" });
    setModal({ mode: "add" });
  };

  const openEdit = (item) => { setForm({ ...item }); setModal({ mode: "edit", id: item.id }); };

  const handleSave = () => {
    const cat = HOTENDS.find(h => h.id === form.catalogId);
    const entry = {
      id:        modal.mode === "edit" ? modal.id : uid(),
      catalogId: form.catalogId || "custom",
      name:      form.name  || cat?.name?.[lang]  || "Hotend",
      color:     form.color || cat?.color || HOTEND_COLORS[0].hex,
      side:      form.side  || cat?.side  || "right",
      size:      form.size  || NOZZLE_SIZES[1],
      notes:     form.notes || "",
      printerId: modal.mode === "edit" ? form.printerId : undefined,
      location:  modal.mode === "edit" ? form.location  : "stock",
    };
    const updated = modal.mode === "edit"
      ? hotends.map(h => h.id === entry.id ? entry : h)
      : [...hotends, entry];
    onSave(updated);
    setModal(null);
  };

  const handleDelete = (id) => { onSave(hotends.filter(h => h.id !== id)); setConfirm(null); };
  const handleDuplicate = (item) => {
    const copy = { ...item, id: uid(), printerId: undefined, location: "stock" };
    onSave([...hotends, copy]);
  };
  const catForForm = HOTENDS.find(h => h.id === form.catalogId);

  const knownPrinters = printers
    .map(p => ({ printer: p, kind: printerKind(p) }))
    .filter(x => x.kind);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Config des imprimantes connues ── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 14 }}>
          {t("inv.hotend.configTitle")}
        </div>

        {knownPrinters.length === 0 ? (
          <div style={{ fontSize: 12, color: T.dim, fontStyle: "italic" }}>{t("inv.hotend.configEmpty")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {knownPrinters.map(({ printer, kind }) => (
              <div key={printer.id}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                  🖨️ {printer.name || printer.model}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                  {slotsForKind(kind, t).map(slot => {
                    const installed = hotends.find(h => h.printerId === printer.id && h.location === slot.key);
                    return (
                      <div key={slot.key} style={{
                        border: `2px solid ${installed ? installed.color + "80" : T.border}`,
                        borderRadius: 10, padding: "12px 14px",
                        background: installed ? installed.color + "0c" : T.surface,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: installed ? installed.color + "22" : T.overlay2,
                            border: `1px solid ${installed ? installed.color + "50" : T.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800,
                            color: installed ? installed.color : T.dim,
                            flexShrink: 0,
                          }}>{slot.icon}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{slot.label}</div>
                            {slot.desc && <div style={{ fontSize: 9, color: T.dim }}>{slot.desc}</div>}
                          </div>
                        </div>

                        {installed ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 9, height: 9, borderRadius: 3, background: installed.color, flexShrink: 0 }} />
                              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{installed.name}</div>
                            </div>
                            {installed.size && <div style={{ fontSize: 10, color: T.dim }}>{installed.size}</div>}
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              <button onClick={() => openEdit(installed)} style={{
                                padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 600,
                                background: T.accentLo, border: `1px solid ${T.accentBd}`, color: "#7182d6",
                              }}>{t("inv.hotend.modify")}</button>
                              <button onClick={() => removeFromSlot(installed.id)} style={{
                                padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 600,
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171",
                              }}>{t("inv.hotend.remove")}</button>
                            </div>
                          </div>
                        ) : (() => {
                          const slotStock = inStockForSlot(slot.key);
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                              <div style={{ fontSize: 11, color: T.dim }}>{t("inv.hotend.none")}</div>
                              {slotStock.length > 0 ? (
                                <select
                                  key={slotStock.map(h => h.id).join(",")}
                                  defaultValue=""
                                  onChange={e => { if (e.target.value) assignSlot(e.target.value, printer.id, slot.key); }}
                                  style={{
                                    padding: "5px 6px", borderRadius: 7, fontSize: 10, cursor: "pointer",
                                    background: T.surface, border: `1px solid ${T.border}`, color: T.muted, outline: "none",
                                  }}
                                >
                                  <option value="">{t("inv.hotend.installFromStock")}</option>
                                  {slotStock.map(h => <option key={h.id} value={h.id}>{h.name}{h.size ? ` · ${h.size}` : ""}</option>)}
                                </select>
                              ) : (
                                <div style={{ fontSize: 10, color: T.dim, fontStyle: "italic" }}>{t("inv.hotend.noStock")}</div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
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
            const installed = h.location && h.location !== "stock";
            const badgeColor = installed ? "#6366f1" : T.dim;
            return (
              <div key={h.id} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: "11px 14px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: h.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.name}{h.size ? ` · ${h.size}` : ""}
                  </div>
                  {h.notes && <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{h.notes}</div>}
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0,
                  background: badgeColor + "15", border: `1px solid ${badgeColor}35`, color: badgeColor,
                  whiteSpace: "nowrap",
                }}>{locationLabel(h, printers, t)}</span>
                <button onClick={() => handleDuplicate(h)} title={t("inv.hotend.duplicate")} style={{
                  width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                  background: T.accentLo, border: `1px solid ${T.accentBd}`,
                  color: "#7182d6", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                }}>📋</button>
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
              setForm(f => ({ ...f, catalogId: v, name: cat?.name?.[lang] || f.name, color: cat?.color || f.color, side: cat?.side || f.side }));
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
              <ColorSwatchPicker value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} lang={lang} />
            </Field>
            <Field label={t("inv.field.size")}>
              <Sel value={form.size} onChange={v => setForm(f => ({ ...f, size: v }))}>
                {NOZZLE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </Sel>
            </Field>
          </div>
          <Field label={t("inv.field.side")}>
            <Sel value={form.side || "right"} onChange={v => setForm(f => ({ ...f, side: v }))} disabled={form.catalogId !== "custom"}>
              <option value="left">{t("inv.hotend.locLeft")}</option>
              <option value="right">{t("inv.hotend.locRight")}</option>
            </Sel>
          </Field>
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

const HUMIDITY_GUIDE = [
  { id: "PLA",   rh: "15–25%", color: "#4ade80" },
  { id: "ABS",   rh: "15–25%", color: "#fbbf24" },
  { id: "PETG",  rh: "10–15%", color: "#60a5fa" },
  { id: "TPU",   rh: "10–15%", color: "#34d399" },
  { id: "Nylon", rh: "10–15%", color: "#e879f9" },
  { id: "PC",    rh: "10–15%", color: "#a78bfa" },
];

function SpoolIcon({ color }) {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="15" stroke={color} strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="17" cy="17" r="10" stroke={color} strokeWidth="6" />
      <circle cx="17" cy="17" r="3" fill={color} />
    </svg>
  );
}

function HumidityArc({ color }) {
  return (
    <svg width="64" height="34" viewBox="0 0 64 34" fill="none">
      <path d="M4 32 A28 28 0 0 1 60 32" stroke={color} strokeOpacity="0.18" strokeWidth="5" strokeLinecap="round" />
      <path d="M4 32 A28 28 0 0 1 60 32" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function HumidityCard({ id, rh, color }) {
  return (
    <div style={{
      border: `1px solid ${color}35`, borderRadius: 10, padding: "10px 8px",
      background: `${color}0c`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.text, letterSpacing: "0.03em" }}>{id}</div>
      <HumidityArc color={color} />
      <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: -2 }}>{rh}</div>
      <div style={{ fontSize: 9, color: T.dim, letterSpacing: "0.1em" }}>RH</div>
    </div>
  );
}

function HumidityGuide() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8 }}>
      {HUMIDITY_GUIDE.map(m => <HumidityCard key={m.id} {...m} />)}
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
    <div style={{ background: "none", border: `none`, padding: "0px 0px", display: "flex", flexDirection: "column", gap: 12 }}>
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
  const [showHumidityGuide, setShowHumidityGuide] = useState(false);
  const [showPrinters, setShowPrinters] = useState(false);

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

      {/* ── Guide humidité ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowHumidityGuide(v => !v)} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
          background: showHumidityGuide ? T.accentLo : "rgba(255,255,255,0.02)",
          border: `1px solid ${showHumidityGuide ? T.accentBd : T.border}`,
          color: showHumidityGuide ? "#7182d6" : T.muted,
        }}>💧 {t("inv.fil.humidityGuide")}</button>
      </div>
      {showHumidityGuide && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <HumidityGuide />
          <div style={{ fontSize: 10, color: T.dim }}>{t("inv.fil.humidityGuideNote")}</div>
        </div>
      )}

      {/* ── AMS imprimantes (live, lecture seule) ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowPrinters(v => !v)} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
          background: showPrinters ? T.accentLo : "rgba(255,255,255,0.02)",
          border: `1px solid ${showPrinters ? T.accentBd : T.border}`,
          color: showPrinters ? "#7182d6" : T.muted,
        }}>🖨️ {t("inv.fil.printersTitle")}</button>
      </div>
      {showPrinters && <PrintersAmsOverview />}

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
