// Distributed under the NetHack General Public License.
// Generator for Newt sprite sheet (class: lizards/newts, single yellow hue family)

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');

function createNewtSheet() {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderNewtCell(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function renderNewtCell(dir, frame) {
  const c = new Canvas(48, 48);
  const P = Palettes.newt;

  let yBob = 0;
  let xShift = 0;
  let tailWiggle = (frame === 0) ? -4 : (frame === 1 ? 4 : 0);

  if (frame === 0) {
    yBob = 0;
  } else if (frame === 1) {
    yBob = -1; // walk b bob
  } else if (frame === 2) {
    // Wind-up: coil body back
    yBob = 2;
    tailWiggle = -5;
    if (dir === 1) xShift = -3;
    if (dir === 3) xShift = 3;
  } else if (frame === 3) {
    // Strike: lunge forward, snap jaw & tongue!
    yBob = (dir === 2) ? 4 : (dir === 0 ? -2 : 1);
    if (dir === 1) xShift = 5;
    if (dir === 3) xShift = -5;
    tailWiggle = 5;
  }

  const cx = 24 + xShift;
  const hy = 25 + yBob;
  const by = 33 + yBob;

  if (dir === 2) {
    // === FACING DOWN ===
    // Tail curving behind
    c.fillCircle(cx + tailWiggle, by - 10, 3, P.bodyMid);
    c.fillCircle(cx + Math.round(tailWiggle * 1.5), by - 15, 2, P.bodyHi);
    c.setPixel(cx + Math.round(tailWiggle * 1.8), by - 18, P.bodyHi);

    // Splayed hind legs alternating
    const lLegY = (frame === 0) ? 43 : (frame === 1 ? 39 : 42);
    const rLegY = (frame === 1) ? 42 : (frame === 0 ? 39 : 42);
    c.fillRect(cx - 10, by, 4, 3, P.bodyMid);
    c.fillRect(cx - 12, lLegY - 3, 3, 4, P.bodyHi);
    c.fillRect(cx + 7, by, 4, 3, P.bodyShadow);
    c.fillRect(cx + 10, rLegY - 3, 3, 4, P.bodyMid);

    // Main salamander body
    c.fillEllipse(cx, by, 6, 8, P.bodyMid);
    c.fillRect(cx - 4, by - 5, 4, 7, P.bodyHi);
    c.fillRect(cx + 2, by - 3, 3, 7, P.bodyShadow);

    // Pale belly
    c.fillEllipse(cx, by + 1, 3, 5, P.belly);

    // Spots on back
    c.setPixel(cx - 1, by - 3, P.spots);
    c.setPixel(cx + 2, by - 1, P.spots);
    c.setPixel(cx - 2, by + 2, P.spots);

    // Front legs alternating
    const lArmY = (frame === 0) ? hy + 2 : hy + 5;
    const rArmY = (frame === 1) ? hy + 2 : hy + 5;
    c.fillRect(cx - 8, lArmY, 4, 3, P.bodyMid);
    c.fillRect(cx - 11, lArmY + 1, 3, 4, P.bodyHi);
    c.fillRect(cx + 5, rArmY, 4, 3, P.bodyShadow);
    c.fillRect(cx + 9, rArmY + 1, 3, 4, P.bodyMid);

    // Head
    c.fillCircle(cx, hy, 6, P.bodyMid);
    c.fillRect(cx - 4, hy - 4, 4, 4, P.bodyHi);
    c.fillRect(cx + 2, hy - 2, 3, 4, P.bodyShadow);

    // Bead eyes
    c.fillRect(cx - 6, hy - 2, 3, 3, OUTLINE);
    c.setPixel(cx - 5, hy - 2, P.eyeGlint);
    c.fillRect(cx + 4, hy - 2, 3, 3, OUTLINE);
    c.setPixel(cx + 4, hy - 2, P.eyeGlint);

    // Snout / mouth
    if (frame === 3) {
      c.fillRect(cx - 2, hy + 4, 4, 2, OUTLINE);
      c.fillRect(cx - 1, hy + 6, 3, 5, P.tongue);
      c.fillRect(cx - 2, hy + 10, 5, 2, P.tongue);
      c.setPixel(cx - 1, hy + 7, P.tongueShadow);
    } else if (frame === 2) {
      c.fillRect(cx - 2, hy + 3, 4, 2, OUTLINE);
      c.setPixel(cx, hy + 4, P.tongue);
    }

  } else if (dir === 0) {
    // === FACING UP (Show back, ears/head, tail shapes) ===
    // Wide salamander head with lateral eye turrets
    c.fillEllipse(cx, hy, 7, 5, P.bodyMid);
    c.fillRect(cx - 5, hy - 4, 5, 4, P.bodyHi);
    c.fillRect(cx + 1, hy - 3, 5, 4, P.bodyShadow);

    // Lateral bead eyes
    c.fillRect(cx - 7, hy - 2, 2, 2, OUTLINE);
    c.setPixel(cx - 7, hy - 2, P.eyeGlint);
    c.fillRect(cx + 6, hy - 2, 2, 2, OUTLINE);
    c.setPixel(cx + 6, hy - 2, P.eyeGlint);

    // Constricted neck
    c.fillRect(cx - 3, hy + 3, 6, 3, P.bodyShadow);

    // Dorsal body
    c.fillEllipse(cx, by, 6, 8, P.bodyMid);
    c.fillRect(cx - 4, by - 5, 4, 7, P.bodyHi);
    c.fillRect(cx + 2, by - 3, 3, 7, P.bodyShadow);

    // Alternating spots down spine
    c.setPixel(cx - 1, by - 4, P.spots);
    c.setPixel(cx + 1, by - 1, P.spots);
    c.setPixel(cx - 1, by + 2, P.spots);
    c.setPixel(cx + 1, by + 5, P.spots);

    // Splayed crawling legs alternating
    const lFrontY = (frame === 0) ? hy + 1 : hy + 4;
    const rFrontY = (frame === 1) ? hy + 1 : hy + 4;
    const lRearY = (frame === 0) ? by + 4 : by + 1;
    const rRearY = (frame === 1) ? by + 4 : by + 1;

    c.fillRect(cx - 11, lFrontY, 4, 3, P.bodyMid);
    c.fillRect(cx + 8, rFrontY, 4, 3, P.bodyShadow);
    c.fillRect(cx - 11, lRearY, 4, 3, P.bodyMid);
    c.fillRect(cx + 8, rRearY, 4, 3, P.bodyShadow);

    // Sinuous tail undulating left vs right!
    c.drawLine(cx, by + 6, cx + tailWiggle, by + 12, P.bodyMid);
    c.drawLine(cx + tailWiggle, by + 12, cx + tailWiggle * 2, by + 17, P.bodyHi);
    c.fillCircle(cx + tailWiggle * 2, by + 17, 2, P.bodyHi);

  } else if (dir === 1) {
    // === FACING RIGHT ===
    // Splayed stepping legs
    let fLegX = cx + 4, fLegY = 42;
    let bLegX = cx - 7, bLegY = 42;
    if (frame === 0) {
      fLegX = cx + 6; fLegY = 43;
      bLegX = cx - 8; bLegY = 40;
    } else if (frame === 1) {
      fLegX = cx + 2; fLegY = 40;
      bLegX = cx - 5; bLegY = 43;
    } else if (frame === 3) {
      fLegX = cx + 8; fLegY = 43;
      bLegX = cx - 9; bLegY = 41;
    }

    // Tail curving left & undulating
    const tailY1 = by - 4 + tailWiggle;
    const tailY2 = by - 8 + tailWiggle * 2;
    c.drawLine(cx - 7, by - 1, cx - 13, tailY1, P.bodyMid);
    c.drawLine(cx - 13, tailY1, cx - 18, tailY2, P.bodyHi);
    c.setPixel(cx - 19, tailY2, P.bodyHi);

    // Body
    c.fillEllipse(cx, by, 8, 5, P.bodyMid);
    c.fillRect(cx - 6, by - 4, 6, 4, P.bodyHi);
    c.fillRect(cx - 4, by + 1, 8, 2, P.belly);

    // Spots
    c.setPixel(cx - 4, by - 2, P.spots);
    c.setPixel(cx, by - 2, P.spots);

    // Legs
    c.fillRect(bLegX, bLegY - 4, 4, 5, P.bodyShadow);
    c.fillRect(fLegX, fLegY - 4, 4, 5, P.bodyMid);
    c.fillRect(fLegX, fLegY - 4, 2, 3, P.bodyHi);

    // Head
    c.fillCircle(cx + 6, hy, 5, P.bodyMid);
    c.fillRect(cx + 4, hy - 3, 4, 4, P.bodyHi);

    // Snout
    c.fillRect(cx + 9, hy, 4, 3, P.bodyMid);

    // Eye
    c.fillRect(cx + 7, hy - 2, 3, 3, OUTLINE);
    c.setPixel(cx + 8, hy - 2, P.eyeGlint);

    // Tongue
    if (frame === 3) {
      c.fillRect(cx + 12, hy + 1, 9, 2, P.tongue);
      c.fillRect(cx + 19, hy, 3, 4, P.tongue);
      c.setPixel(cx + 20, hy + 1, P.tongueShadow);
    } else if (frame === 2) {
      c.setPixel(cx + 12, hy + 1, P.tongue);
    }

  } else if (dir === 3) {
    // === FACING LEFT ===
    let fLegX = cx - 6, fLegY = 42;
    let bLegX = cx + 4, bLegY = 42;
    if (frame === 0) {
      fLegX = cx - 8; fLegY = 43;
      bLegX = cx + 5; bLegY = 40;
    } else if (frame === 1) {
      fLegX = cx - 4; fLegY = 40;
      bLegX = cx + 2; bLegY = 43;
    } else if (frame === 3) {
      fLegX = cx - 10; fLegY = 43;
      bLegX = cx + 6; bLegY = 41;
    }

    // Tail curving right & undulating
    const tailY1 = by - 4 + tailWiggle;
    const tailY2 = by - 8 + tailWiggle * 2;
    c.drawLine(cx + 7, by - 1, cx + 13, tailY1, P.bodyMid);
    c.drawLine(cx + 13, tailY1, cx + 18, tailY2, P.bodyHi);
    c.setPixel(cx + 19, tailY2, P.bodyHi);

    // Body
    c.fillEllipse(cx, by, 8, 5, P.bodyMid);
    c.fillRect(cx - 2, by - 4, 6, 4, P.bodyHi);
    c.fillRect(cx - 4, by + 1, 8, 2, P.belly);

    // Spots
    c.setPixel(cx + 3, by - 2, P.spots);
    c.setPixel(cx - 1, by - 2, P.spots);

    // Legs
    c.fillRect(bLegX, bLegY - 4, 4, 5, P.bodyShadow);
    c.fillRect(fLegX, fLegY - 4, 4, 5, P.bodyMid);
    c.fillRect(fLegX, fLegY - 4, 2, 3, P.bodyHi);

    // Head
    c.fillCircle(cx - 6, hy, 5, P.bodyMid);
    c.fillRect(cx - 8, hy - 3, 4, 4, P.bodyHi);

    // Snout
    c.fillRect(cx - 12, hy, 4, 3, P.bodyMid);

    // Eye
    c.fillRect(cx - 9, hy - 2, 3, 3, OUTLINE);
    c.setPixel(cx - 8, hy - 2, P.eyeGlint);

    // Tongue
    if (frame === 3) {
      c.fillRect(cx - 20, hy + 1, 9, 2, P.tongue);
      c.fillRect(cx - 21, hy, 3, 4, P.tongue);
      c.setPixel(cx - 20, hy + 1, P.tongueShadow);
    } else if (frame === 2) {
      c.setPixel(cx - 12, hy + 1, P.tongue);
    }
  }

  return c;
}

module.exports = { createNewtSheet };
