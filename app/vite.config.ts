import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function csvEscape(value: unknown) {
  const text = value === undefined || value === null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function parseSimpleCsv(content: string) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] }
  const headers = lines[0].split(',')
  const rows = lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i += 1
        } else if (ch === '"') {
          quoted = false
        } else {
          current += ch
        }
      } else if (ch === '"') {
        quoted = true
      } else if (ch === ',') {
        values.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
  return { headers, rows }
}

function writeCsv(filePath: string, headers: string[], rows: Record<string, unknown>[]) {
  const content = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n') + '\n'
  fs.writeFileSync(filePath, content, 'utf8')
}

function readRequestBody(req: import('node:http').IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error('Request body te groot'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<string>((resolve, reject) => {
    const displayCommand = [command, ...args].join(' ')

    // Belangrijk: start node.exe direct via spawn(command,args). Niet via cmd.exe en niet handmatig quoten.
    // Daardoor werken paden met spaties zoals C:\Program Files\nodejs\node.exe betrouwbaar.
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    child.stdout?.on('data', (data) => { output += data.toString() })
    child.stderr?.on('data', (data) => { output += data.toString() })
    child.on('error', (error) => {
      reject(new Error(`${displayCommand} kon niet worden gestart: ${error.message}`))
    })
    child.on('close', (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`${displayCommand} faalde met code ${code}\n${output}`))
    })
  })
}

function copyExportedJsonToPublic(repoRoot: string) {
  const exportsDir = path.join(repoRoot, 'database', 'exports')
  const publicDataDir = path.join(repoRoot, 'app', 'public', 'data')
  fs.mkdirSync(publicDataDir, { recursive: true })
  for (const fileName of fs.readdirSync(exportsDir)) {
    if (fileName.endsWith('.json')) {
      fs.copyFileSync(path.join(exportsDir, fileName), path.join(publicDataDir, fileName))
    }
  }
}

function mergeCalibrationCorrections(repoRoot: string, corrections: Array<Record<string, unknown>>) {
  const filePath = path.join(repoRoot, 'database', 'imports', 'templates', 'location_calibration_points_import_template.csv')
  const headers = ['location_key', 'corrected_x', 'corrected_y', 'locked', 'notes']
  const existing = fs.existsSync(filePath)
    ? parseSimpleCsv(fs.readFileSync(filePath, 'utf8'))
    : { headers, rows: [] as Record<string, string>[] }
  const nextByKey = new Map<string, Record<string, unknown>>()
  for (const row of existing.rows) {
    const key = String(row.location_key ?? '').trim()
    if (key) nextByKey.set(key, row)
  }
  for (const correction of corrections) {
    const key = String(correction.location_key ?? '').trim()
    if (!key) continue
    nextByKey.set(key, {
      location_key: key,
      corrected_x: Math.round(Number(correction.corrected_x ?? 0)),
      corrected_y: Math.round(Number(correction.corrected_y ?? 0)),
      locked: Number(correction.locked ?? 1) ? 1 : 0,
      notes: String(correction.notes ?? 'Gesleept in app en automatisch opgeslagen.'),
    })
  }
  const rows = Array.from(nextByKey.values()).sort((a, b) =>
    String(a.location_key).localeCompare(String(b.location_key)),
  )
  writeCsv(filePath, headers, rows)
  return rows.length
}

function dd2CalibrationPlugin() {
  const repoRoot = path.resolve(__dirname, '..')
  const nodeCommand = process.execPath

  return {
    name: 'dd2-local-calibration-api',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.endsWith('/__dd2/calibration/recalculate')) return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Alleen POST is toegestaan.' }))
          return
        }

        try {
          const rawBody = await readRequestBody(req)
          const payload = JSON.parse(rawBody || '{}') as { corrections?: Array<Record<string, unknown>> }
          const corrections = Array.isArray(payload.corrections) ? payload.corrections : []
          if (corrections.length === 0) throw new Error('Geen kalibratiecorrecties ontvangen.')

          const calibrationCount = mergeCalibrationCorrections(repoRoot, corrections)
          const details: string[] = [`Kalibratiepunten in CSV: ${calibrationCount}`]

          details.push(await runCommand(nodeCommand, ['tools/recalculate_locations_from_calibration.js', '--write', '--method', 'weighted'], repoRoot))
          details.push(await runCommand(nodeCommand, ['tools/import_csv_to_sqlite.js'], repoRoot))
          details.push(await runCommand(nodeCommand, ['tools/import_walkthrough_csv_to_sqlite.js'], repoRoot))
          if (fs.existsSync(path.join(repoRoot, 'tools', 'import_entity_map_points.js'))) {
            details.push(await runCommand(nodeCommand, ['tools/import_entity_map_points.js'], repoRoot))
          }
          details.push(await runCommand(nodeCommand, ['tools/export_sqlite_to_json.js'], repoRoot))
          details.push(await runCommand(nodeCommand, ['tools/export_walkthrough_json.js'], repoRoot))
          if (fs.existsSync(path.join(repoRoot, 'tools', 'export_entity_map_points_json.js'))) {
            details.push(await runCommand(nodeCommand, ['tools/export_entity_map_points_json.js'], repoRoot))
          }
          copyExportedJsonToPublic(repoRoot)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            ok: true,
            message: 'Correcties opgeslagen, locaties gewogen herberekend en JSON opnieuw geëxporteerd.',
            details: details.flatMap((entry) => entry.split(/\r?\n/).filter(Boolean)).slice(-18),
          }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }))
        }
      })
    },
  }
}

export default defineConfig({
  base: '/Dragons_Domga_II/',
  plugins: [react(), dd2CalibrationPlugin()],
})
