const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "database", "DD2_Master.db");
const IMPORT_DIR = path.join(ROOT_DIR, "database", "imports", "templates");
const EXPORT_DIR = path.join(ROOT_DIR, "database", "exports");

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();

  if (!raw) {
    return [];
  }

  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function numberOrDefault(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function nullable(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS route_network_nodes (
      node_id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      region_key TEXT,
      world_x REAL NOT NULL,
      world_y REAL NOT NULL,
      node_type TEXT NOT NULL DEFAULT 'waypoint',
      danger_level INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      source_key TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS route_network_edges (
      edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
      edge_key TEXT NOT NULL UNIQUE,
      from_node_id INTEGER NOT NULL,
      to_node_id INTEGER NOT NULL,
      distance_score REAL NOT NULL DEFAULT 1,
      danger_level INTEGER NOT NULL DEFAULT 1,
      road_type TEXT NOT NULL DEFAULT 'road',
      bidirectional INTEGER NOT NULL DEFAULT 1,
      requires_flag TEXT,
      notes TEXT,
      source_key TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (from_node_id) REFERENCES route_network_nodes(node_id),
      FOREIGN KEY (to_node_id) REFERENCES route_network_nodes(node_id)
    );

    CREATE INDEX IF NOT EXISTS idx_route_network_nodes_key
    ON route_network_nodes(node_key);

    CREATE INDEX IF NOT EXISTS idx_route_network_edges_from
    ON route_network_edges(from_node_id);

    CREATE INDEX IF NOT EXISTS idx_route_network_edges_to
    ON route_network_edges(to_node_id);
  `);
}

function importNodes(db) {
  const filePath = path.join(IMPORT_DIR, "route_network_nodes_import_template.csv");
  const rows = readCsv(filePath);

  const stmt = db.prepare(`
    INSERT INTO route_network_nodes (
      node_key,
      name,
      region_key,
      world_x,
      world_y,
      node_type,
      danger_level,
      notes,
      source_key,
      updated_at
    )
    VALUES (
      @node_key,
      @name,
      @region_key,
      @world_x,
      @world_y,
      @node_type,
      @danger_level,
      @notes,
      @source_key,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(node_key) DO UPDATE SET
      name = excluded.name,
      region_key = excluded.region_key,
      world_x = excluded.world_x,
      world_y = excluded.world_y,
      node_type = excluded.node_type,
      danger_level = excluded.danger_level,
      notes = excluded.notes,
      source_key = excluded.source_key,
      updated_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction((items) => {
    for (const row of items) {
      if (!row.node_key) continue;

      stmt.run({
        node_key: row.node_key,
        name: row.name || row.node_key,
        region_key: nullable(row.region_key),
        world_x: numberOrDefault(row.world_x, 0),
        world_y: numberOrDefault(row.world_y, 0),
        node_type: row.node_type || "waypoint",
        danger_level: numberOrDefault(row.danger_level, 1),
        notes: nullable(row.notes),
        source_key: nullable(row.source_key),
      });
    }
  });

  tx(rows);

  console.log(`Route network nodes geïmporteerd: ${rows.length}`);
}

function getNodeId(db, nodeKey) {
  const row = db
    .prepare("SELECT node_id FROM route_network_nodes WHERE node_key = ?")
    .get(nodeKey);

  if (!row) {
    throw new Error(`Route network node niet gevonden: ${nodeKey}`);
  }

  return row.node_id;
}

function importEdges(db) {
  const filePath = path.join(IMPORT_DIR, "route_network_edges_import_template.csv");
  const rows = readCsv(filePath);

  const stmt = db.prepare(`
    INSERT INTO route_network_edges (
      edge_key,
      from_node_id,
      to_node_id,
      distance_score,
      danger_level,
      road_type,
      bidirectional,
      requires_flag,
      notes,
      source_key,
      updated_at
    )
    VALUES (
      @edge_key,
      @from_node_id,
      @to_node_id,
      @distance_score,
      @danger_level,
      @road_type,
      @bidirectional,
      @requires_flag,
      @notes,
      @source_key,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(edge_key) DO UPDATE SET
      from_node_id = excluded.from_node_id,
      to_node_id = excluded.to_node_id,
      distance_score = excluded.distance_score,
      danger_level = excluded.danger_level,
      road_type = excluded.road_type,
      bidirectional = excluded.bidirectional,
      requires_flag = excluded.requires_flag,
      notes = excluded.notes,
      source_key = excluded.source_key,
      updated_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction((items) => {
    for (const row of items) {
      if (!row.edge_key) continue;

      stmt.run({
        edge_key: row.edge_key,
        from_node_id: getNodeId(db, row.from_node_key),
        to_node_id: getNodeId(db, row.to_node_key),
        distance_score: numberOrDefault(row.distance_score, 1),
        danger_level: numberOrDefault(row.danger_level, 1),
        road_type: row.road_type || "road",
        bidirectional: numberOrDefault(row.bidirectional, 1),
        requires_flag: nullable(row.requires_flag),
        notes: nullable(row.notes),
        source_key: nullable(row.source_key),
      });
    }
  });

  tx(rows);

  console.log(`Route network edges geïmporteerd: ${rows.length}`);
}

function exportRouteNetwork(db) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const nodes = db.prepare(`
    SELECT
      node_id,
      node_key,
      name,
      region_key,
      world_x,
      world_y,
      node_type,
      danger_level,
      notes,
      source_key
    FROM route_network_nodes
    ORDER BY node_key
  `).all();

  const edges = db.prepare(`
    SELECT
      e.edge_id,
      e.edge_key,
      from_node.node_key AS from_node_key,
      to_node.node_key AS to_node_key,
      e.distance_score,
      e.danger_level,
      e.road_type,
      e.bidirectional,
      e.requires_flag,
      e.notes,
      e.source_key
    FROM route_network_edges e
    JOIN route_network_nodes from_node ON from_node.node_id = e.from_node_id
    JOIN route_network_nodes to_node ON to_node.node_id = e.to_node_id
    ORDER BY e.edge_key
  `).all();

  const payload = {
    generated_at: new Date().toISOString(),
    nodes,
    edges,
  };

  const filePath = path.join(EXPORT_DIR, "route_network.json");
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");

  console.log("Export geschreven: route_network.json");
}

function main() {
  console.log("Route-network sync gestart...");

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  ensureSchema(db);
  importNodes(db);
  importEdges(db);
  exportRouteNetwork(db);

  db.close();

  console.log("Route-network sync klaar.");
}

main();