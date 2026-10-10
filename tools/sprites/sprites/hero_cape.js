// Distributed under the NetHack General Public License.
// Generator for Hero Cape layer (cape.png in neutral grays)

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');
const { getHeroKinematics } = require('./hero_hair');

function createCapeSheet() {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderCapeCell(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function renderCapeCell(dir, frame) {
  const cape = new Canvas(48, 48);
  const G = Palettes.capeGray;
  const { cx, yBob, xShift } = getHeroKinematics(dir, frame);
  const ty = 26 + yBob;

  if (dir === 2) {
    cape.fillRect(cx - 8, ty - 6, 3, 2, G.hi);
    cape.fillRect(cx + 5, ty - 6, 3, 2, G.mid);

    let lW = (frame === 0) ? 4 : 2;
    let rW = (frame === 1) ? 4 : 2;
    let cLen = 14;

    if (frame === 2) {
      cape.fillRect(cx - 8, ty - 3, 2, 14, G.mid);
      cape.fillRect(cx + 6, ty - 3, 2, 14, G.shadow);
    } else if (frame === 3) {
      cape.fillRect(cx - 12, ty - 4, 4, 11, G.mid);
      cape.fillRect(cx - 12, ty - 4, 1, 9, G.hi);
      cape.fillRect(cx - 9, ty - 4, 1, 11, OUTLINE);

      cape.fillRect(cx + 8, ty - 4, 4, 11, G.shadow);
      cape.fillRect(cx + 8, ty - 4, 1, 11, OUTLINE);
      cape.fillRect(cx + 11, ty - 4, 1, 11, G.deep);
    } else {
      cape.fillRect(cx - 11, ty - 4, lW, cLen, G.mid);
      cape.fillRect(cx - 11, ty - 4, 1, cLen - 2, G.hi);
      cape.fillRect(cx - 11 + lW - 1, ty - 4, 1, cLen, OUTLINE);

      cape.fillRect(cx + 7, ty - 4, rW, cLen, G.shadow);
      cape.fillRect(cx + 7, ty - 4, 1, cLen, OUTLINE);
      cape.fillRect(cx + 7 + rW - 1, ty - 4, 1, cLen, G.deep);
    }

  } else if (dir === 0) {
    const capeFlutterX = (frame === 0) ? -3 : (frame === 1 ? 3 : (frame === 3 ? -2 : 0));
    const capeBottom = (frame === 3) ? 36 : 39;

    cape.fillPolygon([
      { x: cx - 8, y: ty - 6 },
      { x: cx + 8, y: ty - 6 },
      { x: cx + 11 + capeFlutterX, y: capeBottom },
      { x: cx - 11 + capeFlutterX, y: capeBottom }
    ], G.mid);

    cape.fillRect(cx - 8, ty - 5, 4, capeBottom - ty, G.hi);
    cape.fillRect(cx + 3, ty - 5, 5, capeBottom - ty + 1, G.shadow);
    cape.fillRect(cx + 7, ty - 3, 3, capeBottom - ty - 1, G.deep);

    cape.drawLine(cx - 2, ty - 4, cx - 4 + capeFlutterX, capeBottom, OUTLINE);
    cape.drawLine(cx + 2, ty - 4, cx + 1 + capeFlutterX, capeBottom, OUTLINE);

  } else if (dir === 1) {
    const flutter = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 3 ? -4 : 0));
    cape.fillPolygon([
      { x: cx - 4, y: ty - 6 },
      { x: cx - 1, y: ty - 6 },
      { x: cx - 3 + flutter, y: 38 },
      { x: cx - 11 + flutter, y: 38 }
    ], G.mid);
    cape.fillRect(cx - 9 + flutter, ty - 2, 3, 36 - ty, G.hi);
    cape.fillRect(cx - 5 + flutter, ty, 3, 38 - ty, G.shadow);

  } else if (dir === 3) {
    const flutter = (frame === 0) ? 2 : (frame === 1 ? -2 : (frame === 3 ? 4 : 0));
    cape.fillPolygon([
      { x: cx + 1, y: ty - 6 },
      { x: cx + 4, y: ty - 6 },
      { x: cx + 11 + flutter, y: 38 },
      { x: cx + 3 + flutter, y: 38 }
    ], G.mid);
    cape.fillRect(cx + 3 + flutter, ty - 2, 3, 36 - ty, G.hi);
    cape.fillRect(cx + 6 + flutter, ty, 4, 38 - ty, G.shadow);
  }

  return cape;
}

module.exports = { createCapeSheet };
