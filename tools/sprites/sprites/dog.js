// Distributed under the NetHack General Public License.
// Generator for Pet Dog sprite sheet (4x4 layout, attack = bite)

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');

function createDogSheet() {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderDogCell(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function renderDogCell(dir, frame) {
  const c = new Canvas(48, 48);
  const P = Palettes.dog;

  let yBob = 0;
  let xShift = 0;
  let tailWag = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);

  if (frame === 0) {
    yBob = 0;
  } else if (frame === 1) {
    yBob = -1; // walk b bob
  } else if (frame === 2) {
    // Wind-up: crouch down low on haunches
    yBob = 2;
    if (dir === 1) xShift = -2;
    if (dir === 3) xShift = 2;
  } else if (frame === 3) {
    // Strike: lunge forward, jaws open for bite!
    yBob = (dir === 2) ? 3 : (dir === 0 ? -1 : 1);
    if (dir === 1) xShift = 5;
    if (dir === 3) xShift = -5;
  }

  const cx = 24 + xShift;
  const hy = 22 + yBob; // Head center Y
  const by = 30 + yBob; // Body center Y

  if (dir === 2) {
    // === FACING DOWN ===
    // Tail wagging behind
    c.fillCircle(cx + tailWag * 2, by - 8, 3, P.furMid);
    c.setPixel(cx + tailWag * 2, by - 11, P.furHi);

    // Body (torso)
    c.fillEllipse(cx, by, 7, 8, P.furMid);
    c.fillRect(cx - 5, by - 4, 4, 7, P.furHi);
    c.fillRect(cx + 2, by - 2, 4, 7, P.furShadow);

    // Cream chest blaze
    c.fillEllipse(cx, by + 1, 4, 5, P.belly);
    c.fillRect(cx - 2, by - 1, 2, 4, P.white);

    // Red Collar with golden tag
    c.fillRect(cx - 5, hy + 5, 10, 2, P.collarMid);
    c.fillRect(cx - 5, hy + 5, 3, 1, P.collarHi);
    c.setPixel(cx, hy + 7, P.tag);

    // Paws / Legs alternating
    const lPawY = (frame === 0) ? 43 : (frame === 1 ? 39 : 42);
    const rPawY = (frame === 1) ? 42 : (frame === 0 ? 39 : 42);
    c.fillRect(cx - 6, lPawY - 4, 4, 5, P.furMid);
    c.fillRect(cx - 6, lPawY - 4, 2, 4, P.furHi);
    c.fillRect(cx + 2, rPawY - 4, 4, 5, P.furShadow);
    c.fillRect(cx - 6, lPawY - 1, 4, 2, P.belly);
    c.fillRect(cx + 2, rPawY - 1, 4, 2, P.bellyShadow);

    // Head
    c.fillCircle(cx, hy, 7, P.furMid);
    c.fillRect(cx - 5, hy - 4, 5, 5, P.furHi);
    c.fillRect(cx + 2, hy - 2, 4, 5, P.furShadow);

    // Floppy ears
    c.fillRect(cx - 9, hy - 3, 4, 8, P.furShadow);
    c.fillRect(cx - 8, hy - 2, 2, 6, P.furMid);
    c.fillRect(cx + 6, hy - 3, 4, 8, P.furShadow);
    c.fillRect(cx + 6, hy - 2, 2, 6, P.furMid);

    // Cream muzzle & dark nose
    c.fillEllipse(cx, hy + 2, 4, 3, P.belly);
    c.fillRect(cx - 1, hy, 3, 2, OUTLINE);

    // Eyes
    c.fillRect(cx - 4, hy - 2, 2, 2, OUTLINE);
    c.setPixel(cx - 4, hy - 2, P.white);
    c.fillRect(cx + 2, hy - 2, 2, 2, OUTLINE);
    c.setPixel(cx + 2, hy - 2, P.white);

    // Bite in Strike
    if (frame === 3) {
      c.fillRect(cx - 4, hy + 2, 8, 6, OUTLINE);
      c.fillRect(cx - 3, hy + 3, 6, 4, P.tongue);
      c.setPixel(cx - 3, hy + 2, P.white);
      c.setPixel(cx + 2, hy + 2, P.white);
      c.setPixel(cx - 2, hy + 6, P.white);
      c.setPixel(cx + 1, hy + 6, P.white);
    } else if (frame === 2) {
      c.fillRect(cx - 2, hy + 3, 4, 1, P.white);
    }

  } else if (dir === 0) {
    // === FACING UP (Show back, ears/head, collar, tail shapes) ===
    // Head from behind
    c.fillCircle(cx, hy, 7, P.furMid);
    c.fillRect(cx - 5, hy - 5, 6, 4, P.furHi);
    c.fillRect(cx + 1, hy - 3, 5, 5, P.furShadow);

    // Floppy ears framing head
    c.fillRect(cx - 9, hy - 3, 4, 8, P.furShadow);
    c.fillRect(cx - 8, hy - 2, 2, 6, P.furMid);
    c.fillRect(cx + 5, hy - 3, 4, 8, P.furShadow);
    c.fillRect(cx + 6, hy - 2, 2, 6, P.furMid);

    // Red Collar with gold tag peeking between head and back
    c.fillRect(cx - 5, hy + 5, 10, 2, P.collarMid);
    c.fillRect(cx - 5, hy + 5, 3, 1, P.collarHi);
    c.setPixel(cx, hy + 6, P.tag);

    // Back / Torso with distinct dorsal definition
    c.fillEllipse(cx, by, 7, 8, P.furMid);
    c.fillRect(cx - 5, by - 4, 4, 7, P.furHi);
    c.fillRect(cx + 2, by - 2, 4, 7, P.furShadow);
    c.fillRect(cx - 1, by - 2, 2, 6, P.furShadow); // spine definition

    // Hind legs alternating
    const lPawY = (frame === 0) ? 43 : (frame === 1 ? 39 : 42);
    const rPawY = (frame === 1) ? 42 : (frame === 0 ? 39 : 42);
    c.fillRect(cx - 6, lPawY - 4, 4, 5, P.furMid);
    c.fillRect(cx + 2, rPawY - 4, 4, 5, P.furShadow);

    // Upright wagging tail with fluffy white tip
    const tailX = cx + tailWag * 3;
    c.drawLine(cx, by + 3, tailX, by - 8, P.furMid);
    c.fillCircle(tailX, by - 8, 2, P.furHi);
    c.setPixel(tailX, by - 10, P.white);

  } else if (dir === 1) {
    // === FACING RIGHT ===
    // Foreleg & Hindleg stepping
    let fLegX = cx + 3, fLegY = 42;
    let bLegX = cx - 7, bLegY = 42;
    let tailY = by - 7 + tailWag * 2;
    if (frame === 0) {
      fLegX = cx + 5; fLegY = 43;
      bLegX = cx - 8; bLegY = 40;
    } else if (frame === 1) {
      fLegX = cx + 1; fLegY = 40;
      bLegX = cx - 5; bLegY = 43;
    } else if (frame === 3) {
      fLegX = cx + 7; fLegY = 43;
      bLegX = cx - 9; bLegY = 41;
    }

    // Tail on left
    c.drawLine(cx - 8, by - 2, cx - 14, tailY, P.furMid);
    c.fillCircle(cx - 14, tailY, 2, P.furHi);
    c.setPixel(cx - 15, tailY - 1, P.white);

    // Torso
    c.fillEllipse(cx - 2, by, 9, 6, P.furMid);
    c.fillRect(cx - 8, by - 4, 5, 5, P.furHi);
    c.fillRect(cx - 2, by + 1, 6, 3, P.belly);

    // Legs
    c.fillRect(bLegX, bLegY - 5, 4, 6, P.furShadow);
    c.fillRect(fLegX, fLegY - 5, 4, 6, P.furMid);
    c.fillRect(fLegX, fLegY - 5, 2, 4, P.furHi);

    // Neck & Collar
    c.fillRect(cx + 3, hy + 3, 3, 4, P.collarMid);
    c.setPixel(cx + 5, hy + 6, P.tag);

    // Head
    c.fillCircle(cx + 5, hy, 6, P.furMid);
    c.fillRect(cx + 2, hy - 4, 4, 4, P.furHi);

    // Ear
    c.fillRect(cx, hy - 3, 3, 7, P.furShadow);

    // Snout
    c.fillRect(cx + 9, hy, 5, 4, P.belly);
    c.fillRect(cx + 12, hy, 2, 2, OUTLINE);

    // Eye
    c.fillRect(cx + 6, hy - 2, 2, 2, OUTLINE);
    c.setPixel(cx + 6, hy - 2, P.white);

    // Bite
    if (frame === 3) {
      c.fillRect(cx + 9, hy + 1, 8, 7, OUTLINE);
      c.fillRect(cx + 10, hy + 2, 6, 5, P.tongue);
      c.setPixel(cx + 13, hy + 1, P.white);
      c.setPixel(cx + 13, hy + 7, P.white);
    } else if (frame === 2) {
      c.fillRect(cx + 9, hy + 3, 4, 1, P.white);
    }

  } else if (dir === 3) {
    // === FACING LEFT ===
    let fLegX = cx - 6, fLegY = 42;
    let bLegX = cx + 4, bLegY = 42;
    let tailY = by - 7 + tailWag * 2;
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

    // Tail on right
    c.drawLine(cx + 8, by - 2, cx + 14, tailY, P.furMid);
    c.fillCircle(cx + 14, tailY, 2, P.furHi);
    c.setPixel(cx + 15, tailY - 1, P.white);

    // Torso
    c.fillEllipse(cx + 2, by, 9, 6, P.furMid);
    c.fillRect(cx - 2, by - 4, 5, 5, P.furHi);
    c.fillRect(cx - 4, by + 1, 6, 3, P.belly);

    // Legs
    c.fillRect(bLegX, bLegY - 5, 4, 6, P.furShadow);
    c.fillRect(fLegX, fLegY - 5, 4, 6, P.furMid);
    c.fillRect(fLegX, fLegY - 5, 2, 4, P.furHi);

    // Collar
    c.fillRect(cx - 5, hy + 3, 3, 4, P.collarMid);
    c.setPixel(cx - 5, hy + 6, P.tag);

    // Head
    c.fillCircle(cx - 5, hy, 6, P.furMid);
    c.fillRect(cx - 7, hy - 4, 4, 4, P.furHi);

    // Ear
    c.fillRect(cx - 2, hy - 3, 3, 7, P.furShadow);

    // Snout
    c.fillRect(cx - 13, hy, 5, 4, P.belly);
    c.fillRect(cx - 14, hy, 2, 2, OUTLINE);

    // Eye
    c.fillRect(cx - 8, hy - 2, 2, 2, OUTLINE);
    c.setPixel(cx - 8, hy - 2, P.white);

    // Bite
    if (frame === 3) {
      c.fillRect(cx - 17, hy + 1, 8, 7, OUTLINE);
      c.fillRect(cx - 16, hy + 2, 6, 5, P.tongue);
      c.setPixel(cx - 14, hy + 1, P.white);
      c.setPixel(cx - 14, hy + 7, P.white);
    } else if (frame === 2) {
      c.fillRect(cx - 13, hy + 3, 4, 1, P.white);
    }
  }

  return c;
}

module.exports = { createDogSheet };
