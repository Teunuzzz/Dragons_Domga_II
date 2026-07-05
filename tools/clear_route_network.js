const Database = require("better-sqlite3");

const db = new Database("database/DD2_Master.db");
db.pragma("foreign_keys = ON");

const edgeResult = db.prepare("DELETE FROM route_network_edges").run();
const nodeResult = db.prepare("DELETE FROM route_network_nodes").run();

console.log("Verwijderde route-network edges:", edgeResult.changes);
console.log("Verwijderde route-network nodes:", nodeResult.changes);

db.close();
