# Bambu Admin

Admin dashboard for a small 3D-printing workshop running Bambu Lab printers (all series). It combines live printer monitoring, a filament/hotend compatibility advisor, quoting & invoicing, and inventory tracking in a single local app. Available in French and English (toggle in the top bar).

Using Vortek and dual-nozzle hotends unlocks multi-material printing but adds real print compatibility constraints — which hotend side a filament must use, whether the chamber needs to be closed, which materials can't be mixed in the same job. Getting these wrong wastes filament and print time. The built-in filament/hotend advisor exists to catch these mistakes before you hit print.

## Features

- **Printer** — Add as many Bambu Lab printers as you run and switch between them via tabs to follow each one's live activity over local MQTT (`mqtts://`, LAN mode): print progress, temperatures, AMS spools, HMS alerts, pause/resume/stop controls. Each printer keeps its own model, enclosure/nozzle characteristics and Vertex (dual Vortek hotend) flag.
- **Filaments** — Advisor that recommends filaments based on environment, use case and nozzle, with full print settings, warnings, and Vortek hotend guidance. Results are automatically filtered by the capabilities (enclosure, dual nozzle) of the printer selected in the top bar.
- **Hotends & Nozzles** — Compatibility matrix between filaments and hotends (Induction, High Flow, Tungsten Carbide, TPU-dedicated), H2C wiring rules, and indicative pricing.
- **Quotes** — Cost calculator for a printed part (filament, labor, packaging, machine amortization) with saved revisions, Excel and printable PDF export.
- **Tracking** — List of all quotes with status, search/filter, shipment tracking number and reminder date.
- **Inventory** — Stock of hotends (with the Vortek/left-slot configuration currently installed) and filament spools, plus a read-only live view of each connected printer's actual AMS contents.
- **Part price / Invoices / Maintenance** — placeholders, not implemented yet (see below).

## Tech stack

React 18 + Vite. No backend framework — a small set of Vite dev-server middlewares (in `vite.config.js`) expose a local REST API and keep a persistent MQTT connection to each configured printer. Data is stored as flat JSON files under `src/data/` (printer config, inventory) plus the browser's `localStorage` for quotes.

## Installation

Requirements: Node.js 18+ and a Bambu Lab printer on the same LAN with **LAN Mode** enabled (Settings → LAN Mode) if you want live monitoring.

```bash
npm install
npm run dev        # http://localhost:5173, current machine only
# or
npm run prod       # same, but reachable from other devices on the LAN (--host)
```

Then open the app, go to the **Printer** page and click **+ Add**:
- **IP** — the printer's LAN IP address
- **Serial number** — found under Settings → Device on the printer's screen
- **Access code** — found under Settings → LAN Mode on the printer's screen
- **Model** — select it from the list to unlock the enclosure/dual-nozzle filtering on the Filaments page

None of this is committed to the repo (`src/data/printer-config.json` is git-ignored) — each install reconfigures its own printer(s).

Production build: `npm run build` (output in `dist/`), previewed with `npm run preview`.

## What's left to do

- **Part price, Invoices, Maintenance** pages are only placeholders describing planned modules — no functionality yet.
- **Deep translation** — all UI chrome (navigation, buttons, forms, page headers) is fully bilingual, but the large filament technical database (`src/data/filaments.js`: per-filament description, print notes, warnings) and the Devis Excel/PDF export row labels are still French-only.
- **AMS write-back** — the Inventory page's printer AMS view is read-only by design; there's no way (yet) to push an inventory spool into an actual AMS slot from the app.
- **Multi-user / auth** — the app assumes a single trusted local user; there's no login or permission system.
- **Data portability** — quotes live in `localStorage` only (exportable to JSON on demand); no server-side backup/sync.
