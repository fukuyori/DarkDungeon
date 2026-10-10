// Distributed under the NetHack General Public License.
// Generator for Jackal monster sprite sheet (class: canines, distinct from pet dog)

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');

function createJackalSheet() {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderJackalCell(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function renderJackalCell(dir, frame) {
  const c = new Canvas(48, 48);
  const P = Palettes.jackal;

  let yBob = 0;
  let xShift = 0;
  let tailWag = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);

  if (frame === 0) {
    yBob = 0;
  } else if (frame === 1) {
    yBob = -1; // walk b bob
  } else if (frame === 2) {
    // Wind-up: stalking crouch, ears flat back
    yBob = 2;
    if (dir === 1) xShift = -2;
    if (dir === 3) xShift = 2;
  } else if (frame === 3) {
    // Strike: ferocious pouncing bite!
    yBob = (dir === 2) ? 3 : (dir === 0 ? -1 : 1);
    if (dir === 1) xShift = 5;
    if (dir === 3) xShift = -5;
  }

  const cx = 24 + xShift;
  const hy = 20 + yBob; // Jackal head held high
  const by = 29 + yBob; // Lean body

  if (dir === 2) {
    // === FACING DOWN ===
    // Low bushy tail behind
    c.fillEllipse(cx + tailWag, by - 6, 3, 5, P.furShadow);

    // Lean predatory body
    c.fillEllipse(cx, by, 6, 8, P.furMid);
    c.fillRect(cx - 4, by - 5, 3, 7, P.furHi);
    c.fillRect(cx + 2, by - 3, 3, 7, P.furShadow);

    // Pale chest patch
    c.fillEllipse(cx, by, 3, 5, P.belly);

    // Legs & paws alternating
    const lPawY = (frame === 0) ? 43 : (frame === 1 ? 39 : 42);
    const rPawY = (frame === 1) ? 42 : (frame === 0 ? 39 : 42);
    c.fillRect(cx - 6, lPawY - 6, 3, 7, P.furMid);
    c.fillRect(cx - 6, lPawY - 6, 1, 6, P.furHi);
    c.fillRect(cx + 3, rPawY - 6, 3, 7, P.furShadow);

    // Jackal Head
    c.fillCircle(cx, hy, 6, P.furMid);
    c.fillRect(cx - 4, hy - 4, 4, 4, P.furHi);
    c.fillRect(cx + 2, hy - 2, 3, 4, P.furShadow);

    // Tall pointed upright ears
    if (frame === 2) {
      // Flattened back in crouch
      c.fillRect(cx - 7, hy - 5, 4, 3, P.furMid);
      c.fillRect(cx + 3, hy - 5, 4, 3, P.furShadow);
    } else {
      c.fillRect(cx - 6, hy - 8, 3, 5, P.furMid);
      c.fillRect(cx - 5, hy - 7, 2, 4, P.innerEar);
      c.setPixel(cx - 5, hy - 9, P.furHi);

      c.fillRect(cx + 3, hy - 8, 3, 5, P.furShadow);
      c.fillRect(cx + 4, hy - 7, 2, 4, P.innerEar);
      c.setPixel(cx + 4, hy - 9, P.furShadow);
    }

    // Snout
    c.fillRect(cx - 2, hy + 2, 4, 3, P.snout);

    // Amber eyes
    c.fillRect(cx - 4, hy - 1, 2, 2, P.eyes);
    c.fillRect(cx + 2, hy - 1, 2, 2, P.eyes);

    // Bite / fangs
    if (frame === 3) {
      c.fillRect(cx - 3, hy + 2, 6, 6, OUTLINE);
      c.fillRect(cx - 2, hy + 3, 4, 4, P.throat);
      c.setPixel(cx - 2, hy + 2, P.fangs);
      c.setPixel(cx + 1, hy + 2, P.fangs);
      c.setPixel(cx - 2, hy + 6, P.fangs);
      c.setPixel(cx + 1, hy + 6, P.fangs);
    } else if (frame === 2) {
      c.fillRect(cx - 2, hy + 3, 4, 1, P.fangs);
    }

  } else if (dir === 0) {
    // === FACING UP ===
    // Head from behind
    c.fillCircle(cx, hy, 6, P.furMid);
    c.fillRect(cx - 4, hy - 4, 4, 4, P.furHi);
    c.fillRect(cx + 2, hy - 2, 3, 4, P.furShadow);

    // Tall pointed ears
    c.fillRect(cx - 6, hy - 8, 3, 5, P.furMid);
    c.setPixel(cx - 5, hy - 9, P.furHi);
    c.fillRect(cx + 3, hy - 8, 3, 5, P.furShadow);
    c.setPixel(cx + 4, hy - 9, P.furShadow);

    // Body
    c.fillEllipse(cx, by, 6, 8, P.furMid);
    c.fillRect(cx - 4, by - 5, 3, 7, P.furHi);
    c.fillRect(cx + 2, by - 3, 3, 7, P.furShadow);

    // Legs
    const lPawY = (frame === 0) ? 43 : (frame === 1 ? 39 : 42);
    const rPawY = (frame === 1) ? 42 : (frame === 0 ? 39 : 42);
    c.fillRect(cx - 6, lPawY - 5, 3, 6, P.furMid);
    c.fillRect(cx + 3, rPawY - 5, 3, 6, P.furShadow);

    // Bushy low tail
    c.drawLine(cx, by + 4, cx + tailWag * 2, by + 11, P.furShadow);
    c.fillCircle(cx + tailWag * 2, by + 11, 2, P.furShadow);

  } else if (dir === 1) {
    // === FACING RIGHT ===
    // Real steps!
    // Forelegs and Hindlegs alternate
    let fLegX = cx + 3, fLegY = 42;
    let bLegX = cx - 7, bLegY = 42;
    let tailTipY = by + 5;
    if (frame === 0) {
      // Walk A: Foreleg forward, Hindleg back
      fLegX = cx + 5; fLegY = 43;
      bLegX = cx - 8; bLegY = 40;
      tailTipY = by + 6;
    } else if (frame === 1) {
      // Walk B: Foreleg back, Hindleg forward
      fLegX = cx + 1; fLegY = 40;
      bLegX = cx - 5; bLegY = 43;
      tailTipY = by + 2;
    } else if (frame === 3) {
      fLegX = cx + 7; fLegY = 43;
      bLegX = cx - 9; bLegY = 41;
      tailTipY = by + 7;
    }

    // Bushy tail
    c.drawLine(cx - 7, by, cx - 13, tailTipY, P.furShadow);
    c.fillCircle(cx - 14, tailTipY, 2, P.furShadow);

    // Body
    c.fillEllipse(cx - 1, by, 9, 5, P.furMid);
    c.fillRect(cx - 7, by - 4, 5, 4, P.furHi);
    c.fillRect(cx - 2, by + 1, 6, 2, P.belly);

    // Hindleg & Foreleg
    c.fillRect(bLegX, bLegY - 6, 3, 7, P.furShadow);
    c.fillRect(fLegX, fLegY - 6, 3, 7, P.furMid);
    c.fillRect(fLegX, fLegY - 6, 1, 6, P.furHi);

    // Head
    c.fillCircle(cx + 4, hy, 5, P.furMid);
    c.fillRect(cx + 2, hy - 3, 3, 3, P.furHi);

    // Ear
    if (frame === 2) {
      c.fillRect(cx, hy - 5, 4, 3, P.furMid);
    } else {
      c.fillRect(cx + 2, hy - 8, 3, 5, P.furMid);
      c.setPixel(cx + 3, hy - 9, P.furHi);
      c.fillRect(cx + 3, hy - 6, 1, 3, P.innerEar);
    }

    // Muzzle
    c.fillRect(cx + 8, hy, 5, 3, P.snout);

    // Eye
    c.fillRect(cx + 5, hy - 1, 2, 2, P.eyes);

    // Bite
    if (frame === 3) {
      c.fillRect(cx + 8, hy, 7, 7, OUTLINE);
      c.fillRect(cx + 9, hy + 1, 5, 5, P.throat);
      c.setPixel(cx + 12, hy, P.fangs);
      c.setPixel(cx + 12, hy + 6, P.fangs);
    } else if (frame === 2) {
      c.fillRect(cx + 8, hy + 2, 3, 1, P.fangs);
    }

  } else if (dir === 3) {
    // === FACING LEFT ===
    // Real steps!
    let fLegX = cx - 6, fLegY = 42;
    let bLegX = cx + 4, bLegY = 42;
    let tailTipY = by + 5;
    if (frame === 0) {
      fLegX = cx - 8; fLegY = 43;
      bLegX = cx + 5; bLegY = 40;
      tailTipY = by + 6;
    } else if (frame === 1) {
      fLegX = cx - 4; fLegY = 40;
      bLegX = cx + 2; bLegY = 43;
      tailTipY = by + 2;
    } else if (frame === 3) {
      fLegX = cx - 10; fLegY = 43;
      bLegX = cx + 6; bLegY = 41;
      tailTipY = by + 7;
    }

    // Bushy tail
    c.drawLine(cx + 7, by, cx + 13, tailTipY, P.furShadow);
    c.fillCircle(cx + 14, tailTipY, 2, P.furShadow);

    // Body
    c.fillEllipse(cx + 1, by, 9, 5, P.furMid);
    c.fillRect(cx - 2, by - 4, 5, 4, P.furHi);
    c.fillRect(cx - 4, by + 1, 6, 2, P.belly);

    // Legs
    c.fillRect(bLegX, bLegY - 6, 3, 7, P.furShadow);
    c.fillRect(fLegX, fLegY - 6, 3, 7, P.furMid);
    c.fillRect(fLegX, fLegY - 6, 1, 6, P.furHi);

    // Head
    c.fillCircle(cx - 4, hy, 5, P.furMid);
    c.fillRect(cx - 5, hy - 3, 3, 3, P.furHi);

    // Ear
    if (frame === 2) {
      c.fillRect(cx - 4, hy - 5, 4, 3, P.furMid);
    } else {
      c.fillRect(cx - 5, hy - 8, 3, 5, P.furMid);
      c.setPixel(cx - 4, hy - 9, P.furHi);
      c.fillRect(cx - 4, hy - 6, 1, 3, P.innerEar);
    }

    // Muzzle
    c.fillRect(cx - 13, hy, 5, 3, P.snout);

    // Eye
    c.fillRect(cx - 7, hy - 1, 2, 2, P.eyes);

    // Bite
    if (frame === 3) {
      c.fillRect(cx - 15, hy, 7, 7, OUTLINE);
      c.fillRect(cx - 14, hy + 1, 5, 5, P.throat);
      c.setPixel(cx - 13, hy, P.fangs);
      c.setPixel(cx - 13, hy + 6, P.fangs);
    } else if (frame === 2) {
      c.fillRect(cx - 11, hy + 2, 3, 1, P.fangs);
    }
  }

  return c;
}

module.exports = { createJackalSheet };
