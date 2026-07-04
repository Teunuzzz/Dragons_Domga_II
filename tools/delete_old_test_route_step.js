const Database = require("better-sqlite3");

const db = new Database("database/DD2_Master.db");
db.pragma("foreign_keys = ON");

const rowsBefore = db.prepare(`
  SELECT s.step_id, s.step_key, s.step_order, s.title, r.route_key
  FROM op_route_steps s
  JOIN op_routes r ON r.route_id = s.route_id
  WHERE r.route_key = ?
  ORDER BY s.step_order, s.step_key
`).all("fighter_op_fast_manual");

console.log("Route-stappen vóór cleanup:");
for (const row of rowsBefore) {
  console.log(`${row.step_order} - ${row.step_key} - ${row.title}`);
}

const result = db.prepare(`
  DELETE FROM op_route_steps
  WHERE step_key = ?
  AND route_id = (
    SELECT route_id
    FROM op_routes
    WHERE route_key = ?
  )
`).run("go_to_melve", "fighter_op_fast_manual");

console.log("");
console.log("Verwijderde oude route-stappen:", result.changes);

const rowsAfter = db.prepare(`
  SELECT s.step_id, s.step_key, s.step_order, s.title, r.route_key
  FROM op_route_steps s
  JOIN op_routes r ON r.route_id = s.route_id
  WHERE r.route_key = ?
  ORDER BY s.step_order, s.step_key
`).all("fighter_op_fast_manual");

console.log("");
console.log("Route-stappen na cleanup:");
for (const row of rowsAfter) {
  console.log(`${row.step_order} - ${row.step_key} - ${row.title}`);
}

db.close();
