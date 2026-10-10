// Distributed under the NetHack General Public License.
// Common framework and helper for Monster Class sprite generators

const Canvas = require('../../canvas');
const { MONSTER_OUTLINE, Palettes } = require('../../palette');

function createMonsterSheetFromRenderer(renderCell) {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderCell(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(MONSTER_OUTLINE);
  return sheet;
}

function getMonsterKinematics(dir, frame) {
  let dx = 0;
  let dy = 0;
  if (frame === 1) {
    dy = (dir === 0 || dir === 2) ? -1 : 0;
  } else if (frame === 2) {
    if (dir === 0) dy = 3;
    else if (dir === 1) dx = -3;
    else if (dir === 2) dy = -3;
    else if (dir === 3) dx = 3;
  } else if (frame === 3) {
    if (dir === 0) dy = -4;
    else if (dir === 1) dx = 5;
    else if (dir === 2) dy = 4;
    else if (dir === 3) dx = -5;
  }
  return { dx, dy };
}

const G = Palettes.monsterGray;

module.exports = {
  createMonsterSheetFromRenderer,
  getMonsterKinematics,
  G,
  MONSTER_OUTLINE,
};
