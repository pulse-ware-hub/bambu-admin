import { defineConfig }  from 'vite'
import react             from '@vitejs/plugin-react'
import fs                from 'node:fs'
import http              from 'node:http'
import path              from 'node:path'
import mqtt              from 'mqtt'

// ─────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────
const INVENTAIRE_FILE    = path.resolve('./src/data/inventaire.json')
const PRINTER_CFG_FILE   = path.resolve('./src/data/printer-config.json')
const ADMIN_FILE   = path.resolve('./src/data/admin.json')
const DEVIS_PARAMS_FILE         = path.resolve('./src/data/devis-parameters.json')
const DEVIS_PARAMS_DEFAULT_FILE = path.resolve('./src/data/devis-parameters.default.json')

// ─────────────────────────────────────────────────────────────
// Inventaire API  (src/data/inventaire.json)
// ─────────────────────────────────────────────────────────────
function inventaireApiPlugin() {
  return {
    name: 'inventaire-api',
    configureServer(server) {
      server.middlewares.use('/api/inventaire', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          try {
            const d = fs.existsSync(INVENTAIRE_FILE)
              ? JSON.parse(fs.readFileSync(INVENTAIRE_FILE, 'utf-8'))
              : { hotends: [], filaments: [] }
            res.end(JSON.stringify(d))
          } catch { res.statusCode = 500; res.end(JSON.stringify({ error: 'Lecture impossible' })) }
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', c => { body += c })
          req.on('end', () => {
            try {
              fs.writeFileSync(INVENTAIRE_FILE, JSON.stringify(JSON.parse(body), null, 2), 'utf-8')
              res.end(JSON.stringify({ ok: true }))
            } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Écriture impossible' })) }
          })
        } else { res.statusCode = 405; res.end() }
      })
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Devis parameters API  (src/data/devis-parameters.json)
// Fichier gitignoré (données de tarification réelles) — recopié
// depuis devis-parameters.default.json au premier accès s'il manque.
// ─────────────────────────────────────────────────────────────
function devisParamsApiPlugin() {
  return {
    name: 'devis-params-api',
    configureServer(server) {
      server.middlewares.use('/api/devis-parameters', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        try {
          if (!fs.existsSync(DEVIS_PARAMS_FILE)) {
            fs.copyFileSync(DEVIS_PARAMS_DEFAULT_FILE, DEVIS_PARAMS_FILE)
          }
          res.end(fs.readFileSync(DEVIS_PARAMS_FILE, 'utf-8'))
        } catch {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Lecture impossible' }))
        }
      })
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Admin proxy  (legacy – kept for reference)
// ─────────────────────────────────────────────────────────────
function loadPsConfig() {
  try { return fs.existsSync(ADMIN_FILE) ? JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8')) : { deviceIp: '' } }
  catch { return { deviceIp: '' } }
}
function proxyGet(deviceIp, apiPath, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: deviceIp, port: 80, path: apiPath, timeout: timeoutMs }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => { try { resolve({ ok: true, status: res.statusCode, body: JSON.parse(data) }) } catch { resolve({ ok: true, status: res.statusCode, body: data }) } })
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
  })
}
function adminProxyPlugin() {
  return {
    name: 'admin-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ps-config', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') { res.end(JSON.stringify(loadPsConfig())); return }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', c => { body += c })
          req.on('end', () => {
            try { fs.writeFileSync(ADMIN_FILE, JSON.stringify(JSON.parse(body), null, 2), 'utf-8'); res.end(JSON.stringify({ ok: true })) }
            catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Écriture impossible' })) }
          })
          return
        }
        res.statusCode = 405; res.end()
      })
      server.middlewares.use('/api/ps-proxy', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        const cfg = loadPsConfig()
        if (!cfg.deviceIp) { res.statusCode = 400; res.end(JSON.stringify({ error: 'no_device_ip' })); return }
        const url = new URL('http://x' + req.url)
        const apiPath = url.searchParams.get('path') || '/api/health'
        try {
          const r = await proxyGet(cfg.deviceIp, apiPath)
          res.statusCode = r.status
          res.end(typeof r.body === 'string' ? r.body : JSON.stringify(r.body))
        } catch (e) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'unreachable', detail: e.message }))
        }
      })
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Bambu MQTT plugin — connexion directe aux imprimantes (multi)
// ─────────────────────────────────────────────────────────────

// printers: Map<id, { cfg, client, state }>
const printers = new Map()

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function initState() {
  return {
    connectionStatus: 'disconnected',  // disconnected | connecting | connected | error
    error:            null,
    lastUpdate:       null,
    lifecycle:        null,   // IDLE | PREPARE | RUNNING | PAUSE | FINISH | FAILED
    progress:         0,
    remainingMinutes: 0,
    nozzleTemp:       null,
    nozzleTarget:     null,
    bedTemp:          null,
    bedTarget:        null,
    chamberTemp:      null,
    layer:            null,
    totalLayers:      null,
    jobName:          null,
    speedLevel:       null,
    wifiSignal:       null,
    hms:              [],
    ams:              null,
    vtTray:           null,
  }
}

function parseColor(hex) {
  if (!hex || hex.length < 6) return null
  return '#' + hex.slice(0, 6)
}

function parseTray(t) {
  return {
    id:       t.id,
    present:  !!(t.tray_type),
    color:    parseColor(t.tray_color),
    material: t.tray_type   || null,
    name:     t.tray_sub_brands || t.tray_type || null,
    remain:   t.remain !== undefined ? t.remain : -1,
  }
}

function parsePrinterMessage(state, msg) {
  const p = msg.print
  if (!p) return

  state.lastUpdate = Date.now()

  if (p.gcode_state         !== undefined) state.lifecycle       = p.gcode_state
  if (p.mc_percent          !== undefined) state.progress         = p.mc_percent
  if (p.mc_remaining_time   !== undefined) state.remainingMinutes = p.mc_remaining_time
  if (p.nozzle_temper       !== undefined) state.nozzleTemp       = p.nozzle_temper
  if (p.nozzle_target_temper!== undefined) state.nozzleTarget     = p.nozzle_target_temper
  if (p.bed_temper          !== undefined) state.bedTemp           = p.bed_temper
  if (p.bed_target_temper   !== undefined) state.bedTarget         = p.bed_target_temper
  if (p.chamber_temper      !== undefined) state.chamberTemp       = p.chamber_temper
  if (p.layer_num           !== undefined) state.layer             = p.layer_num
  if (p.total_layer_num     !== undefined) state.totalLayers       = p.total_layer_num
  if (p.subtask_name        !== undefined) state.jobName           = p.subtask_name || null
  if (p.spd_lvl             !== undefined) state.speedLevel        = p.spd_lvl
  if (p.wifi_signal         !== undefined) state.wifiSignal        = p.wifi_signal
  if (p.hms                 !== undefined) state.hms               = Array.isArray(p.hms) ? p.hms : []

  // AMS
  if (p.ams) {
    const units = (p.ams.ams || []).map(unit => ({
      id:       unit.id,
      humidity: unit.humidity !== undefined ? Number(unit.humidity) : null,
      temp:     unit.temp     !== undefined ? parseFloat(unit.temp)  : null,
      trays:    (unit.tray || []).map(parseTray),
    }))
    state.ams = { units, trayNow: p.ams.tray_now }
  }
  if (p.vt_tray) {
    state.vtTray = parseTray(p.vt_tray)
  }
}

function normalizePrinterCfg(cfg) {
  return {
    id:         cfg.id || genId(),
    ip:         cfg.ip || '',
    serial:     cfg.serial || '',
    accessCode: cfg.accessCode || '',
    name:       cfg.name || 'Bambu H2C',
    model:      cfg.model || '',
    vertex:     !!cfg.vertex,
  }
}

function loadPrinterConfigs() {
  let raw
  try {
    raw = fs.existsSync(PRINTER_CFG_FILE) ? JSON.parse(fs.readFileSync(PRINTER_CFG_FILE, 'utf-8')) : []
  } catch { raw = [] }

  // Migration : ancien format = un seul objet imprimante
  const list = Array.isArray(raw) ? raw : (raw && raw.ip !== undefined ? [raw] : [])
  const normalized = list.map(normalizePrinterCfg)
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) savePrinterConfigs(normalized)
  return normalized
}

function savePrinterConfigs(list) {
  fs.writeFileSync(PRINTER_CFG_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

function getPrinterConfigs() {
  return [...printers.values()].map(e => e.cfg)
}

function connectPrinter(cfg) {
  const existing = printers.get(cfg.id)
  if (existing?.client) existing.client.end(true)

  const state = initState()
  printers.set(cfg.id, { cfg, client: null, state })

  if (!cfg.ip || !cfg.serial || !cfg.accessCode) {
    state.connectionStatus = 'disconnected'
    return
  }

  state.connectionStatus = 'connecting'

  const client = mqtt.connect(`mqtts://${cfg.ip}:8883`, {
    username:           'bblp',
    password:           cfg.accessCode,
    rejectUnauthorized: false,
    clientId:           `bambu_admin_${cfg.id}_${Date.now().toString(16)}`,
    reconnectPeriod:    8000,
    connectTimeout:     10000,
  })

  client.on('connect', () => {
    console.log(`[BambuMQTT] Connecté à ${cfg.ip} (${cfg.name})`)
    state.connectionStatus = 'connected'
    state.error            = null

    client.subscribe(`device/${cfg.serial}/report`, err => {
      if (err) console.error('[BambuMQTT] Subscribe error:', err.message)
    })
    // Demande l'état complet dès la connexion
    client.publish(
      `device/${cfg.serial}/request`,
      JSON.stringify({ pushing: { sequence_id: '0', command: 'pushall' } }),
    )
  })

  client.on('message', (_topic, payload) => {
    try { parsePrinterMessage(state, JSON.parse(payload.toString())) }
    catch { /* message malformé */ }
  })

  client.on('error', err => {
    console.error('[BambuMQTT] Erreur:', err.message)
    state.connectionStatus = 'error'
    state.error = err.message
  })

  client.on('reconnect', () => {
    state.connectionStatus = 'connecting'
  })

  client.on('close', () => {
    if (state.connectionStatus === 'connected') {
      state.connectionStatus = 'connecting'
    }
  })

  printers.get(cfg.id).client = client
}

function disconnectPrinter(id) {
  const entry = printers.get(id)
  if (entry?.client) entry.client.end(true)
  printers.delete(id)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
  })
}

function idFromUrl(url) {
  // url relatif au point de montage : "/", "/<id>", ou "?id=<id>"
  const u = new URL('http://x' + url)
  const seg = u.pathname.replace(/^\/+/, '')
  return seg || u.searchParams.get('id') || ''
}

function bambuMqttPlugin() {
  return {
    name: 'bambu-mqtt',
    configureServer(server) {
      // Auto-connexion au démarrage pour chaque imprimante configurée
      for (const cfg of loadPrinterConfigs()) {
        if (cfg.ip && cfg.serial && cfg.accessCode) connectPrinter(cfg)
        else printers.set(cfg.id, { cfg, client: null, state: initState() })
      }

      // GET  /api/printers          → liste des imprimantes
      // POST /api/printers          → ajoute une imprimante { ip, serial, accessCode, name, model, vertex }
      // PUT  /api/printers/:id      → met à jour une imprimante
      // DELETE /api/printers/:id    → supprime une imprimante
      server.middlewares.use('/api/printers', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        const id = idFromUrl(req.url)

        if (req.method === 'GET') {
          res.end(JSON.stringify(getPrinterConfigs()))
          return
        }

        if (req.method === 'POST') {
          try {
            const data = await readBody(req)
            const cfg = normalizePrinterCfg({ ...data, id: undefined })
            connectPrinter(cfg)
            savePrinterConfigs(getPrinterConfigs())
            res.end(JSON.stringify(cfg))
          } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Corps invalide' })) }
          return
        }

        if (req.method === 'PUT') {
          if (!id || !printers.has(id)) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Introuvable' })); return }
          try {
            const data = await readBody(req)
            const cfg = normalizePrinterCfg({ ...data, id })
            connectPrinter(cfg)
            savePrinterConfigs(getPrinterConfigs())
            res.end(JSON.stringify(cfg))
          } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Corps invalide' })) }
          return
        }

        if (req.method === 'DELETE') {
          if (!id || !printers.has(id)) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Introuvable' })); return }
          disconnectPrinter(id)
          savePrinterConfigs(getPrinterConfigs())
          res.end(JSON.stringify({ ok: true }))
          return
        }

        res.statusCode = 405; res.end()
      })

      // GET /api/printer-status/:id  (ou ?id=)
      server.middlewares.use('/api/printer-status', (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        res.setHeader('Content-Type', 'application/json')
        const id = idFromUrl(req.url) || getPrinterConfigs()[0]?.id
        const entry = id && printers.get(id)
        res.end(JSON.stringify(entry ? entry.state : initState()))
      })

      // POST /api/printer-command/:id  (ou ?id=)  { command: "pause"|"resume"|"stop"|"pushall" }
      server.middlewares.use('/api/printer-command', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        res.setHeader('Content-Type', 'application/json')

        const id = idFromUrl(req.url) || getPrinterConfigs()[0]?.id
        const entry = id && printers.get(id)
        if (!entry?.client || !entry.cfg.serial) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'Non connecté' }))
          return
        }

        try {
          const { command } = await readBody(req)
          const topic = `device/${entry.cfg.serial}/request`
          const seqId = String(Date.now()).slice(-6)

          if (command === 'pushall') {
            entry.client.publish(topic, JSON.stringify({ pushing: { sequence_id: seqId, command: 'pushall' } }))
          } else if (['pause', 'resume', 'stop'].includes(command)) {
            entry.client.publish(topic, JSON.stringify({ print: { sequence_id: seqId, command } }))
          } else {
            res.statusCode = 400; res.end(JSON.stringify({ error: 'Commande inconnue' })); return
          }
          res.end(JSON.stringify({ ok: true, command }))
        } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Corps invalide' })) }
      })
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [
    react(),
    inventaireApiPlugin(),
    devisParamsApiPlugin(),
    adminProxyPlugin(),
    bambuMqttPlugin(),
  ],
})
