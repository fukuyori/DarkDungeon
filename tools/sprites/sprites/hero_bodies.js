// Distributed under the NetHack General Public License.
// Generator for Hero Body layers (10 sheets: 5 races x 2 genders)
// All bodies share the identical footprint, head anchor, and joint kinematics.

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');

const RACES = ['human', 'elf', 'dwarf', 'gnome', 'orc'];
const GENDERS = ['male', 'female'];

function createBodySheet(race, gender) {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderBodyCell(race, gender, dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function getSkinPalette(race) {
  if (race === 'elf') return Palettes.skinElf;
  if (race === 'dwarf') return Palettes.skinDwarf;
  if (race === 'gnome') return Palettes.skinGnome;
  if (race === 'orc') return Palettes.skinOrc;
  return Palettes.skin; // human
}

function renderBodyCell(race, gender, dir, frame) {
  const body = new Canvas(48, 48);
  const S = getSkinPalette(race);
  const U = Palettes.undergarment;
  const isMale = (gender === 'male');

  // Animation kinematic parameters (shared across all hero layers)
  let yBob = 0;
  let xShift = 0;

  if (frame === 0) {
    yBob = 0; // Walk A
  } else if (frame === 1) {
    yBob = -1; // Walk B
  } else if (frame === 2) {
    yBob = 1; // Wind-up
    if (dir === 1) xShift = -1;
    if (dir === 3) xShift = 1;
  } else if (frame === 3) {
    yBob = 1; // Strike
    if (dir === 1) xShift = 3;
    else if (dir === 3) xShift = -3;
    else if (dir === 2) yBob = 2;
    else if (dir === 0) yBob = -1;
  }

  const cx = 24 + xShift;
  const hy = 14 + yBob;
  const ty = 26 + yBob;
  const py = 37 + yBob;

  if (dir === 2) {
    // === FACING DOWN ===
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 43 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 42 : 42));

    // Left leg
    body.fillRect(cx - 6, py - 3, 4, lFootY - py + 4, S.mid);
    body.fillRect(cx - 6, py - 3, 2, lFootY - py + 3, S.highlight);
    body.fillRect(cx - 3, py + 2, 1, lFootY - py - 1, S.shadow);

    // Right leg
    body.fillRect(cx + 2, py - 3, 4, rFootY - py + 4, S.mid);
    body.fillRect(cx + 2, py - 3, 2, rFootY - py + 3, S.highlight);
    body.fillRect(cx + 5, py + 2, 1, rFootY - py - 1, S.shadow);

    // Torso Undergarment
    body.fillRect(cx - 6, ty - 6, 12, 11, U.mid);
    body.fillRect(cx - 6, ty - 6, 4, 10, U.highlight);
    body.fillRect(cx + 3, ty - 6, 3, 11, U.shadow);
    body.fillRect(cx - 5, ty + 2, 10, 2, U.shadow);

    if (isMale) {
      body.fillRect(cx - 5, ty - 2, 10, 1, U.shadow); // male chest line
    }

    // Neck
    const neckW = (race === 'dwarf') ? 8 : 6;
    const neckX = cx - Math.floor(neckW / 2);
    body.fillRect(neckX, hy + 6, neckW, 4, S.shadow);
    body.fillRect(neckX + 1, hy + 6, neckW - 2, 3, S.mid);

    // Head / Open Face
    body.fillEllipse(cx, hy, 7, 7, S.mid);
    body.fillRect(cx - 5, hy - 4, 6, 7, S.highlight);
    body.fillRect(cx + 3, hy - 2, 3, 6, S.shadow);
    body.fillRect(cx - 2, hy + 5, 4, 2, S.shadow); // chin

    // Eyes
    body.fillRect(cx - 4, hy + 1, 2, 2, OUTLINE);
    body.setPixel(cx - 4, hy, [255, 255, 255, 255]);
    body.fillRect(cx + 3, hy + 1, 2, 2, OUTLINE);
    body.setPixel(cx + 3, hy, [255, 255, 255, 255]);

    // Cheeks & Nose
    body.setPixel(cx - 4, hy + 3, S.highlight);
    body.setPixel(cx + 3, hy + 3, S.highlight);
    body.setPixel(cx, hy + 3, S.shadow);

    // Mouth
    if (frame === 3) {
      body.fillRect(cx - 1, hy + 5, 3, 2, [200, 40, 40, 255]);
    } else {
      body.fillRect(cx - 1, hy + 5, 3, 1, S.deep);
    }

    // Race Features (Facing Down)
    if (race === 'elf') {
      // Pointed ears pointing up-outward
      body.drawLine(cx - 7, hy + 1, cx - 8, hy - 2, S.mid);
      body.drawLine(cx + 7, hy + 1, cx + 8, hy - 2, S.mid);
      body.setPixel(cx - 8, hy - 2, S.highlight);
      body.setPixel(cx + 8, hy - 2, S.highlight);
    } else if (race === 'gnome') {
      // Large prominent round nose
      body.fillRect(cx - 2, hy + 2, 4, 3, S.mid);
      body.fillRect(cx - 1, hy + 2, 2, 1, S.highlight);
      body.fillRect(cx - 2, hy + 4, 4, 1, S.shadow);
    } else if (race === 'orc') {
      // Tusks pointing upward from mouth
      const T = Palettes.tusks;
      body.setPixel(cx - 3, hy + 4, T.hi);
      body.setPixel(cx - 3, hy + 3, T.hi);
      body.setPixel(cx + 2, hy + 4, T.hi);
      body.setPixel(cx + 2, hy + 3, T.hi);
    } else if (race === 'dwarf' && isMale) {
      // Bushy beard on body layer
      const B = Palettes.beardDwarf;
      body.fillRect(cx - 5, hy + 4, 10, 6, B.mid);
      body.fillRect(cx - 4, hy + 4, 3, 5, B.hi);
      body.fillRect(cx + 2, hy + 4, 3, 6, B.shadow);
      body.fillRect(cx - 3, hy + 9, 2, 2, B.mid); // left braid tip
      body.fillRect(cx + 1, hy + 9, 2, 2, B.shadow); // right braid tip
    }

    // Arms
    if (frame === 2) {
      body.fillRect(cx - 10, ty - 8, 4, 8, S.mid);
      body.fillRect(cx - 11, ty - 10, 4, 4, S.mid);
    } else if (frame === 3) {
      body.fillRect(cx - 9, ty - 4, 5, 10, S.mid);
      body.fillRect(cx - 7, ty + 4, 4, 4, S.highlight);
    } else if (frame === 0) {
      body.fillRect(cx - 9, ty - 6, 3, 9, S.mid);
      body.fillRect(cx - 9, ty + 2, 3, 3, S.mid);
    } else {
      body.fillRect(cx - 9, ty - 3, 3, 9, S.mid);
      body.fillRect(cx - 9, ty + 5, 3, 3, S.mid);
    }

    if (frame === 2) {
      body.fillRect(cx + 6, ty - 4, 4, 8, S.mid);
    } else if (frame === 3) {
      body.fillRect(cx + 6, ty - 2, 4, 8, S.mid);
    } else if (frame === 0) {
      body.fillRect(cx + 6, ty - 3, 3, 9, S.mid);
    } else {
      body.fillRect(cx + 6, ty - 6, 3, 9, S.mid);
    }

  } else if (dir === 0) {
    // === FACING UP ===
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 42 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 43 : 42));

    body.fillRect(cx - 6, py - 3, 4, lFootY - py + 4, S.mid);
    body.fillRect(cx - 6, py - 3, 2, lFootY - py + 3, S.highlight);
    body.fillRect(cx - 3, py + 2, 1, lFootY - py - 1, S.shadow);

    body.fillRect(cx + 2, py - 3, 4, rFootY - py + 4, S.mid);
    body.fillRect(cx + 2, py - 3, 2, rFootY - py + 3, S.highlight);
    body.fillRect(cx + 5, py + 2, 1, rFootY - py - 1, S.shadow);

    // Torso back
    body.fillRect(cx - 6, ty - 6, 12, 11, U.mid);
    body.fillRect(cx - 6, ty - 6, 4, 10, U.highlight);
    body.fillRect(cx + 2, ty - 6, 4, 11, U.shadow);

    const neckW = (race === 'dwarf') ? 8 : 6;
    const neckX = cx - Math.floor(neckW / 2);
    body.fillRect(neckX, hy + 6, neckW, 4, S.shadow);

    // Head back
    body.fillEllipse(cx, hy, 7, 7, S.shadow);
    body.fillRect(cx - 5, hy - 4, 6, 7, S.mid);

    // Elf ears visible from back
    if (race === 'elf') {
      body.drawLine(cx - 7, hy + 1, cx - 8, hy - 2, S.shadow);
      body.drawLine(cx + 7, hy + 1, cx + 8, hy - 2, S.shadow);
    } else if (race === 'dwarf' && isMale) {
      // Beard peeking slightly at sides of jaw
      const B = Palettes.beardDwarf;
      body.fillRect(cx - 7, hy + 5, 2, 4, B.shadow);
      body.fillRect(cx + 5, hy + 5, 2, 4, B.shadow);
    }

    // Arms
    if (frame === 2) {
      body.fillRect(cx - 9, ty - 5, 3, 9, S.mid);
      body.fillRect(cx + 6, ty - 8, 4, 8, S.mid);
    } else if (frame === 3) {
      body.fillRect(cx - 9, ty - 5, 3, 9, S.mid);
      body.fillRect(cx + 6, ty - 10, 4, 10, S.mid);
    } else if (frame === 0) {
      body.fillRect(cx - 9, ty - 3, 3, 9, S.mid);
      body.fillRect(cx + 6, ty - 6, 3, 9, S.mid);
    } else {
      body.fillRect(cx - 9, ty - 6, 3, 9, S.mid);
      body.fillRect(cx + 6, ty - 3, 3, 9, S.mid);
    }

  } else if (dir === 1) {
    // === FACING RIGHT ===
    let lLegX = cx - 2, lFootY = 42;
    let rLegX = cx + 2, rFootY = 42;
    if (frame === 0) {
      lLegX = cx - 4; lFootY = 40;
      rLegX = cx + 3; rFootY = 43;
    } else if (frame === 1) {
      lLegX = cx + 1; lFootY = 42;
      rLegX = cx - 2; rFootY = 40;
    } else if (frame === 3) {
      lLegX = cx - 3; lFootY = 41;
      rLegX = cx + 5; rFootY = 43;
    }

    body.fillRect(lLegX - 2, py - 3, 4, lFootY - py + 4, S.shadow);
    body.fillRect(rLegX - 2, py - 3, 4, rFootY - py + 4, S.mid);
    body.fillRect(rLegX - 2, py - 3, 2, rFootY - py + 3, S.highlight);

    body.fillRect(cx - 4, ty - 6, 9, 11, U.mid);
    body.fillRect(cx - 4, ty - 6, 3, 10, U.highlight);
    body.fillRect(cx + 2, ty - 6, 3, 11, U.shadow);

    body.fillRect(cx - 1, hy + 6, 4, 4, S.mid);

    body.fillEllipse(cx, hy, 6, 7, S.mid);
    body.fillRect(cx - 4, hy - 4, 5, 7, S.highlight);
    body.fillRect(cx + 4, hy + 1, 3, 3, S.mid);
    body.setPixel(cx + 6, hy + 2, S.highlight);

    body.setPixel(cx + 3, hy + 1, OUTLINE);
    body.setPixel(cx + 3, hy, [255, 255, 255, 255]);

    // Race details facing right
    if (race === 'elf') {
      body.drawLine(cx - 4, hy - 1, cx - 7, hy - 3, S.mid);
      body.setPixel(cx - 7, hy - 3, S.highlight);
    } else if (race === 'gnome') {
      // Large nose jutting right
      body.fillRect(cx + 5, hy + 1, 3, 3, S.mid);
      body.setPixel(cx + 7, hy + 2, S.highlight);
    } else if (race === 'orc') {
      // Tusk jutting right
      const T = Palettes.tusks;
      body.setPixel(cx + 6, hy + 3, T.hi);
      body.setPixel(cx + 6, hy + 2, T.hi);
    } else if (race === 'dwarf' && isMale) {
      // Beard forward
      const B = Palettes.beardDwarf;
      body.fillRect(cx + 2, hy + 4, 6, 5, B.mid);
      body.fillRect(cx + 2, hy + 4, 3, 4, B.hi);
      body.fillRect(cx + 5, hy + 6, 3, 3, B.shadow);
    }

    // Arms
    if (frame === 2) {
      body.fillRect(cx - 7, ty - 4, 4, 7, S.shadow);
      body.fillRect(cx - 8, ty - 6, 3, 3, S.mid);
    } else if (frame === 3) {
      body.fillRect(cx + 2, ty - 4, 8, 4, S.mid);
      body.fillRect(cx + 9, ty - 5, 3, 4, S.highlight);
    } else if (frame === 0) {
      body.fillRect(cx + 1, ty - 4, 4, 8, S.mid);
      body.fillRect(cx + 3, ty + 2, 3, 3, S.mid);
    } else {
      body.fillRect(cx - 3, ty - 4, 4, 8, S.mid);
      body.fillRect(cx - 1, ty + 3, 3, 3, S.mid);
    }

  } else if (dir === 3) {
    // === FACING LEFT ===
    let lLegX = cx + 2, lFootY = 42;
    let rLegX = cx - 2, rFootY = 42;
    if (frame === 0) {
      lLegX = cx + 4; lFootY = 40;
      rLegX = cx - 3; rFootY = 43;
    } else if (frame === 1) {
      lLegX = cx - 1; lFootY = 42;
      rLegX = cx + 2; rFootY = 40;
    } else if (frame === 3) {
      lLegX = cx + 3; lFootY = 41;
      rLegX = cx - 5; rFootY = 43;
    }

    body.fillRect(lLegX - 2, py - 3, 4, lFootY - py + 4, S.shadow);
    body.fillRect(rLegX - 2, py - 3, 4, rFootY - py + 4, S.mid);
    body.fillRect(rLegX - 2, py - 3, 2, rFootY - py + 3, S.highlight);

    body.fillRect(cx - 5, ty - 6, 9, 11, U.mid);
    body.fillRect(cx - 5, ty - 6, 3, 10, U.highlight);
    body.fillRect(cx + 1, ty - 6, 3, 11, U.shadow);

    body.fillRect(cx - 3, hy + 6, 4, 4, S.mid);

    body.fillEllipse(cx, hy, 6, 7, S.mid);
    body.fillRect(cx - 5, hy - 4, 5, 7, S.highlight);
    body.fillRect(cx - 7, hy + 1, 3, 3, S.mid);
    body.setPixel(cx - 7, hy + 2, S.highlight);

    body.setPixel(cx - 4, hy + 1, OUTLINE);
    body.setPixel(cx - 4, hy, [255, 255, 255, 255]);

    // Race details facing left
    if (race === 'elf') {
      body.drawLine(cx + 4, hy - 1, cx + 7, hy - 3, S.mid);
      body.setPixel(cx + 7, hy - 3, S.highlight);
    } else if (race === 'gnome') {
      body.fillRect(cx - 8, hy + 1, 3, 3, S.mid);
      body.setPixel(cx - 8, hy + 2, S.highlight);
    } else if (race === 'orc') {
      const T = Palettes.tusks;
      body.setPixel(cx - 7, hy + 3, T.hi);
      body.setPixel(cx - 7, hy + 2, T.hi);
    } else if (race === 'dwarf' && isMale) {
      const B = Palettes.beardDwarf;
      body.fillRect(cx - 8, hy + 4, 6, 5, B.mid);
      body.fillRect(cx - 6, hy + 4, 3, 4, B.hi);
      body.fillRect(cx - 8, hy + 6, 3, 3, B.shadow);
    }

    // Arms
    if (frame === 2) {
      body.fillRect(cx + 3, ty - 4, 4, 7, S.shadow);
      body.fillRect(cx + 5, ty - 6, 3, 3, S.mid);
    } else if (frame === 3) {
      body.fillRect(cx - 10, ty - 4, 8, 4, S.mid);
      body.fillRect(cx - 12, ty - 5, 3, 4, S.highlight);
    } else if (frame === 0) {
      body.fillRect(cx - 5, ty - 4, 4, 8, S.mid);
      body.fillRect(cx - 6, ty + 2, 3, 3, S.mid);
    } else {
      body.fillRect(cx - 1, ty - 4, 4, 8, S.mid);
      body.fillRect(cx - 2, ty + 3, 3, 3, S.mid);
    }
  }

  return body;
}

module.exports = { RACES, GENDERS, createBodySheet };
