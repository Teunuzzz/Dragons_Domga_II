const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "database", "DD2_Master.db");

function tableExists(db, tableName) {
  return Boolean(db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(tableName));
}

function scalar(db, sql, params = []) {
  const row = db.prepare(sql).get(params);
  return row ? Object.values(row)[0] : 0;
}

function all(db, sql, params = []) {
  return db.prepare(sql).all(params);
}

function main() {
  console.log("Sprint 4A route-objective coverage report");
  console.log("Database:", DB_PATH);
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database niet gevonden: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  try {
    if (!tableExists(db, "route_objectives")) {
      console.log("route_objectives bestaat nog niet. Run eerst: node tools/import_route_objectives.js");
      return;
    }

    const routeStepCount = scalar(db, "SELECT COUNT(*) AS n FROM op_route_steps");
    const objectiveCount = scalar(db, "SELECT COUNT(*) AS n FROM route_objectives");
    const actionCount = scalar(db, "SELECT COUNT(*) AS n FROM route_objective_actions");
    const decisionCount = scalar(db, "SELECT COUNT(*) AS n FROM route_decisions");
    const profileCount = scalar(db, "SELECT COUNT(*) AS n FROM vocation_route_profiles");
    const linkedSteps = scalar(db, "SELECT COUNT(DISTINCT step_id) AS n FROM route_objectives WHERE step_id IS NOT NULL");
    const stepsWithoutObjective = all(db, `
      SELECT r.route_key, s.step_key, s.step_order, s.title
      FROM op_route_steps s
      JOIN op_routes r ON r.route_id = s.route_id
      LEFT JOIN route_objectives ro ON ro.step_id = s.step_id
      WHERE ro.objective_id IS NULL
      ORDER BY r.route_key, s.step_order, s.step_key
    `);
    const objectivesWithoutActions = all(db, `
      SELECT r.route_key, ro.objective_key, ro.title
      FROM route_objectives ro
      JOIN op_routes r ON r.route_id = ro.route_id
      LEFT JOIN route_objective_actions roa ON roa.objective_id = ro.objective_id
      WHERE roa.action_id IS NULL
      ORDER BY r.route_key, ro.sort_order, ro.objective_key
    `);
    const objectivesWithoutExactPoints = tableExists(db, "entity_map_points") ? all(db, `
      SELECT r.route_key, ro.objective_key, s.step_key, ro.title
      FROM route_objectives ro
      JOIN op_routes r ON r.route_id = ro.route_id
      LEFT JOIN op_route_steps s ON s.step_id = ro.step_id
      LEFT JOIN entity_map_points emp ON emp.step_id = ro.step_id
      WHERE ro.step_id IS NOT NULL AND emp.point_id IS NULL
      ORDER BY r.route_key, ro.sort_order, ro.objective_key
    `) : [];

    console.log(`Route steps totaal: ${routeStepCount}`);
    console.log(`Objectives totaal: ${objectiveCount}`);
    console.log(`Steps met objective: ${linkedSteps}/${routeStepCount}`);
    console.log(`Objective actions: ${actionCount}`);
    console.log(`Route decisions: ${decisionCount}`);
    console.log(`Vocation route profiles: ${profileCount}`);

    if (stepsWithoutObjective.length > 0) {
      console.log("\nSteps zonder objective:");
      stepsWithoutObjective.slice(0, 30).forEach((row) => {
        console.log(`- ${row.route_key} / ${row.step_order} / ${row.step_key}: ${row.title}`);
      });
      if (stepsWithoutObjective.length > 30) console.log(`... +${stepsWithoutObjective.length - 30} meer`);
    }

    if (objectivesWithoutActions.length > 0) {
      console.log("\nObjectives zonder actions/checklist:");
      objectivesWithoutActions.slice(0, 30).forEach((row) => {
        console.log(`- ${row.route_key} / ${row.objective_key}: ${row.title}`);
      });
    }

    if (objectivesWithoutExactPoints.length > 0) {
      console.log("\nObjectives zonder exact entity_map_point:");
      objectivesWithoutExactPoints.slice(0, 30).forEach((row) => {
        console.log(`- ${row.route_key} / ${row.step_key}: ${row.title}`);
      });
      if (objectivesWithoutExactPoints.length > 30) console.log(`... +${objectivesWithoutExactPoints.length - 30} meer`);
    }
  } catch (err) {
    console.error("Coverage report mislukt:");
    console.error(err.stack || err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
