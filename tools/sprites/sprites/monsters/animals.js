// Distributed under the NetHack General Public License.
// Generators for Animal monster classes: ant, dog, feline, rodent, spider, bat, snake, lizard, quadruped

const Canvas = require('../../canvas');
const { createMonsterSheetFromRenderer, getMonsterKinematics, G } = require('./base');

// 1. Ant (insects)
function renderAntCell(dir, frame) {
  const c = new Canvas(48, 48);
  let yBob = (frame === 1) ? -1 : 0;
  let xShift = (frame === 2) ? ((dir === 1) ? -2 : (dir === 3 ? 2 : 0)) : (frame === 3 ? ((dir === 1) ? 5 : (dir === 3 ? -5 : 0)) : 0);
  if (frame === 3 && dir === 2) yBob = 3;
  if (frame === 3 && dir === 0) yBob = -2;

  const cx = 24 + xShift;
  const cy = 24 + yBob;
  const legStep = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -1 : 3));

  if (dir === 2) {
    // Abdomen rear, thorax center, head bottom
    c.fillEllipse(cx, cy - 8, 7, 6, G.mid);
    c.fillRect(cx - 4, cy - 11, 4, 4, G.hi);
    c.fillRect(cx + 1, cy - 10, 4, 5, G.shadow);

    c.fillCircle(cx, cy - 1, 4, G.dark);
    c.fillCircle(cx, cy + 6, 5, G.mid);
    c.fillRect(cx - 3, cy + 5, 2, 2, G.redEye);
    c.fillRect(cx + 2, cy + 5, 2, 2, G.redEye);

    // 6 Bent legs
    c.drawLine(cx - 4, cy - 2, cx - 11 + legStep, cy - 4, G.dark);
    c.drawLine(cx - 11 + legStep, cy - 4, cx - 14 + legStep, cy + 3, G.dark);
    c.drawLine(cx + 4, cy - 2, cx + 11 - legStep, cy - 4, G.dark);
    c.drawLine(cx + 11 - legStep, cy - 4, cx + 14 - legStep, cy + 3, G.dark);

    c.drawLine(cx - 4, cy + 1, cx - 13 - legStep, cy + 4, G.dark);
    c.drawLine(cx - 13 - legStep, cy + 4, cx - 15 - legStep, cy + 11, G.dark);
    c.drawLine(cx + 4, cy + 1, cx + 13 + legStep, cy + 4, G.dark);
    c.drawLine(cx + 13 + legStep, cy + 4, cx + 15 + legStep, cy + 11, G.dark);

    // Mandibles
    if (frame === 3) {
      c.drawLine(cx - 3, cy + 9, cx - 5, cy + 14, G.white);
      c.drawLine(cx + 3, cy + 9, cx + 5, cy + 14, G.white);
      c.drawLine(cx - 1, cy + 10, cx + 1, cy + 10, G.redEye);
    } else {
      c.drawLine(cx - 2, cy + 9, cx - 1, cy + 12, G.white);
      c.drawLine(cx + 2, cy + 9, cx + 1, cy + 12, G.white);
    }

  } else if (dir === 0) {
    c.fillCircle(cx, cy - 8, 5, G.mid);
    c.fillCircle(cx, cy - 1, 4, G.dark);
    c.fillEllipse(cx, cy + 7, 7, 6, G.mid);
    c.fillRect(cx - 4, cy + 4, 4, 4, G.hi);

    c.drawLine(cx - 4, cy - 2, cx - 12 + legStep, cy - 5, G.dark);
    c.drawLine(cx + 4, cy - 2, cx + 12 - legStep, cy - 5, G.dark);
    c.drawLine(cx - 4, cy + 2, cx - 13 - legStep, cy + 6, G.dark);
    c.drawLine(cx + 4, cy + 2, cx + 13 + legStep, cy + 6, G.dark);

    // Antennae
    c.drawLine(cx - 2, cy - 11, cx - 6 + legStep, cy - 17, G.dark);
    c.drawLine(cx + 2, cy - 11, cx + 6 - legStep, cy - 17, G.dark);

  } else if (dir === 1) {
    // Facing Right
    c.fillEllipse(cx - 8, cy, 7, 5, G.mid);
    c.fillRect(cx - 11, cy - 3, 4, 3, G.hi);
    c.fillCircle(cx, cy, 4, G.dark);
    c.fillCircle(cx + 6, cy + 1, 5, G.mid);
    c.fillRect(cx + 8, cy - 1, 2, 2, G.redEye);

    c.drawLine(cx - 6, cy + 2, cx - 9 - legStep, cy + 11, G.dark);
    c.drawLine(cx, cy + 2, cx + 2 + legStep, cy + 11, G.dark);
    c.drawLine(cx + 4, cy + 2, cx + 9 - legStep, cy + 11, G.dark);

    if (frame === 3) {
      c.drawLine(cx + 10, cy + 1, cx + 16, cy + 3, G.white);
      c.drawLine(cx + 10, cy + 3, cx + 16, cy + 5, G.white);
    } else {
      c.drawLine(cx + 9, cy + 1, cx + 12, cy + 3, G.white);
    }

  } else if (dir === 3) {
    // Facing Left
    c.fillEllipse(cx + 8, cy, 7, 5, G.mid);
    c.fillRect(cx + 7, cy - 3, 4, 3, G.hi);
    c.fillCircle(cx, cy, 4, G.dark);
    c.fillCircle(cx - 6, cy + 1, 5, G.mid);
    c.fillRect(cx - 9, cy - 1, 2, 2, G.redEye);

    c.drawLine(cx + 6, cy + 2, cx + 9 + legStep, cy + 11, G.dark);
    c.drawLine(cx, cy + 2, cx - 2 - legStep, cy + 11, G.dark);
    c.drawLine(cx - 4, cy + 2, cx - 9 + legStep, cy + 11, G.dark);

    if (frame === 3) {
      c.drawLine(cx - 10, cy + 1, cx - 16, cy + 3, G.white);
      c.drawLine(cx - 10, cy + 3, cx - 16, cy + 5, G.white);
    } else {
      c.drawLine(cx - 9, cy + 1, cx - 12, cy + 3, G.white);
    }
  }

  return c;
}

// 2. Dog (canines - class grayscale dog)
function renderDogClassCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const hy = 20 + dy;
  const by = 28 + dy;
  const tailWag = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));

  if (dir === 2) {
    c.drawLine(cx, by + 4, cx + tailWag * 2, by - 8, G.mid);
    c.fillEllipse(cx, by, 7, 7, G.mid);
    c.fillRect(cx - 4, by - 4, 4, 6, G.hi);
    c.fillRect(cx + 1, by - 2, 4, 6, G.shadow);

    // Legs
    const lPawY = (frame === 0) ? 41 : (frame === 1 ? 38 : 40);
    const rPawY = (frame === 1) ? 41 : (frame === 0 ? 38 : 40);
    c.fillRect(cx - 6, lPawY - 4, 4, 5, G.mid);
    c.fillRect(cx + 2, rPawY - 4, 4, 5, G.shadow);

    // Head & Ears
    c.fillCircle(cx, hy, 6, G.mid);
    c.fillRect(cx - 8, hy - 2, 3, 6, G.dark);
    c.fillRect(cx + 5, hy - 2, 3, 6, G.dark);
    c.fillRect(cx - 3, hy - 1, 2, 2, G.redEye);
    c.fillRect(cx + 2, hy - 1, 2, 2, G.redEye);

    if (frame === 3) {
      c.fillRect(cx - 3, hy + 3, 6, 5, G.dark);
      c.setPixel(cx - 2, hy + 3, G.white);
      c.setPixel(cx + 1, hy + 3, G.white);
      c.setPixel(cx, hy + 5, [220, 40, 40, 255]); // red tongue
    } else {
      c.fillRect(cx - 2, hy + 3, 4, 2, G.dark);
    }

  } else if (dir === 0) {
    c.fillEllipse(cx, by, 7, 7, G.mid);
    c.fillRect(cx - 4, by - 4, 4, 6, G.hi);
    c.fillCircle(cx, hy, 6, G.shadow);
    c.fillRect(cx - 8, hy - 2, 3, 6, G.dark);
    c.fillRect(cx + 5, hy - 2, 3, 6, G.dark);

    const tailX = cx + tailWag * 3;
    c.drawLine(cx, by + 4, tailX, by - 8, G.hi);

    const lPawY = (frame === 0) ? 41 : (frame === 1 ? 38 : 40);
    const rPawY = (frame === 1) ? 41 : (frame === 0 ? 38 : 40);
    c.fillRect(cx - 6, lPawY - 4, 4, 5, G.mid);
    c.fillRect(cx + 2, rPawY - 4, 4, 5, G.shadow);

    if (frame === 3) {
      c.drawLine(cx - 3, hy - 7, cx - 5, hy - 11, G.white);
      c.drawLine(cx + 3, hy - 7, cx + 5, hy - 11, G.white);
    }

  } else if (dir === 1) {
    c.drawLine(cx - 7, by, cx - 13, by - 5 + tailWag, G.mid);
    c.fillEllipse(cx - 1, by, 8, 6, G.mid);
    c.fillRect(cx - 6, by - 3, 5, 4, G.hi);

    let fLegX = (frame === 0) ? cx + 4 : (frame === 1 ? cx + 1 : cx + 5);
    let bLegX = (frame === 0) ? cx - 6 : (frame === 1 ? cx - 3 : cx - 7);
    c.fillRect(bLegX, 35, 4, 6, G.shadow);
    c.fillRect(fLegX, 35, 4, 6, G.mid);

    c.fillCircle(cx + 5, hy, 5, G.mid);
    c.fillRect(cx + 1, hy - 4, 3, 5, G.dark);
    c.fillRect(cx + 6, hy - 2, 2, 2, G.redEye);
    c.fillRect(cx + 8, hy, 4, 3, G.dark);

    if (frame === 3) {
      c.fillRect(cx + 9, hy + 1, 6, 5, G.dark);
      c.setPixel(cx + 11, hy + 1, G.white);
      c.setPixel(cx + 11, hy + 4, [220, 40, 40, 255]);
    }

  } else if (dir === 3) {
    c.drawLine(cx + 7, by, cx + 13, by - 5 + tailWag, G.mid);
    c.fillEllipse(cx + 1, by, 8, 6, G.mid);
    c.fillRect(cx + 2, by - 3, 5, 4, G.hi);

    let fLegX = (frame === 0) ? cx - 7 : (frame === 1 ? cx - 4 : cx - 8);
    let bLegX = (frame === 0) ? cx + 3 : (frame === 1 ? cx : cx + 4);
    c.fillRect(bLegX, 35, 4, 6, G.shadow);
    c.fillRect(fLegX, 35, 4, 6, G.mid);

    c.fillCircle(cx - 5, hy, 5, G.mid);
    c.fillRect(cx - 3, hy - 4, 3, 5, G.dark);
    c.fillRect(cx - 7, hy - 2, 2, 2, G.redEye);
    c.fillRect(cx - 11, hy, 4, 3, G.dark);

    if (frame === 3) {
      c.fillRect(cx - 14, hy + 1, 6, 5, G.dark);
      c.setPixel(cx - 12, hy + 1, G.white);
      c.setPixel(cx - 12, hy + 4, [220, 40, 40, 255]);
    }
  }

  return c;
}

// 3. Feline (cats, panthers - sleek, agile, claw swipe)
function renderFelineCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const hy = 18 + dy;
  const by = 27 + dy;
  const tailSway = (frame === 0) ? -3 : (frame === 1 ? 3 : (frame === 2 ? -4 : 4));

  if (dir === 2) {
    // Sleek cat body
    c.fillEllipse(cx, by, 6, 8, G.mid);
    c.fillRect(cx - 4, by - 5, 4, 6, G.hi);

    const lY = (frame === 0) ? 41 : 38;
    const rY = (frame === 1) ? 41 : 38;
    c.fillRect(cx - 6, lY - 4, 3, 5, G.mid);
    c.fillRect(cx + 3, rY - 4, 3, 5, G.shadow);

    // Head with triangular pricked ears
    c.fillCircle(cx, hy, 6, G.mid);
    c.drawLine(cx - 5, hy - 4, cx - 6, hy - 9, G.hi);
    c.drawLine(cx + 5, hy - 4, cx + 6, hy - 9, G.shadow);

    // Glowing green/yellow cat eyes
    c.fillRect(cx - 4, hy - 1, 2, 2, G.yellowEye);
    c.fillRect(cx + 2, hy - 1, 2, 2, G.yellowEye);

    if (frame === 3) {
      // Claws slashing!
      c.drawLine(cx - 10, by + 4, cx - 4, by + 10, G.white);
      c.drawLine(cx + 10, by + 4, cx + 4, by + 10, G.white);
      c.drawLine(cx - 12, by + 2, cx - 3, by + 12, [180, 220, 255, 255]);
    }

  } else if (dir === 0) {
    c.fillEllipse(cx, by, 6, 8, G.mid);
    c.fillCircle(cx, hy, 6, G.shadow);
    c.drawLine(cx - 5, hy - 4, cx - 6, hy - 9, G.mid);
    c.drawLine(cx + 5, hy - 4, cx + 6, hy - 9, G.shadow);

    // Arched curled tail
    c.drawLine(cx, by + 5, cx + tailSway, by - 7, G.hi);
    c.fillCircle(cx + tailSway, by - 7, 2, G.white);

    const lY = (frame === 0) ? 41 : 38;
    const rY = (frame === 1) ? 41 : 38;
    c.fillRect(cx - 6, lY - 4, 3, 5, G.mid);
    c.fillRect(cx + 3, rY - 4, 3, 5, G.shadow);

    if (frame === 3) {
      c.drawLine(cx - 8, hy - 4, cx - 14, hy - 10, G.white);
      c.drawLine(cx + 8, hy - 4, cx + 14, hy - 10, G.white);
    }

  } else if (dir === 1) {
    c.drawLine(cx - 8, by - 1, cx - 14, by - 8 + tailSway, G.hi);
    c.fillEllipse(cx - 1, by, 9, 5, G.mid);
    c.fillRect(cx - 6, by - 3, 5, 3, G.hi);

    let fLegX = (frame === 0) ? cx + 4 : cx + 1;
    let bLegX = (frame === 0) ? cx - 7 : cx - 4;
    c.fillRect(bLegX, 34, 3, 7, G.shadow);
    c.fillRect(fLegX, 34, 3, 7, G.mid);

    c.fillCircle(cx + 5, hy, 5, G.mid);
    c.drawLine(cx + 4, hy - 4, cx + 5, hy - 9, G.hi);
    c.fillRect(cx + 6, hy - 2, 2, 2, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx + 10, hy, cx + 17, hy + 5, G.white);
      c.drawLine(cx + 10, hy + 3, cx + 16, hy + 8, [180, 220, 255, 255]);
    }

  } else if (dir === 3) {
    c.drawLine(cx + 8, by - 1, cx + 14, by - 8 + tailSway, G.hi);
    c.fillEllipse(cx + 1, by, 9, 5, G.mid);
    c.fillRect(cx + 2, by - 3, 5, 3, G.hi);

    let fLegX = (frame === 0) ? cx - 6 : cx - 3;
    let bLegX = (frame === 0) ? cx + 5 : cx + 2;
    c.fillRect(bLegX, 34, 3, 7, G.shadow);
    c.fillRect(fLegX, 34, 3, 7, G.mid);

    c.fillCircle(cx - 5, hy, 5, G.mid);
    c.drawLine(cx - 4, hy - 4, cx - 5, hy - 9, G.hi);
    c.fillRect(cx - 7, hy - 2, 2, 2, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx - 10, hy, cx - 17, hy + 5, G.white);
      c.drawLine(cx - 10, hy + 3, cx - 16, hy + 8, [180, 220, 255, 255]);
    }
  }

  return c;
}

// 4. Rodent (sewer rat - pointed snout, naked tail, scurrying paws)
function renderRodentCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const hy = 22 + dy;
  const by = 28 + dy;
  const tailSway = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));

  if (dir === 2) {
    c.fillEllipse(cx, by, 7, 7, G.mid);
    c.fillRect(cx - 4, by - 4, 4, 5, G.hi);

    const lY = (frame === 0) ? 41 : 38;
    const rY = (frame === 1) ? 41 : 38;
    c.fillRect(cx - 6, lY - 3, 3, 4, G.mid);
    c.fillRect(cx + 3, rY - 3, 3, 4, G.shadow);

    c.fillCircle(cx, hy, 5, G.mid);
    c.fillCircle(cx - 6, hy - 3, 2, G.hi); // round ears
    c.fillCircle(cx + 6, hy - 3, 2, G.shadow);

    c.setPixel(cx - 3, hy - 1, G.redEye);
    c.setPixel(cx + 2, hy - 1, G.redEye);
    c.fillRect(cx - 1, hy + 3, 2, 2, G.dark); // snout

    if (frame === 3) {
      c.fillRect(cx - 2, hy + 4, 4, 4, G.dark);
      c.setPixel(cx - 1, hy + 4, G.white); // fangs
      c.setPixel(cx, hy + 4, G.white);
    }

  } else if (dir === 0) {
    c.fillEllipse(cx, by, 7, 7, G.mid);
    c.fillCircle(cx, hy, 5, G.shadow);
    c.fillCircle(cx - 6, hy - 3, 2, G.hi);
    c.fillCircle(cx + 6, hy - 3, 2, G.shadow);

    // Naked tail trailing behind
    c.drawLine(cx, by + 4, cx + tailSway * 3, by + 13, G.hi);

    const lY = (frame === 0) ? 41 : 38;
    const rY = (frame === 1) ? 41 : 38;
    c.fillRect(cx - 6, lY - 3, 3, 4, G.mid);
    c.fillRect(cx + 3, rY - 3, 3, 4, G.shadow);

    if (frame === 3) {
      c.drawLine(cx - 3, hy - 5, cx - 7, hy - 9, G.white);
      c.drawLine(cx + 3, hy - 5, cx + 7, hy - 9, G.white);
    }

  } else if (dir === 1) {
    c.drawLine(cx - 8, by + 2, cx - 16, by + 4 + tailSway, G.hi);
    c.fillEllipse(cx - 1, by, 8, 5, G.mid);
    c.fillCircle(cx + 5, hy, 4, G.mid);
    c.fillCircle(cx + 3, hy - 3, 2, G.hi);
    c.setPixel(cx + 6, hy - 1, G.redEye);
    c.fillRect(cx + 8, hy + 1, 3, 2, G.dark);

    let fLegX = (frame === 0) ? cx + 4 : cx + 1;
    let bLegX = (frame === 0) ? cx - 6 : cx - 3;
    c.fillRect(bLegX, 35, 3, 5, G.shadow);
    c.fillRect(fLegX, 35, 3, 5, G.mid);

    if (frame === 3) {
      c.fillRect(cx + 9, hy + 2, 5, 4, G.dark);
      c.setPixel(cx + 11, hy + 2, G.white);
    }

  } else if (dir === 3) {
    c.drawLine(cx + 8, by + 2, cx + 16, by + 4 + tailSway, G.hi);
    c.fillEllipse(cx + 1, by, 8, 5, G.mid);
    c.fillCircle(cx - 5, hy, 4, G.mid);
    c.fillCircle(cx - 3, hy - 3, 2, G.hi);
    c.setPixel(cx - 7, hy - 1, G.redEye);
    c.fillRect(cx - 10, hy + 1, 3, 2, G.dark);

    let fLegX = (frame === 0) ? cx - 6 : cx - 3;
    let bLegX = (frame === 0) ? cx + 4 : cx + 1;
    c.fillRect(bLegX, 35, 3, 5, G.shadow);
    c.fillRect(fLegX, 35, 3, 5, G.mid);

    if (frame === 3) {
      c.fillRect(cx - 13, hy + 2, 5, 4, G.dark);
      c.setPixel(cx - 11, hy + 2, G.white);
    }
  }

  return c;
}

// 5. Spider (8 jointed splayed legs, bulbous abdomen, fangs)
function renderSpiderCell(dir, frame) {
  const c = new Canvas(48, 48);
  let yBob = (frame === 1) ? -1 : 0;
  let xShift = (frame === 2) ? ((dir === 1) ? -2 : (dir === 3 ? 2 : 0)) : (frame === 3 ? ((dir === 1) ? 5 : (dir === 3 ? -5 : 0)) : 0);
  if (frame === 3 && dir === 2) yBob = 3;

  const cx = 24 + xShift;
  const cy = 24 + yBob;
  const legShift = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -1 : 3));

  if (dir === 2) {
    // Abdomen rear, cephalothorax front
    c.fillEllipse(cx, cy - 6, 8, 7, G.mid);
    c.fillRect(cx - 5, cy - 10, 5, 4, G.hi);
    c.fillCircle(cx, cy + 4, 5, G.dark);

    // Multi eyes
    c.fillRect(cx - 3, cy + 3, 2, 2, G.redEye);
    c.fillRect(cx + 2, cy + 3, 2, 2, G.redEye);
    c.setPixel(cx - 1, cy + 2, G.redEye);
    c.setPixel(cx + 1, cy + 2, G.redEye);

    // 8 Legs
    const spread = [
      [-12, -8, -16, 2],
      [-14, -2, -17, 8],
      [-13, 5, -15, 14],
      [-10, 10, -11, 17]
    ];
    for (const [kx, ky, jx, jy] of spread) {
      c.drawLine(cx - 3, cy + 1, cx + kx + legShift, cy + ky, G.dark);
      c.drawLine(cx + kx + legShift, cy + ky, cx + jx + legShift, cy + jy, G.dark);
      c.drawLine(cx + 3, cy + 1, cx - kx - legShift, cy + ky, G.dark);
      c.drawLine(cx - kx - legShift, cy + ky, cx - jx - legShift, cy + jy, G.dark);
    }

    // Fangs
    if (frame === 3) {
      c.drawLine(cx - 2, cy + 8, cx - 4, cy + 13, G.white);
      c.drawLine(cx + 2, cy + 8, cx + 4, cy + 13, G.white);
      c.setPixel(cx - 4, cy + 14, G.toxicGreen);
      c.setPixel(cx + 4, cy + 14, G.toxicGreen);
    } else {
      c.drawLine(cx - 1, cy + 8, cx - 2, cy + 11, G.white);
      c.drawLine(cx + 1, cy + 8, cx + 2, cy + 11, G.white);
    }

  } else if (dir === 0) {
    c.fillCircle(cx, cy - 6, 5, G.dark);
    c.fillEllipse(cx, cy + 4, 8, 7, G.mid);
    c.fillRect(cx - 5, cy + 1, 5, 4, G.hi);

    const spread = [
      [-12, -8, -16, 2],
      [-14, -2, -17, 8],
      [-13, 5, -15, 14],
      [-10, 10, -11, 17]
    ];
    for (const [kx, ky, jx, jy] of spread) {
      c.drawLine(cx - 3, cy - 2, cx + kx + legShift, cy + ky, G.dark);
      c.drawLine(cx + kx + legShift, cy + ky, cx + jx + legShift, cy + jy, G.dark);
      c.drawLine(cx + 3, cy - 2, cx - kx - legShift, cy + ky, G.dark);
      c.drawLine(cx - kx - legShift, cy + ky, cx - jx - legShift, cy + jy, G.dark);
    }

  } else if (dir === 1) {
    c.fillEllipse(cx - 6, cy, 8, 6, G.mid);
    c.fillCircle(cx + 4, cy + 1, 5, G.dark);
    c.fillRect(cx + 6, cy - 1, 2, 2, G.redEye);

    // Legs on right
    c.drawLine(cx, cy + 1, cx + 8 + legShift, cy - 6, G.dark);
    c.drawLine(cx + 8 + legShift, cy - 6, cx + 14 + legShift, cy + 11, G.dark);
    c.drawLine(cx, cy + 1, cx - 4 - legShift, cy - 7, G.dark);
    c.drawLine(cx - 4 - legShift, cy - 7, cx - 12 - legShift, cy + 11, G.dark);

    if (frame === 3) {
      c.drawLine(cx + 8, cy + 3, cx + 14, cy + 8, G.white);
      c.setPixel(cx + 15, cy + 8, G.toxicGreen);
    }

  } else if (dir === 3) {
    c.fillEllipse(cx + 6, cy, 8, 6, G.mid);
    c.fillCircle(cx - 4, cy + 1, 5, G.dark);
    c.fillRect(cx - 8, cy - 1, 2, 2, G.redEye);

    c.drawLine(cx, cy + 1, cx - 8 - legShift, cy - 6, G.dark);
    c.drawLine(cx - 8 - legShift, cy - 6, cx - 14 - legShift, cy + 11, G.dark);
    c.drawLine(cx, cy + 1, cx + 4 + legShift, cy - 7, G.dark);
    c.drawLine(cx + 4 + legShift, cy - 7, cx + 12 + legShift, cy + 11, G.dark);

    if (frame === 3) {
      c.drawLine(cx - 8, cy + 3, cx - 14, cy + 8, G.white);
      c.setPixel(cx - 15, cy + 8, G.toxicGreen);
    }
  }

  return c;
}

// 6. Bat (flying chiropteran - bobs vertically, flapping wings, fangs)
function renderBatCell(dir, frame) {
  const c = new Canvas(48, 48);
  // Flying bob: walk A vs B diff
  let yBob = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -4 : 3));
  let xShift = (frame === 3) ? ((dir === 1) ? 5 : (dir === 3 ? -5 : 0)) : 0;

  const cx = 24 + xShift;
  const cy = 24 + yBob;
  const wingUp = (frame === 0 || frame === 2);

  if (dir === 2) {
    // Body center
    c.fillEllipse(cx, cy, 4, 7, G.dark);
    c.fillCircle(cx, cy - 4, 4, G.mid);
    c.fillRect(cx - 4, cy - 9, 2, 4, G.dark); // ears
    c.fillRect(cx + 2, cy - 9, 2, 4, G.dark);
    c.setPixel(cx - 2, cy - 5, G.redEye);
    c.setPixel(cx + 1, cy - 5, G.redEye);

    // Large webbed wings
    if (wingUp) {
      c.fillPolygon([
        { x: cx - 3, y: cy },
        { x: cx - 16, y: cy - 11 },
        { x: cx - 14, y: cy + 2 },
        { x: cx - 3, y: cy + 4 }
      ], G.mid);
      c.fillPolygon([
        { x: cx + 3, y: cy },
        { x: cx + 16, y: cy - 11 },
        { x: cx + 14, y: cy + 2 },
        { x: cx + 3, y: cy + 4 }
      ], G.mid);
    } else {
      c.fillPolygon([
        { x: cx - 3, y: cy },
        { x: cx - 17, y: cy + 6 },
        { x: cx - 11, y: cy + 12 },
        { x: cx - 3, y: cy + 5 }
      ], G.shadow);
      c.fillPolygon([
        { x: cx + 3, y: cy },
        { x: cx + 17, y: cy + 6 },
        { x: cx + 11, y: cy + 12 },
        { x: cx + 3, y: cy + 5 }
      ], G.shadow);
    }

    if (frame === 3) {
      c.fillRect(cx - 2, cy - 1, 4, 4, G.dark);
      c.setPixel(cx - 2, cy - 1, G.white);
      c.setPixel(cx + 1, cy - 1, G.white);
    }

  } else if (dir === 0) {
    c.fillEllipse(cx, cy, 4, 7, G.dark);
    c.fillCircle(cx, cy - 4, 4, G.mid);
    c.fillRect(cx - 4, cy - 9, 2, 4, G.dark);
    c.fillRect(cx + 2, cy - 9, 2, 4, G.dark);

    if (wingUp) {
      c.fillPolygon([
        { x: cx - 3, y: cy },
        { x: cx - 16, y: cy - 11 },
        { x: cx - 14, y: cy + 2 },
        { x: cx - 3, y: cy + 4 }
      ], G.mid);
      c.fillPolygon([
        { x: cx + 3, y: cy },
        { x: cx + 16, y: cy - 11 },
        { x: cx + 14, y: cy + 2 },
        { x: cx + 3, y: cy + 4 }
      ], G.mid);
    } else {
      c.fillPolygon([
        { x: cx - 3, y: cy },
        { x: cx - 17, y: cy + 6 },
        { x: cx - 11, y: cy + 12 },
        { x: cx - 3, y: cy + 5 }
      ], G.shadow);
      c.fillPolygon([
        { x: cx + 3, y: cy },
        { x: cx + 17, y: cy + 6 },
        { x: cx + 11, y: cy + 12 },
        { x: cx + 3, y: cy + 5 }
      ], G.shadow);
    }

  } else if (dir === 1) {
    c.fillEllipse(cx, cy, 5, 6, G.dark);
    c.fillCircle(cx + 4, cy - 3, 3, G.mid);
    c.setPixel(cx + 5, cy - 4, G.redEye);

    if (wingUp) {
      c.fillPolygon([
        { x: cx - 2, y: cy },
        { x: cx - 14, y: cy - 12 },
        { x: cx + 5, y: cy - 12 },
        { x: cx + 2, y: cy }
      ], G.mid);
    } else {
      c.fillPolygon([
        { x: cx - 2, y: cy },
        { x: cx - 12, y: cy + 9 },
        { x: cx + 6, y: cy + 7 },
        { x: cx + 2, y: cy }
      ], G.shadow);
    }

  } else if (dir === 3) {
    c.fillEllipse(cx, cy, 5, 6, G.dark);
    c.fillCircle(cx - 4, cy - 3, 3, G.mid);
    c.setPixel(cx - 6, cy - 4, G.redEye);

    if (wingUp) {
      c.fillPolygon([
        { x: cx + 2, y: cy },
        { x: cx + 14, y: cy - 12 },
        { x: cx - 5, y: cy - 12 },
        { x: cx - 2, y: cy }
      ], G.mid);
    } else {
      c.fillPolygon([
        { x: cx + 2, y: cy },
        { x: cx + 12, y: cy + 9 },
        { x: cx - 6, y: cy + 7 },
        { x: cx - 2, y: cy }
      ], G.shadow);
    }
  }

  return c;
}

// 7. Snake (coiled serpent with cobra hood, fangs, tongue)
function renderSnakeCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;
  const coilWave = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));

  if (dir === 2) {
    // Coiled lower body
    c.fillEllipse(cx, cy + 6, 10, 5, G.shadow);
    c.fillRect(cx - 8, cy + 4, 16, 3, G.mid);

    // Upright neck with cobra hood
    c.fillEllipse(cx, cy - 3, 7, 6, G.mid);
    c.fillRect(cx - 5, cy - 6, 10, 4, G.hi);

    // Head
    c.fillCircle(cx, cy - 8, 4, G.dark);
    c.setPixel(cx - 3, cy - 9, G.yellowEye);
    c.setPixel(cx + 2, cy - 9, G.yellowEye);

    if (frame === 3) {
      c.fillRect(cx - 2, cy - 5, 4, 3, G.dark);
      c.setPixel(cx - 2, cy - 5, G.white);
      c.setPixel(cx + 1, cy - 5, G.white);
      // Forked tongue
      c.drawLine(cx, cy - 3, cx, cy + 2, [220, 40, 40, 255]);
      c.setPixel(cx - 1, cy + 3, [220, 40, 40, 255]);
      c.setPixel(cx + 1, cy + 3, [220, 40, 40, 255]);
    } else {
      c.drawLine(cx, cy - 5, cx, cy - 3, [220, 40, 40, 255]);
    }

  } else if (dir === 0) {
    c.fillEllipse(cx, cy + 6, 10, 5, G.shadow);
    c.fillEllipse(cx, cy - 3, 7, 6, G.mid);
    c.fillCircle(cx, cy - 8, 4, G.dark);
    c.fillRect(cx - 3, cy - 5, 6, 5, G.hi);

    // Tail tip swaying
    c.drawLine(cx + 8, cy + 6, cx + 12 + coilWave, cy + 2, G.hi);

    if (frame === 3) {
      c.drawLine(cx - 2, cy - 8, cx - 4, cy - 13, G.white);
      c.drawLine(cx + 2, cy - 8, cx + 4, cy - 13, G.white);
      c.drawLine(cx, cy - 10, cx, cy - 15, [220, 40, 40, 255]);
    }

  } else if (dir === 1) {
    // Undulating S-curve
    c.fillEllipse(cx - 6, cy + 6 + coilWave, 8, 4, G.shadow);
    c.fillEllipse(cx + 2, cy + 4 - coilWave, 6, 4, G.mid);
    c.drawLine(cx + 2, cy + 4 - coilWave, cx + 6, cy - 6, G.hi);
    c.fillCircle(cx + 7, cy - 6, 4, G.dark);
    c.setPixel(cx + 8, cy - 7, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx + 11, cy - 6, cx + 16, cy - 6, [220, 40, 40, 255]);
      c.setPixel(cx + 10, cy - 5, G.white);
    }

  } else if (dir === 3) {
    c.fillEllipse(cx + 6, cy + 6 + coilWave, 8, 4, G.shadow);
    c.fillEllipse(cx - 2, cy + 4 - coilWave, 6, 4, G.mid);
    c.drawLine(cx - 2, cy + 4 - coilWave, cx - 6, cy - 6, G.hi);
    c.fillCircle(cx - 7, cy - 6, 4, G.dark);
    c.setPixel(cx - 9, cy - 7, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx - 11, cy - 6, cx - 16, cy - 6, [220, 40, 40, 255]);
      c.setPixel(cx - 11, cy - 5, G.white);
    }
  }

  return c;
}

// 8. Lizard (reptilian crawler, splayed legs, long tail)
function renderLizardClassCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;
  const stride = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -1 : 3));

  if (dir === 2) {
    // Splayed crawler
    c.fillEllipse(cx, cy, 6, 9, G.mid);
    c.fillRect(cx - 4, cy - 5, 4, 8, G.hi);
    c.fillRect(cx - 1, cy - 6, 2, 10, G.dark); // dorsal ridge

    // Splayed legs
    c.drawLine(cx - 5, cy - 4, cx - 12 + stride, cy - 6, G.dark);
    c.drawLine(cx - 12 + stride, cy - 6, cx - 13 + stride, cy + 2, G.mid);
    c.drawLine(cx + 5, cy - 4, cx + 12 - stride, cy - 6, G.dark);
    c.drawLine(cx + 12 - stride, cy - 6, cx + 13 - stride, cy + 2, G.mid);

    c.drawLine(cx - 5, cy + 4, cx - 12 - stride, cy + 6, G.dark);
    c.drawLine(cx - 12 - stride, cy + 6, cx - 13 - stride, cy + 12, G.mid);
    c.drawLine(cx + 5, cy + 4, cx + 12 + stride, cy + 6, G.dark);
    c.drawLine(cx + 12 + stride, cy + 6, cx + 13 + stride, cy + 12, G.mid);

    // Head
    c.fillCircle(cx, cy + 7, 4, G.mid);
    c.setPixel(cx - 3, cy + 6, G.yellowEye);
    c.setPixel(cx + 2, cy + 6, G.yellowEye);

    // Tail rear
    c.drawLine(cx, cy - 8, cx + stride * 2, cy - 17, G.shadow);

    if (frame === 3) {
      c.drawLine(cx, cy + 10, cx, cy + 15, [220, 40, 40, 255]);
    }

  } else if (dir === 0) {
    c.fillEllipse(cx, cy, 6, 9, G.mid);
    c.fillRect(cx - 1, cy - 6, 2, 10, G.dark);
    c.fillCircle(cx, cy - 7, 4, G.mid);

    c.drawLine(cx, cy + 8, cx + stride * 2, cy + 17, G.shadow);

    c.drawLine(cx - 5, cy - 4, cx - 12 + stride, cy - 6, G.dark);
    c.drawLine(cx + 5, cy - 4, cx + 12 - stride, cy - 6, G.dark);
    c.drawLine(cx - 5, cy + 4, cx - 12 - stride, cy + 6, G.dark);
    c.drawLine(cx + 5, cy + 4, cx + 12 + stride, cy + 6, G.dark);

    if (frame === 3) {
      c.drawLine(cx - 3, cy - 8, cx - 6, cy - 13, G.white);
      c.drawLine(cx + 3, cy - 8, cx + 6, cy - 13, G.white);
    }

  } else if (dir === 1) {
    c.drawLine(cx - 7, cy + 1, cx - 17, cy - 2 + stride, G.shadow);
    c.fillEllipse(cx, cy, 9, 5, G.mid);
    c.fillCircle(cx + 7, cy, 4, G.mid);
    c.setPixel(cx + 8, cy - 2, G.yellowEye);

    let fLegX = (frame === 0) ? cx + 5 : cx + 2;
    let bLegX = (frame === 0) ? cx - 6 : cx - 3;
    c.fillRect(bLegX, cy + 4, 3, 5, G.dark);
    c.fillRect(fLegX, cy + 4, 3, 5, G.mid);

    if (frame === 3) {
      c.drawLine(cx + 11, cy, cx + 16, cy, [220, 40, 40, 255]);
    }

  } else if (dir === 3) {
    c.drawLine(cx + 7, cy + 1, cx + 17, cy - 2 + stride, G.shadow);
    c.fillEllipse(cx, cy, 9, 5, G.mid);
    c.fillCircle(cx - 7, cy, 4, G.mid);
    c.setPixel(cx - 9, cy - 2, G.yellowEye);

    let fLegX = (frame === 0) ? cx - 6 : cx - 3;
    let bLegX = (frame === 0) ? cx + 5 : cx + 2;
    c.fillRect(bLegX, cy + 4, 3, 5, G.dark);
    c.fillRect(fLegX, cy + 4, 3, 5, G.mid);

    if (frame === 3) {
      c.drawLine(cx - 11, cy, cx - 16, cy, [220, 40, 40, 255]);
    }
  }

  return c;
}

// 9. Quadruped (heavy 4-legged beast/boar with tusks)
function renderQuadrupedCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const hy = 20 + dy;
  const by = 28 + dy;
  const tailSway = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);

  if (dir === 2) {
    c.fillEllipse(cx, by, 8, 8, G.mid);
    c.fillRect(cx - 5, by - 5, 5, 7, G.hi);

    const lY = (frame === 0) ? 41 : 38;
    const rY = (frame === 1) ? 41 : 38;
    c.fillRect(cx - 7, lY - 4, 4, 5, G.dark);
    c.fillRect(cx + 3, rY - 4, 4, 5, G.shadow);

    c.fillCircle(cx, hy, 7, G.mid);
    c.fillRect(cx - 3, hy + 2, 6, 4, G.shadow); // heavy snout
    c.setPixel(cx - 4, hy - 1, G.redEye);
    c.setPixel(cx + 3, hy - 1, G.redEye);

    // Tusks
    c.setPixel(cx - 4, hy + 3, G.white);
    c.setPixel(cx - 4, hy + 2, G.white);
    c.setPixel(cx + 3, hy + 3, G.white);
    c.setPixel(cx + 3, hy + 2, G.white);

  } else if (dir === 0) {
    c.fillEllipse(cx, by, 8, 8, G.mid);
    c.fillCircle(cx, hy, 7, G.shadow);

    c.drawLine(cx, by + 4, cx + tailSway * 2, by - 6, G.dark);

    const lY = (frame === 0) ? 41 : 38;
    const rY = (frame === 1) ? 41 : 38;
    c.fillRect(cx - 7, lY - 4, 4, 5, G.dark);
    c.fillRect(cx + 3, rY - 4, 4, 5, G.shadow);

    if (frame === 3) {
      c.drawLine(cx - 3, hy - 6, cx - 6, hy - 11, G.white);
      c.drawLine(cx + 3, hy - 6, cx + 6, hy - 11, G.white);
    }

  } else if (dir === 1) {
    c.fillEllipse(cx - 1, by, 10, 7, G.mid);
    c.fillRect(cx - 7, by - 4, 6, 5, G.hi);

    let fLegX = (frame === 0) ? cx + 5 : cx + 1;
    let bLegX = (frame === 0) ? cx - 8 : cx - 4;
    c.fillRect(bLegX, 34, 4, 7, G.dark);
    c.fillRect(fLegX, 34, 4, 7, G.shadow);

    c.fillCircle(cx + 6, hy, 6, G.mid);
    c.fillRect(cx + 9, hy + 1, 4, 4, G.shadow);
    c.setPixel(cx + 7, hy - 2, G.redEye);
    c.setPixel(cx + 11, hy + 1, G.white); // tusk

  } else if (dir === 3) {
    c.fillEllipse(cx + 1, by, 10, 7, G.mid);
    c.fillRect(cx + 1, by - 4, 6, 5, G.hi);

    let fLegX = (frame === 0) ? cx - 9 : cx - 5;
    let bLegX = (frame === 0) ? cx + 4 : cx;
    c.fillRect(bLegX, 34, 4, 7, G.dark);
    c.fillRect(fLegX, 34, 4, 7, G.shadow);

    c.fillCircle(cx - 6, hy, 6, G.mid);
    c.fillRect(cx - 13, hy + 1, 4, 4, G.shadow);
    c.setPixel(cx - 8, hy - 2, G.redEye);
    c.setPixel(cx - 12, hy + 1, G.white);
  }

  return c;
}

const AnimalGenerators = {
  ant: () => createMonsterSheetFromRenderer(renderAntCell),
  dog: () => createMonsterSheetFromRenderer(renderDogClassCell),
  feline: () => createMonsterSheetFromRenderer(renderFelineCell),
  rodent: () => createMonsterSheetFromRenderer(renderRodentCell),
  spider: () => createMonsterSheetFromRenderer(renderSpiderCell),
  bat: () => createMonsterSheetFromRenderer(renderBatCell),
  snake: () => createMonsterSheetFromRenderer(renderSnakeCell),
  lizard: () => createMonsterSheetFromRenderer(renderLizardClassCell),
  quadruped: () => createMonsterSheetFromRenderer(renderQuadrupedCell),
};

module.exports = { AnimalGenerators };
