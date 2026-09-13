// ─── GLOBAL STORAGE (localStorage) ───────────────────────────
const KEY = "bambu_admin_global";

/** Génère un numéro à 6 chiffres unique (format 000000–999999) */
export function genId() {
  const db = loadGlobal();
  const used = new Set([
    ...db.devis.map(d => d.numero),
  ]);
  let n;
  do {
    n = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  } while (used.has(n));
  return n;
}

export function loadGlobal() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { devis: [] };
  } catch {
    return { devis: [] };
  }
}

export function saveGlobal(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// ── Devis ──────────────────────────────────────────────────────

/** Sauvegarde ou écrase un devis (même id = révision) */
export function upsertDevis(entry) {
  const db = loadGlobal();
  const idx = db.devis.findIndex(d => d.id === entry.id);
  if (idx >= 0) {
    db.devis[idx] = { ...db.devis[idx], ...entry };
  } else {
    db.devis.unshift(entry);
  }
  saveGlobal(db);
}

/** Supprime un devis par id */
export function deleteDevis(id) {
  const db = loadGlobal();
  db.devis = db.devis.filter(d => d.id !== id);
  saveGlobal(db);
}

/** Patch partiel d'un devis */
export function patchDevis(id, patch) {
  const db = loadGlobal();
  db.devis = db.devis.map(d => d.id === id ? { ...d, ...patch } : d);
  saveGlobal(db);
}

/** Export JSON global */
export function exportGlobalJSON() {
  const db = loadGlobal();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "global.json";
  a.click();
  URL.revokeObjectURL(url);
}
