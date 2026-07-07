// Documentation helper for Sprint 3F.
// This does not modify the database. It prints the affine transform used for the computed v0.1 location layer.
const anchors = {
  borderwatch_outpost: { old: [532, 89], calibrated: [1170, 1851] },
  melve: { old: [502, 146], calibrated: [1104, 1723] },
  vernworth: { old: [549, 348], calibrated: [1205, 1327] },
  trevo_mine: { old: [442, 243], calibrated: [967, 1495] },
};

const coefX = [2.23495982, -0.01429136, -16.9972416];
const coefY = [0.44287512, -2.05585404, 1799.32833];

function transform(x, y) {
  return [
    Math.round(coefX[0] * x + coefX[1] * y + coefX[2]),
    Math.round(coefY[0] * x + coefY[1] * y + coefY[2]),
  ];
}

console.log('Sprint 3F computed-location transform');
console.log('x_new = 2.23495982*x_old -0.01429136*y_old -16.9972416');
console.log('y_new = 0.44287512*x_old -2.05585404*y_old +1799.32833');
console.log('Known anchors:');
for (const [key, value] of Object.entries(anchors)) {
  console.log(key, 'old=', value.old, 'calibrated=', value.calibrated, 'computed=', transform(...value.old));
}
