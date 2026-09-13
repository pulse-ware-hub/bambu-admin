/**
 * PrinterPage — monitoring Bambu Lab via MQTT local direct
 *
 * Le plugin Vite (bambuMqttPlugin) maintient une connexion MQTT persistante
 * vers l'imprimante (mqtts://<ip>:8883, user=bblp, pass=accessCode).
 * Cette page poll /api/printer-status toutes les 2 s et affiche l'état.
 *
 * Protocole MQTT : OpenBambuAPI / admin/main/src/printer_client.cpp
 *   Topic reçu   : device/{serial}/report
 *   Topic envoyé : device/{serial}/request
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "./tokens.js";
import PRINTER_MODELS from "./data/printer-models.json";
import { useLanguage } from "./LanguageContext.jsx";

// ── API ───────────────────────────────────────────────────────
async function fetchPrinters()        { const r = await fetch("/api/printers"); return r.json(); }
async function createPrinter(data)    {
  const r = await fetch("/api/printers", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  return r.json();
}
async function updatePrinter(id, data) {
  const r = await fetch(`/api/printers/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  return r.json();
}
async function deletePrinter(id) {
  await fetch(`/api/printers/${id}`, { method: "DELETE" });
}
async function fetchStatus(id) { const r = await fetch(`/api/printer-status/${id}`); return r.json(); }
async function sendCmd(id, command) {
  const r = await fetch(`/api/printer-command/${id}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }),
  });
  return r.json();
}

// ── Labels / colors ───────────────────────────────────────────
const LIFECYCLE_COLOR = {
  IDLE: "#64748b", PREPARE: "#8b5cf6", RUNNING: "#10b981",
  PAUSE: "#fbbf24", FINISH: "#06b6d4", FAILED: "#ef4444", SLICING: "#6366f1",
}
const LIFECYCLE_KEYS = Object.keys(LIFECYCLE_COLOR);

function lifecycleColor(lc) { return LIFECYCLE_COLOR[lc] ?? T.dim }
function lifecycleLabel(lc, t) {
  if (lc && LIFECYCLE_KEYS.includes(lc)) return t(`printer.lifecycle.${lc}`);
  return lc || t("printer.lifecycle.unknown");
}
function speedLabel(level, t) { return t(`printer.speed.${level}`) }

function fmtRemaining(min) {
  if (min == null || min <= 0) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function fmtTemp(v) { return v != null ? `${Math.round(v * 10) / 10}°C` : "—"; }

function tempColor(cur, target) {
  if (cur == null || target == null || target <= 0) return T.text;
  const diff = cur - target;
  if (Math.abs(diff) <= 5) return "#10b981";
  if (diff < 0) return "#f97316";
  return "#60a5fa";
}

function signalLabel(rssi, t) {
  if (rssi == null) return null;
  if (rssi > -50) return t("printer.signal.excellent");
  if (rssi > -65) return t("printer.signal.good");
  if (rssi > -80) return t("printer.signal.weak");
  return t("printer.signal.bad");
}

// ── UI primitives ─────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{children}</div>;
}

function Pill({ color, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: (color || T.dim) + "18", border: `1px solid ${color || T.dim}40`, color: color || T.dim,
    }}>{children}</span>
  );
}

function ConnDot({ status }) {
  const color = status === "connected" ? "#10b981" : status === "connecting" ? "#fbbf24" : status === "error" ? "#ef4444" : "#475569";
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, background: color, boxShadow: status === "connected" ? `0 0 8px ${color}` : "none", flexShrink: 0 }} />;
}

function Switch({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <span style={{
        position: "relative", width: 38, height: 22, borderRadius: 20, flexShrink: 0,
        background: checked ? T.accent : T.overlay2,
        border: `1px solid ${checked ? T.accentBd : T.border}`,
        transition: "background 0.15s",
      }} onClick={() => onChange(!checked)}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }} />
      </span>
      {label && <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{label}</span>}
    </label>
  );
}

// ── Config panel ──────────────────────────────────────────────
function ConfigPanel({ cfg, onSaved, onCancel }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    ip: cfg?.ip || "", serial: cfg?.serial || "", accessCode: cfg?.accessCode || "",
    name: cfg?.name || "Bambu H2C", model: cfg?.model || "", vertex: !!cfg?.vertex,
  });
  const [saving, setSaving] = useState(false);
  const isNew = !cfg?.id;

  const save = async () => {
    setSaving(true);
    const saved = isNew ? await createPrinter(form) : await updatePrinter(cfg.id, form);
    setSaving(false);
    onSaved(saved);
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const selectModel = (modelName) => {
    const model = PRINTER_MODELS.find(m => m.name === modelName);
    setForm(p => ({
      ...p,
      model: modelName,
      name: (!p.name || PRINTER_MODELS.some(m => m.name === p.name) || p.name === "Bambu H2C") ? modelName : p.name,
      vertex: model?.factoryUpgrade === "vortek" ? true : p.vertex,
    }));
  };

  const seriesOrder = [...new Set(PRINTER_MODELS.map(m => m.series))];

  const selectedModel = PRINTER_MODELS.find(m => m.name === form.model);
  const vertexFactory  = selectedModel?.factoryUpgrade === "vortek";
  const vertexOptional = selectedModel?.optionalUpgrade === "vortek_upgrade_kit_possible";
  const showVertexToggle = vertexFactory || vertexOptional;

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, fontSize: 13,
    background: T.surface, border: `1px solid ${T.border}`, color: T.text, outline: "none",
  };

  return (
    <Card>
      <SectionTitle>{isNew ? t("printer.config.new") : t("printer.config.edit")}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("printer.config.model")}</div>
          <select
            value={form.model}
            onChange={e => selectModel(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t("printer.config.selectModel")}</option>
            {seriesOrder.map(series => (
              <optgroup key={series} label={series}>
                {PRINTER_MODELS.filter(m => m.series === series).map(m => (
                  <option key={m.name} value={m.name}>
                    {m.name}{m.factoryUpgrade === "vortek" ? " (Vertex)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("printer.config.ip")}</div>
          <input {...f("ip")} placeholder="192.168.1...." style={{ ...inputStyle, fontFamily: "monospace" }} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("printer.config.serial")}</div>
          <input {...f("serial")} placeholder="01S00C123456789" style={{ ...inputStyle, fontFamily: "monospace" }} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("printer.config.accessCode")}</div>
          <input {...f("accessCode")} placeholder="12345678" type="password" style={{ ...inputStyle, fontFamily: "monospace" }} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("printer.config.displayName")}</div>
          <input {...f("name")} placeholder="Bambu Lab" style={inputStyle} />
        </div>
      </div>
      {showVertexToggle && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <Switch
            checked={form.vertex}
            onChange={v => !vertexFactory && setForm(p => ({ ...p, vertex: v }))}
            label={vertexFactory
              ? t("printer.config.vertexFactory")
              : t("printer.config.vertexOptional")}
          />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        {onCancel && (
          <button onClick={onCancel} style={{
            padding: "7px 18px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
            background: T.overlay1, border: `1px solid ${T.border}`, color: T.muted,
          }}>{t("printer.config.cancel")}</button>
        )}
        <button onClick={save} disabled={saving} style={{
          padding: "7px 18px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
          background: T.accentLo, border: `1px solid ${T.accentBd}`, color: "#7182d6",
          opacity: saving ? 0.6 : 1,
        }}>{saving ? t("printer.config.saving") : t("printer.config.save")}</button>
      </div>
    </Card>
  );
}

// ── Temperature card ──────────────────────────────────────────
function TempCard({ label, icon, current, target }) {
  const color = tempColor(current, target);
  const pct = (current != null && target != null && target > 0)
    ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "13px 15px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {icon} {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
          {current != null ? `${Math.round(current)}°` : "—"}
        </span>
        {target != null && target > 0 && (
          <span style={{ fontSize: 12, color: T.dim }}>/ {Math.round(target)}°C</span>
        )}
      </div>
      {target != null && target > 0 && (
        <div style={{ height: 3, borderRadius: 2, background: T.overlay2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.5s" }} />
        </div>
      )}
    </div>
  );
}

// ── Progress card ─────────────────────────────────────────────
function ProgressCard({ progress, remainingMinutes, layer, totalLayers, lifecycle }) {
  const { t } = useLanguage();
  const lc    = lifecycleColor(lifecycle);
  const pct   = Math.round(progress || 0);
  const rem   = fmtRemaining(remainingMinutes);
  const active = lifecycle === "RUNNING" || lifecycle === "PREPARE";

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <SectionTitle>{t("printer.progress.title")}</SectionTitle>
        <Pill color={lc}>{lifecycleLabel(lifecycle, t)}</Pill>
      </div>

      {/* Big percentage */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 42, fontWeight: 900, color: lc, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {pct}
        </span>
        <span style={{ fontSize: 20, color: T.muted, fontWeight: 700 }}>%</span>
        {rem && active && <span style={{ fontSize: 13, color: T.muted, marginLeft: 8 }}>— {rem} {t("printer.progress.remaining")}</span>}
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 4, background: T.overlay2, overflow: "hidden", marginBottom: 10 }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${lc}bb, ${lc})`,
          transition: "width 1s ease",
        }} />
      </div>

      {/* Layers */}
      {(layer != null || totalLayers != null) && (
        <div style={{ fontSize: 12, color: T.muted }}>
          {t("printer.progress.layer")}{" "}
          <span style={{ fontWeight: 700, color: T.text }}>{layer ?? "—"}</span>
          {totalLayers ? ` / ${totalLayers}` : ""}
        </div>
      )}
    </Card>
  );
}

// ── AMS tray ─────────────────────────────────────────────────
function AmsTray({ tray, active }) {
  if (!tray.present) {
    return (
      <div style={{
        border: `1px dashed ${T.border}`, borderRadius: 8, padding: "10px 8px",
        textAlign: "center", fontSize: 11, color: T.dim,
      }}>—</div>
    );
  }
  return (
    <div style={{
      border: `2px solid ${active ? (tray.color || T.accent) : T.border}`,
      borderRadius: 8, padding: "10px 8px", textAlign: "center",
      background: tray.color ? tray.color + "10" : T.surface,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, margin: "0 auto 6px",
        background: tray.color || "#64748b",
        boxShadow: active ? `0 0 10px ${tray.color || "#64748b"}` : "none",
      }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
        {tray.name || tray.material || "—"}
      </div>
      {tray.remain >= 0 && (
        <>
          <div style={{ fontSize: 9, color: T.dim, marginTop: 4 }}>{tray.remain}%</div>
          <div style={{ height: 2, borderRadius: 1, background: T.overlay2, marginTop: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 1,
              width: `${tray.remain}%`,
              background: tray.remain > 20 ? "#10b981" : "#ef4444",
            }} />
          </div>
        </>
      )}
    </div>
  );
}

function AmsSection({ ams, vtTray }) {
  const { t } = useLanguage();
  if (!ams && !vtTray) return null;
  return (
    <Card>
      <SectionTitle>{t("printer.ams.title")}</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(ams?.units || []).map(unit => (
          <div key={unit.id}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6 }}>
              AMS {Number(unit.id) + 1}
              {unit.humidity != null && <span style={{ color: T.dim, marginLeft: 8 }}>💧 {t("printer.ams.humidity")}{unit.humidity}</span>}
              {unit.temp != null && <span style={{ color: T.dim, marginLeft: 8 }}>🌡 {fmtTemp(unit.temp)}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
              {unit.trays.map((tray, i) => (
                <AmsTray key={i} tray={tray} active={ams.trayNow === tray.id} />
              ))}
            </div>
          </div>
        ))}
        {vtTray && vtTray.present && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6 }}>{t("printer.ams.external")}</div>
            <div style={{ maxWidth: 80 }}>
              <AmsTray tray={vtTray} active={false} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── HMS alerts ────────────────────────────────────────────────
function HmsAlerts({ hms }) {
  const { t } = useLanguage();
  if (!hms || hms.length === 0) return null;
  return (
    <Card style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.05)" }}>
      <SectionTitle>⚠ {t("printer.hms.title")} ({hms.length})</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {hms.map((h, i) => (
          <div key={i} style={{
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            fontSize: 12, color: "#fa8989",
          }}>
            {t("printer.hms.code")} <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
              {h.attr ? `0x${Number(h.attr).toString(16).toUpperCase()} / 0x${Number(h.code).toString(16).toUpperCase()}` : JSON.stringify(h)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Print controls ────────────────────────────────────────────
function PrintControls({ lifecycle, onCmd }) {
  const { t } = useLanguage();
  const active = lifecycle === "RUNNING" || lifecycle === "PAUSE";
  if (!active) return null;

  const isPrinting = lifecycle === "RUNNING";
  const isPaused   = lifecycle === "PAUSE";

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {isPrinting && (
        <button onClick={() => onCmd("pause")} style={{
          padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
          background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24",
        }}>{t("printer.controls.pause")}</button>
      )}
      {isPaused && (
        <button onClick={() => onCmd("resume")} style={{
          padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
          background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", color: "#10b981",
        }}>{t("printer.controls.resume")}</button>
      )}
      <button onClick={() => onCmd("stop")} style={{
        padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
        background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#f87171",
      }}>{t("printer.controls.stop")}</button>
    </div>
  );
}

// ── Printer tabs ─────────────────────────────────────────────
function PrinterTabs({ printers, activeId, onSelect, onAdd }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {printers.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20, cursor: "pointer",
          fontSize: 12, fontWeight: 700,
          background: activeId === p.id ? T.accentLo : T.overlay1,
          border: `1px solid ${activeId === p.id ? T.accentBd : T.border}`,
          color: activeId === p.id ? "#7182d6" : T.muted,
        }}>
          🖨️ {p.name || t("printer.tabs.noName")}
          {p.vertex && <span title="Vertex" style={{ fontSize: 10 }}>🔺</span>}
        </button>
      ))}
      <button onClick={onAdd} style={{
        padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 700,
        background: T.overlay2, border: `1px dashed ${T.border}`, color: T.muted,
      }}>{t("printer.tabs.add")}</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export default function PrinterPage() {
  const { t } = useLanguage();
  const [printers,   setPrinters]  = useState([]);
  const [activeId,   setActiveId]  = useState(null);
  const [status,     setStatus]    = useState(null);
  const [showConfig, setShowConfig]= useState(false);
  const [addingNew,  setAddingNew] = useState(false);
  const [cmdFeedback,setCmdFbk]    = useState(null);
  const intervalRef = useRef(null);

  const loadPrinters = useCallback(async () => {
    const list = await fetchPrinters();
    setPrinters(list);
    setActiveId(prev => (prev && list.some(p => p.id === prev)) ? prev : (list[0]?.id || null));
    if (list.length === 0) setShowConfig(true);
    return list;
  }, []);

  useEffect(() => { loadPrinters(); }, [loadPrinters]);

  const poll = useCallback(async () => {
    if (!activeId) { setStatus(null); return; }
    try { setStatus(await fetchStatus(activeId)); } catch {}
  }, [activeId]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(intervalRef.current);
  }, [poll]);

  const handleCmd = async (command) => {
    if (!activeId) return;
    const r = await sendCmd(activeId, command);
    setCmdFbk(r.ok ? `${command} ${t("printer.cmd.sent")}` : (r.error || t("printer.cmd.error")));
    setTimeout(() => setCmdFbk(null), 3000);
  };

  const handleSaved = async (saved) => {
    await loadPrinters();
    setActiveId(saved.id);
    setShowConfig(false);
    setAddingNew(false);
  };

  const handleDelete = async () => {
    if (!activeId) return;
    await deletePrinter(activeId);
    setShowConfig(false);
    await loadPrinters();
  };

  const cfg = printers.find(p => p.id === activeId) || null;
  const s = status;
  const cs = s?.connectionStatus;
  const connLabel = cs === "connected" ? t("printer.conn.connected") : cs === "connecting" ? t("printer.conn.connecting") : cs === "error" ? t("printer.conn.error") : t("printer.conn.disconnected");

  const printing = s?.lifecycle === "RUNNING";
  const hasTemps = s?.nozzleTemp != null || s?.bedTemp != null || s?.chamberTemp != null;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Onglets imprimantes ── */}
      <PrinterTabs
        printers={printers}
        activeId={activeId}
        onSelect={id => { setActiveId(id); setShowConfig(false); setAddingNew(false); }}
        onAdd={() => { setAddingNew(true); setShowConfig(true); }}
      />

      {/* ── Header ── */}
      {cfg && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>
                {cfg.name || t("printer.header.defaultName")}
              </div>
              {cfg.model && <Pill color={T.dim}>{cfg.model}</Pill>}
              {cfg.vertex && <Pill color="#8b5cf6">🔺 Vertex</Pill>}
            </div>
            {cfg.ip && (
              <div style={{ fontSize: 11, color: T.dim, fontFamily: "monospace", marginTop: 2 }}>
                {cfg.ip}
                {cfg.serial && <span style={{ marginLeft: 8 }}>· {cfg.serial}</span>}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {s && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ConnDot status={cs} />
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{connLabel}</span>
              </div>
            )}
            {s?.lifecycle && <Pill color={lifecycleColor(s.lifecycle)}>{lifecycleLabel(s.lifecycle, t)}</Pill>}
            {s?.speedLevel && <span style={{ fontSize: 12, color: T.dim }}>{speedLabel(s.speedLevel, t)}</span>}
            {s?.wifiSignal != null && (
              <span style={{ fontSize: 11, color: T.dim }}>📶 {signalLabel(s.wifiSignal, t)} ({s.wifiSignal} dBm)</span>
            )}
            {cmdFeedback && (
              <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>✓ {cmdFeedback}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <PrintControls lifecycle={s?.lifecycle} onCmd={handleCmd} />
            <button onClick={() => sendCmd(activeId, "pushall").then(poll)} style={{
              padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 20,
              background: T.overlay2, border: `1px solid ${T.border}`, color: T.muted,
            }}>↻</button>
            <button onClick={() => { setAddingNew(false); setShowConfig(v => !v); }} style={{
              padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 20, fontWeight: 600,
              background: showConfig && !addingNew ? T.accentLo : T.overlay2,
              border: `1px solid ${showConfig && !addingNew ? T.accentBd : T.border}`,
              color: showConfig && !addingNew ? "#7182d6" : T.muted,
            }}>⚙</button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {s?.error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 12, color: "#f87171" }}>
          ⚠ {s.error}
        </div>
      )}

      {/* ── Config ── */}
      {showConfig && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ConfigPanel
            cfg={addingNew ? null : cfg}
            onSaved={handleSaved}
            onCancel={printers.length > 0 ? () => { setShowConfig(false); setAddingNew(false); } : undefined}
          />
          {!addingNew && cfg && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleDelete} style={{
                padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#f87171",
              }}>{t("printer.config.delete")}</button>
            </div>
          )}
        </div>
      )}

      {/* ── No config ── */}
      {printers.length === 0 && !showConfig && (
        <div style={{ textAlign: "center", padding: "56px 0", color: T.dim }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖨️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("printer.empty.title")}</div>
          <div style={{ fontSize: 12 }}>{t("printer.empty.desc")}</div>
        </div>
      )}

      {/* ── HMS alerts ── */}
      {s?.hms?.length > 0 && <HmsAlerts hms={s.hms} />}

      {/* ── Progress + job name ── */}
      {s && cfg?.ip && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          {s.jobName && (
            <div style={{
              padding: "10px 16px", borderRadius: 10,
              background: T.accentLo, border: `1px solid ${T.accentBd}`,
              fontSize: 14, fontWeight: 700, color: "#7182d6",
            }}>
              🗂 {s.jobName}
            </div>
          )}

          {(printing || s.lifecycle === "PAUSE" || s.progress > 0) && (
            <ProgressCard
              progress={s.progress}
              remainingMinutes={s.remainingMinutes}
              layer={s.layer}
              totalLayers={s.totalLayers}
              lifecycle={s.lifecycle}
            />
          )}
        </div>
      )}

      {/* ── Temperatures ── */}
      {hasTemps && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
          {s.nozzleTemp != null && (
            <TempCard label={t("printer.temp.nozzle")} icon="" current={s.nozzleTemp} target={s.nozzleTarget} />
          )}
          {s.bedTemp != null && (
            <TempCard label={t("printer.temp.plate")} icon="" current={s.bedTemp} target={s.bedTarget} />
          )}
          {s.chamberTemp != null && (
            <TempCard label={t("printer.temp.chamber")} icon="" current={s.chamberTemp} target={null} />
          )}
        </div>
      )}

      {/* ── AMS ── */}
      {(s?.ams || s?.vtTray) && <AmsSection ams={s.ams} vtTray={s.vtTray} />}

      {/* ── Idle state ── */}
      {s && cfg?.ip && cs === "connected" && !s.jobName && !printing && s.lifecycle === "IDLE" && (
        <div style={{ textAlign: "center", padding: "32px 0", color: T.dim, fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          {t("printer.idle")}
        </div>
      )}

      {s && cfg && (
        <div style={{ fontSize: 10, color: T.dim, paddingBottom: 4 }}>
          {t("printer.footer.mqtt")} {cfg.name}
          {s.lastUpdate && ` · ${t("printer.footer.updated")} ${new Date(s.lastUpdate).toLocaleTimeString(t("printer.locale"))}`}
        </div>
      )}
    </div>
  );
}
