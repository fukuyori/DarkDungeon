// Distributed under the NetHack General Public License.
// Generator for Hero Shield layer (shield_valkyrie.png)

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');
const { getHeroKinematics } = require('./hero_hair');

function createShieldSheet() {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderShieldCell(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function renderShieldCell(dir, frame) {
  const shield = new Canvas(48, 48);
  const S = Palettes.shield;
  const { cx, yBob } = getHeroKinematics(dir, frame);
  const ty = 26 + yBob;

  if (dir === 2) {
    let sx = cx + 9, sy = ty - 2;
    if (frame === 0) {
      sx = cx + 9; sy = ty - 2;
    } else if (frame === 1) {
      sx = cx + 8; sy = ty + 3;
    } else if (frame === 2) {
      sx = cx + 4; sy = ty - 5;
    } else if (frame === 3) {
      sx = cx + 9; sy = ty + 1;
    }

    const r = 6;
    shield.fillCircle(sx, sy, r, S.rimMid);
    shield.fillCircle(sx, sy, r - 1, S.faceMid);
    shield.fillRect(sx - r + 1, sy - r + 2, 3, 3, S.rimHi);
    shield.fillRect(sx - 3, sy - 3, 3, 3, S.faceHi);
    shield.fillRect(sx + 2, sy + 2, 3, 3, S.faceShadow);

    shield.fillCircle(sx, sy, 2, S.bossMid);
    shield.setPixel(sx - 1, sy - 1, S.bossHi);
    shield.setPixel(sx, sy, S.bossHi);

  } else if (dir === 0) {
    let sx = cx - 9, sy = ty - 2;
    if (frame === 0) {
      sx = cx - 9; sy = ty - 2;
    } else if (frame === 1) {
      sx = cx - 8; sy = ty + 3;
    } else if (frame === 2) {
      sx = cx - 4; sy = ty - 5;
    } else if (frame === 3) {
      sx = cx - 9; sy = ty + 1;
    }

    shield.fillCircle(sx, sy, 5, S.rimShadow);
    shield.fillCircle(sx, sy, 4, S.strap);
    shield.drawLine(sx - 2, sy - 3, sx + 2, sy + 3, [60, 36, 16, 255]);

  } else if (dir === 1) {
    let sx = cx - 4, sy = ty;
    if (frame === 0) {
      sx = cx - 3; sy = ty - 2;
    } else if (frame === 1) {
      sx = cx - 5; sy = ty + 2;
    } else if (frame === 2) {
      sx = cx - 5; sy = ty - 3;
    } else if (frame === 3) {
      sx = cx - 2; sy = ty;
    }

    shield.fillEllipse(sx, sy, 3, 7, S.rimMid);
    shield.fillRect(sx - 1, sy - 4, 2, 3, S.rimHi);
    shield.fillRect(sx, sy - 1, 2, 3, S.bossMid);

  } else if (dir === 3) {
    let sx = cx - 7, sy = ty - 2;
    if (frame === 0) {
      sx = cx - 8; sy = ty - 3;
    } else if (frame === 1) {
      sx = cx - 6; sy = ty + 2;
    } else if (frame === 2) {
      sx = cx - 8; sy = ty - 4;
    } else if (frame === 3) {
      sx = cx - 7; sy = ty;
    }

    const r = 6;
    shield.fillCircle(sx, sy, r, S.rimMid);
    shield.fillCircle(sx, sy, r - 1, S.faceMid);
    shield.fillRect(sx - r + 1, sy - r + 2, 3, 3, S.rimHi);
    shield.fillRect(sx - 3, sy - 3, 3, 3, S.faceHi);
    shield.fillRect(sx + 2, sy + 2, 3, 3, S.faceShadow);

    shield.fillCircle(sx, sy, 2, S.bossMid);
    shield.setPixel(sx - 1, sy - 1, S.bossHi);
  }

  return shield;
}

module.exports = { createShieldSheet };
