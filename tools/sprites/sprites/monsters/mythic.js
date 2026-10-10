// Distributed under the NetHack General Public License.
// Generators for Mythic monster classes (8 classes):
// cockatrice, dragon, centaur, jabberwock, naga, unicorn, angel, demon

const Canvas = require('../../canvas');
const { createMonsterSheetFromRenderer, getMonsterKinematics, G } = require('./base');

// 1. Cockatrice (serpentine rooster hybrid, wattle, bat wings, petrifying beak)
function renderCockatriceCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Scaly legs
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  let rStep = (frame === 0) ? 2 : (frame === 1 ? -2 : 0);
  if (dir === 2 || dir === 0) {
    let lY = 42 + dy + (frame === 0 ? 0 : -2);
    let rY = 42 + dy + (frame === 1 ? 0 : -2);
    c.fillRect(cx - 5, lY - 6, 2, 6, G.dark);
    c.fillRect(cx + 3, rY - 6, 2, 6, G.dark);
  } else if (dir === 1) {
    c.fillRect(cx + rStep - 2, 42 + dy - 6, 2, 6, G.shadow);
    c.fillRect(cx + lStep + 2, 42 + dy - 6, 2, 6, G.dark);
  } else if (dir === 3) {
    c.fillRect(cx - rStep + 1, 42 + dy - 6, 2, 6, G.shadow);
    c.fillRect(cx - lStep - 3, 42 + dy - 6, 2, 6, G.dark);
  }

  // Plump body & serpent tail
  c.fillEllipse(cx, cy, 7, 6, G.mid);
  const tailSway = (frame === 0) ? -3 : (frame === 1 ? 3 : 0);
  c.drawLine(cx, cy + 3, cx + tailSway * 2, cy + 12, G.shadow);

  // Bat-wings flapping
  const wingUp = (frame === 1 || frame === 3);
  if (wingUp) {
    c.drawLine(cx - 5, cy - 2, cx - 13, cy - 10, G.shadow);
    c.drawLine(cx + 5, cy - 2, cx + 13, cy - 10, G.shadow);
    c.fillPolygon([
      { x: cx - 5, y: cy },
      { x: cx - 13, y: cy - 10 },
      { x: cx - 11, y: cy + 2 }
    ], G.dark);
    c.fillPolygon([
      { x: cx + 5, y: cy },
      { x: cx + 13, y: cy - 10 },
      { x: cx + 11, y: cy + 2 }
    ], G.dark);
  } else {
    c.drawLine(cx - 5, cy, cx - 12, cy + 4, G.shadow);
    c.drawLine(cx + 5, cy, cx + 12, cy + 4, G.shadow);
    c.fillPolygon([
      { x: cx - 5, y: cy - 2 },
      { x: cx - 12, y: cy + 4 },
      { x: cx - 8, y: cy + 8 }
    ], G.dark);
    c.fillPolygon([
      { x: cx + 5, y: cy - 2 },
      { x: cx + 12, y: cy + 4 },
      { x: cx + 8, y: cy + 8 }
    ], G.dark);
  }

  // Rooster head
  const hy = cy - 8;
  c.fillCircle(cx, hy, 4, G.mid);
  // Red comb & wattle
  c.fillRect(cx - 2, hy - 5, 4, 3, G.redEye);
  c.fillRect(cx - 1, hy + 3, 2, 3, G.redEye);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.yellowEye);
    c.setPixel(cx + 1, hy - 1, G.yellowEye);
    // Beak
    c.fillRect(cx - 1, hy + 1, 2, 3, G.white);

    if (frame === 3) {
      // Petrifying glare / peck
      c.drawLine(cx - 2, hy + 4, cx - 4, hy + 8, G.white);
      c.drawLine(cx + 1, hy + 4, cx + 3, hy + 8, G.white);
      c.fillCircle(cx, hy + 9, 2, G.magicBlue); // petrify spark
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 4, hy - 8, cx - 8, hy - 14, G.white);
      c.drawLine(cx + 4, hy - 8, cx + 8, hy - 14, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.yellowEye);
    c.fillRect(cx + 3, hy, 3, 2, G.white); // beak side

    if (frame === 3) {
      c.drawLine(cx + 5, hy + 1, cx + 12, hy + 1, G.white);
      c.fillCircle(cx + 13, hy + 1, 2, G.magicBlue);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.yellowEye);
    c.fillRect(cx - 6, hy, 3, 2, G.white);

    if (frame === 3) {
      c.drawLine(cx - 5, hy + 1, cx - 12, hy + 1, G.white);
      c.fillCircle(cx - 13, hy + 1, 2, G.magicBlue);
    }
  }

  return c;
}

// 2. Dragon (massive scaled reptilian terror, horned crest, wings, fire breath cone)
function renderDragonCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 23 + dy;

  // Massive scaled legs
  let lY = 43 + dy + (frame === 0 ? 0 : -2);
  let rY = 43 + dy + (frame === 1 ? 0 : -2);
  if (dir === 2 || dir === 0) {
    c.fillRect(cx - 7, lY - 8, 4, 8, G.dark);
    c.fillRect(cx + 3, rY - 8, 4, 8, G.dark);
  } else {
    c.fillRect(cx - 4, 43 + dy - 8, 8, 8, G.dark);
  }

  // Broad scaled chest & torso
  c.fillRect(cx - 8, cy - 4, 16, 14, G.shadow);
  c.fillRect(cx - 6, cy - 3, 12, 11, G.mid);

  // Large Dragon Wings
  const wingFlap = (frame === 1 || frame === 3) ? -4 : 2;
  c.fillPolygon([
    { x: cx - 6, y: cy - 2 },
    { x: cx - 18, y: cy - 12 + wingFlap },
    { x: cx - 14, y: cy + 4 }
  ], G.shadow);
  c.drawLine(cx - 6, cy - 2, cx - 18, cy - 12 + wingFlap, G.white);

  c.fillPolygon([
    { x: cx + 6, y: cy - 2 },
    { x: cx + 18, y: cy - 12 + wingFlap },
    { x: cx + 14, y: cy + 4 }
  ], G.shadow);
  c.drawLine(cx + 6, cy - 2, cx + 18, cy - 12 + wingFlap, G.white);

  // Horned Dragon Head
  const hy = cy - 10;
  c.fillCircle(cx, hy, 5, G.mid);
  // Horns
  c.drawLine(cx - 4, hy - 3, cx - 9, hy - 9, G.white);
  c.drawLine(cx + 3, hy - 3, cx + 8, hy - 9, G.white);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);
    c.fillRect(cx - 3, hy + 2, 6, 3, G.dark); // snout
    c.setPixel(cx - 2, hy + 3, G.white); // fangs
    c.setPixel(cx + 1, hy + 3, G.white);

    if (frame === 3) {
      // Fire breath cone!
      c.fillPolygon([
        { x: cx, y: hy + 4 },
        { x: cx - 8, y: hy + 18 },
        { x: cx + 8, y: hy + 18 }
      ], [240, 60, 20, 255]);
      c.fillPolygon([
        { x: cx, y: hy + 6 },
        { x: cx - 4, y: hy + 16 },
        { x: cx + 4, y: hy + 16 }
      ], [255, 200, 40, 255]);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 6, hy - 10, cx - 14, hy - 20, [240, 60, 20, 255]);
      c.drawLine(cx + 6, hy - 10, cx + 14, hy - 20, [240, 60, 20, 255]);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.redEye);
    c.fillRect(cx + 2, hy + 1, 4, 3, G.dark);
    c.setPixel(cx + 5, hy + 2, G.white);

    if (frame === 3) {
      // Fire breath cone right
      c.fillPolygon([
        { x: cx + 6, y: hy + 2 },
        { x: cx + 18, y: hy - 4 },
        { x: cx + 18, y: hy + 8 }
      ], [240, 60, 20, 255]);
      c.fillPolygon([
        { x: cx + 8, y: hy + 2 },
        { x: cx + 16, y: hy - 2 },
        { x: cx + 16, y: hy + 6 }
      ], [255, 200, 40, 255]);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.redEye);
    c.fillRect(cx - 6, hy + 1, 4, 3, G.dark);
    c.setPixel(cx - 6, hy + 2, G.white);

    if (frame === 3) {
      // Fire breath cone left
      c.fillPolygon([
        { x: cx - 6, y: hy + 2 },
        { x: cx - 18, y: hy - 4 },
        { x: cx - 18, y: hy + 8 }
      ], [240, 60, 20, 255]);
      c.fillPolygon([
        { x: cx - 8, y: hy + 2 },
        { x: cx - 16, y: hy - 2 },
        { x: cx - 16, y: hy + 6 }
      ], [255, 200, 40, 255]);
    }
  }

  return c;
}

// 3. Centaur (half-human half-horse quadruped archer, bow & arrow)
function renderCentaurCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Equine body (4 hooves stepping)
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  let rStep = (frame === 0) ? 2 : (frame === 1 ? -2 : 0);

  if (dir === 2 || dir === 0) {
    c.fillEllipse(cx, cy + 6, 9, 6, G.mid);
    c.fillRect(cx - 7, 36 + dy, 3, 7, G.shadow);
    c.fillRect(cx + 4, 36 + dy, 3, 7, G.shadow);
    c.fillRect(cx - 4, 36 + dy + lStep, 3, 7, G.dark);
    c.fillRect(cx + 1, 36 + dy + rStep, 3, 7, G.dark);
  } else if (dir === 1) {
    c.fillEllipse(cx - 2, cy + 5, 11, 6, G.mid);
    c.fillRect(cx - 8 + rStep, 36 + dy, 3, 7, G.dark);
    c.fillRect(cx - 4 + lStep, 36 + dy, 3, 7, G.shadow);
    c.fillRect(cx + 2 + rStep, 36 + dy, 3, 7, G.dark);
    c.fillRect(cx + 6 + lStep, 36 + dy, 3, 7, G.shadow);
  } else if (dir === 3) {
    c.fillEllipse(cx + 2, cy + 5, 11, 6, G.mid);
    c.fillRect(cx + 5 - rStep, 36 + dy, 3, 7, G.dark);
    c.fillRect(cx + 1 - lStep, 36 + dy, 3, 7, G.shadow);
    c.fillRect(cx - 5 - rStep, 36 + dy, 3, 7, G.dark);
    c.fillRect(cx - 9 - lStep, 36 + dy, 3, 7, G.shadow);
  }

  // Human torso rising from front of horse body
  const tx = (dir === 1) ? cx + 3 : (dir === 3 ? cx - 3 : cx);
  c.fillRect(tx - 4, cy - 5, 8, 8, G.shadow);
  c.fillRect(tx - 3, cy - 4, 6, 6, G.mid);

  const hy = cy - 10;
  c.fillCircle(tx, hy, 4, G.hi);

  if (dir === 2) {
    c.setPixel(tx - 2, hy - 1, G.dark);
    c.setPixel(tx + 1, hy - 1, G.dark);

    // Bow & arrow
    if (frame === 2) {
      c.drawLine(tx - 6, cy - 8, tx - 6, cy + 2, G.shadow); // draw string
      c.drawLine(tx - 8, cy - 3, tx + 6, cy - 3, G.white); // nocked arrow
    } else if (frame === 3) {
      c.drawLine(tx - 6, cy - 8, tx - 6, cy + 2, G.shadow);
      c.drawLine(tx, cy - 3, tx, cy + 12, G.white); // arrow shot down
      c.fillCircle(tx, cy + 12, 2, G.hi);
    } else {
      c.drawLine(tx - 6, cy - 7, tx - 6, cy + 3, G.shadow);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(tx, cy - 10, tx, cy - 20, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(tx + 2, hy - 1, G.dark);

    if (frame === 2) {
      c.drawLine(tx + 4, cy - 8, tx + 4, cy + 2, G.shadow);
      c.drawLine(tx - 2, cy - 3, tx + 10, cy - 3, G.white);
    } else if (frame === 3) {
      c.drawLine(tx + 4, cy - 8, tx + 4, cy + 2, G.shadow);
      c.drawLine(tx + 6, cy - 3, tx + 18, cy - 3, G.white); // arrow flying
      c.setPixel(tx + 19, cy - 3, G.white);
    } else {
      c.drawLine(tx + 4, cy - 7, tx + 4, cy + 3, G.shadow);
    }

  } else if (dir === 3) {
    c.setPixel(tx - 3, hy - 1, G.dark);

    if (frame === 2) {
      c.drawLine(tx - 4, cy - 8, tx - 4, cy + 2, G.shadow);
      c.drawLine(tx + 2, cy - 3, tx - 10, cy - 3, G.white);
    } else if (frame === 3) {
      c.drawLine(tx - 4, cy - 8, tx - 4, cy + 2, G.shadow);
      c.drawLine(tx - 6, cy - 3, tx - 18, cy - 3, G.white);
      c.setPixel(tx - 19, cy - 3, G.white);
    } else {
      c.drawLine(tx - 4, cy - 7, tx - 4, cy + 3, G.shadow);
    }
  }

  return c;
}

// 4. Jabberwock (grotesque long-necked biped dragon-beast, eyes of flame, vorpal claws)
function renderJabberwockCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Heavy biped legs
  let lY = 43 + dy + (frame === 0 ? 0 : -2);
  let rY = 43 + dy + (frame === 1 ? 0 : -2);
  if (dir === 2 || dir === 0) {
    c.fillRect(cx - 6, lY - 7, 3, 7, G.dark);
    c.fillRect(cx + 3, rY - 7, 3, 7, G.dark);
  } else {
    c.fillRect(cx - 3, 43 + dy - 7, 6, 7, G.dark);
  }

  // Hunched torso & tail
  c.fillRect(cx - 7, cy - 2, 14, 11, G.shadow);
  c.fillRect(cx - 5, cy - 1, 10, 8, G.mid);
  const tailSway = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.drawLine(cx, cy + 6, cx + tailSway * 3, cy + 14, G.shadow);

  // Whiffling long neck
  const neckWave = (frame === 0) ? -1 : (frame === 1 ? 1 : 0);
  c.drawLine(cx, cy - 2, cx + neckWave, cy - 8, G.mid);
  c.drawLine(cx - 1, cy - 2, cx - 1 + neckWave, cy - 8, G.mid);

  // Head with burbling jaws
  const hy = cy - 11;
  c.fillCircle(cx + neckWave, hy, 5, G.mid);

  if (dir === 2) {
    // Eyes of flame
    c.setPixel(cx - 2, hy - 1, G.yellowEye);
    c.setPixel(cx + 1, hy - 1, G.yellowEye);
    c.fillRect(cx - 3, hy + 2, 6, 3, G.dark); // burbling mouth
    c.setPixel(cx - 2, hy + 2, G.white); // fangs
    c.setPixel(cx + 1, hy + 2, G.white);

    // Vorpal claws
    if (frame === 2) {
      c.drawLine(cx - 7, cy, cx - 14, cy - 8, G.white);
      c.drawLine(cx + 7, cy, cx + 14, cy - 8, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 7, cy, cx - 18, cy + 6, G.white);
      c.drawLine(cx + 7, cy, cx + 18, cy + 6, G.white);
      c.drawLine(cx - 14, cy + 6, cx + 14, cy + 6, G.hi); // snicker-snack slash
    } else {
      c.drawLine(cx - 6, cy + 1, cx - 11, cy + 7, G.white);
      c.drawLine(cx + 6, cy + 1, cx + 11, cy + 7, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, hy - 6, cx - 16, hy - 14, G.white);
      c.drawLine(cx + 8, hy - 6, cx + 16, hy - 14, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.yellowEye);
    c.fillRect(cx + 2, hy + 1, 4, 3, G.dark);
    c.setPixel(cx + 4, hy + 2, G.white);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx - 10, cy - 8, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 18, cy + 2, G.white);
      c.drawLine(cx + 14, cy - 2, cx + 22, cy + 6, G.hi);
    } else {
      c.drawLine(cx + 4, cy + 1, cx + 11, cy + 7, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.yellowEye);
    c.fillRect(cx - 6, hy + 1, 4, 3, G.dark);
    c.setPixel(cx - 5, hy + 2, G.white);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx + 10, cy - 8, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 18, cy + 2, G.white);
      c.drawLine(cx - 14, cy - 2, cx - 22, cy + 6, G.hi);
    } else {
      c.drawLine(cx - 4, cy + 1, cx - 11, cy + 7, G.white);
    }
  }

  return c;
}

// 5. Naga (serpentine coiled lower body, humanoid upper torso, cobra hood, scimitar)
function renderNagaCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Serpentine coils
  const wave = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));
  c.fillEllipse(cx + wave, 38 + dy, 11, 5, G.shadow);
  c.fillRect(cx - 9 + wave, 36 + dy, 18, 3, G.mid);
  c.drawLine(cx + 8 + wave, 38 + dy, cx + 14 + wave * 2, 35 + dy, G.hi); // tail tip

  // Humanoid torso & cobra hood
  c.fillRect(cx - 5, cy - 4, 10, 9, G.shadow);
  c.fillRect(cx - 3, cy - 3, 6, 7, G.hi);
  // Cobra hood wings behind neck
  c.fillPolygon([
    { x: cx - 8, y: cy - 7 },
    { x: cx - 4, y: cy - 2 },
    { x: cx - 4, y: cy - 9 }
  ], G.dark);
  c.fillPolygon([
    { x: cx + 8, y: cy - 7 },
    { x: cx + 4, y: cy - 2 },
    { x: cx + 4, y: cy - 9 }
  ], G.dark);

  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.hi);
  c.fillRect(cx - 3, hy - 5, 6, 2, G.yellowEye); // gold tiara

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.dark);
    c.setPixel(cx + 1, hy - 1, G.dark);

    // Scimitar
    if (frame === 2) {
      c.drawLine(cx + 6, cy - 8, cx + 14, cy - 14, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 6, G.white);
      c.drawLine(cx + 10, cy + 2, cx + 20, cy + 4, G.hi);
    } else {
      c.drawLine(cx + 6, cy - 2, cx + 10, cy + 6, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 6, cy - 10, cx + 16, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.dark);

    if (frame === 2) {
      c.drawLine(cx - 3, cy - 8, cx - 8, cy - 14, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 2, G.white);
    } else {
      c.drawLine(cx + 5, cy - 2, cx + 8, cy + 6, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.dark);

    if (frame === 2) {
      c.drawLine(cx + 3, cy - 8, cx + 8, cy - 14, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 2, G.white);
    } else {
      c.drawLine(cx - 5, cy - 2, cx - 8, cy + 6, G.white);
    }
  }

  return c;
}

// 6. Unicorn (magnificent white equine quadruped, spiral horn, flowing mane)
function renderUnicornCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // 4 graceful hooves
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  let rStep = (frame === 0) ? 2 : (frame === 1 ? -2 : 0);

  if (dir === 2 || dir === 0) {
    c.fillEllipse(cx, cy + 2, 8, 8, G.white);
    c.fillRect(cx - 6, 36 + dy, 3, 7, G.hi);
    c.fillRect(cx + 3, 36 + dy, 3, 7, G.hi);
    c.fillRect(cx - 3, 36 + dy + lStep, 2, 7, G.white);
    c.fillRect(cx + 1, 36 + dy + rStep, 2, 7, G.white);
  } else if (dir === 1) {
    c.fillEllipse(cx - 2, cy + 1, 11, 7, G.white);
    c.fillRect(cx - 8 + rStep, 36 + dy, 3, 7, G.hi);
    c.fillRect(cx - 4 + lStep, 36 + dy, 3, 7, G.white);
    c.fillRect(cx + 2 + rStep, 36 + dy, 3, 7, G.hi);
    c.fillRect(cx + 6 + lStep, 36 + dy, 3, 7, G.white);
  } else if (dir === 3) {
    c.fillEllipse(cx + 2, cy + 1, 11, 7, G.white);
    c.fillRect(cx + 5 - rStep, 36 + dy, 3, 7, G.hi);
    c.fillRect(cx + 1 - lStep, 36 + dy, 3, 7, G.white);
    c.fillRect(cx - 5 - rStep, 36 + dy, 3, 7, G.hi);
    c.fillRect(cx - 9 - lStep, 36 + dy, 3, 7, G.white);
  }

  // Graceful head & mane
  const hy = cy - 9;
  c.fillCircle(cx, hy, 5, G.white);
  c.drawLine(cx - 3, hy - 4, cx - 6, hy + 2, G.hi); // mane

  // Spiral horn on forehead
  if (dir === 2) {
    c.drawLine(cx, hy - 4, cx, hy - 14, G.boneWhite);
    c.setPixel(cx, hy - 14, G.magicBlue); // horn glint
    c.setPixel(cx - 2, hy - 1, G.magicBlue);
    c.setPixel(cx + 1, hy - 1, G.magicBlue);

    if (frame === 3) {
      // Horn charge thrust
      c.drawLine(cx - 1, hy - 10, cx - 1, hy + 6, G.boneWhite);
      c.drawLine(cx + 1, hy - 10, cx + 1, hy + 6, G.boneWhite);
      c.fillCircle(cx, hy + 8, 3, G.magicBlue);
    }

  } else if (dir === 0) {
    c.drawLine(cx, hy - 4, cx, hy - 14, G.boneWhite);
    if (frame === 3) {
      c.drawLine(cx, hy - 10, cx, hy - 20, G.boneWhite);
    }

  } else if (dir === 1) {
    c.drawLine(cx + 2, hy - 3, cx + 8, hy - 13, G.boneWhite);
    c.setPixel(cx + 8, hy - 13, G.magicBlue);
    c.setPixel(cx + 2, hy - 1, G.magicBlue);

    if (frame === 3) {
      c.drawLine(cx + 4, hy - 1, cx + 16, hy - 1, G.boneWhite);
      c.fillCircle(cx + 17, hy - 1, 2, G.magicBlue);
    }

  } else if (dir === 3) {
    c.drawLine(cx - 2, hy - 3, cx - 8, hy - 13, G.boneWhite);
    c.setPixel(cx - 8, hy - 13, G.magicBlue);
    c.setPixel(cx - 3, hy - 1, G.magicBlue);

    if (frame === 3) {
      c.drawLine(cx - 4, hy - 1, cx - 16, hy - 1, G.boneWhite);
      c.fillCircle(cx - 17, hy - 1, 2, G.magicBlue);
    }
  }

  return c;
}

// 7. Angel (divine winged celestial biped, glowing halo, feathered wings, flaming sword)
function renderAngelCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Divine flowing white robe bottom
  let step = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.fillPolygon([
    { x: cx - 7 + step, y: 42 + dy },
    { x: cx + 7 + step, y: 42 + dy },
    { x: cx + 5, y: cy + 4 },
    { x: cx - 5, y: cy + 4 }
  ], G.white);
  c.fillRect(cx - 5, cy - 3, 10, 8, G.hi);

  // Magnificent feathered wings
  const wingFlap = (frame === 1 || frame === 3) ? -3 : 2;
  c.fillPolygon([
    { x: cx - 5, y: cy - 2 },
    { x: cx - 16, y: cy - 12 + wingFlap },
    { x: cx - 12, y: cy + 6 }
  ], G.white);
  c.fillPolygon([
    { x: cx + 5, y: cy - 2 },
    { x: cx + 18, y: cy - 12 + wingFlap },
    { x: cx + 12, y: cy + 6 }
  ], G.white);

  // Celestial head & halo
  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.white);
  // Gold halo floating above
  c.drawLine(cx - 3, hy - 6, cx + 3, hy - 6, G.yellowEye);
  c.setPixel(cx - 4, hy - 5, G.yellowEye);
  c.setPixel(cx + 4, hy - 5, G.yellowEye);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.magicBlue);
    c.setPixel(cx + 1, hy - 1, G.magicBlue);

    // Flaming sword
    if (frame === 2) {
      c.drawLine(cx + 7, cy - 8, cx + 14, cy - 18, G.boneWhite);
      c.fillCircle(cx + 14, cy - 18, 2, G.yellowEye);
    } else if (frame === 3) {
      c.drawLine(cx + 7, cy, cx + 18, cy + 10, G.boneWhite);
      c.drawLine(cx + 12, cy + 4, cx + 22, cy + 8, G.yellowEye);
      c.drawLine(cx + 14, cy + 6, cx + 24, cy + 6, [240, 60, 20, 255]);
    } else {
      c.drawLine(cx + 7, cy - 2, cx + 11, cy + 8, G.boneWhite);
      c.setPixel(cx + 11, cy + 9, G.yellowEye);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 7, cy - 10, cx + 16, cy - 20, G.yellowEye);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.magicBlue);

    if (frame === 2) {
      c.drawLine(cx - 3, cy - 8, cx - 8, cy - 18, G.boneWhite);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 2, G.boneWhite);
      c.drawLine(cx + 14, cy - 2, cx + 22, cy + 6, G.yellowEye);
    } else {
      c.drawLine(cx + 6, cy - 2, cx + 9, cy + 7, G.boneWhite);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.magicBlue);

    if (frame === 2) {
      c.drawLine(cx + 3, cy - 8, cx + 8, cy - 18, G.boneWhite);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 2, G.boneWhite);
      c.drawLine(cx - 14, cy - 2, cx - 22, cy + 6, G.yellowEye);
    } else {
      c.drawLine(cx - 6, cy - 2, cx - 9, cy + 7, G.boneWhite);
    }
  }

  return c;
}

// 8. Demon (major underworld demon, bat wings, cloven hooves, ram horns, trident)
function renderDemonCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Cloven hoof legs
  let lY = 43 + dy + (frame === 0 ? 0 : -2);
  let rY = 43 + dy + (frame === 1 ? 0 : -2);
  if (dir === 2 || dir === 0) {
    c.fillRect(cx - 6, lY - 8, 3, 8, G.dark);
    c.fillRect(cx + 3, rY - 8, 3, 8, G.dark);
  } else {
    c.fillRect(cx - 3, 43 + dy - 8, 6, 8, G.dark);
  }

  // Muscular dark torso
  c.fillRect(cx - 7, cy - 4, 14, 12, G.shadow);
  c.fillRect(cx - 5, cy - 3, 10, 10, G.dark);

  // Large bat wings
  const wingFlap = (frame === 1 || frame === 3) ? -3 : 2;
  c.fillPolygon([
    { x: cx - 6, y: cy - 2 },
    { x: cx - 16, y: cy - 12 + wingFlap },
    { x: cx - 12, y: cy + 4 }
  ], G.dark);
  c.fillPolygon([
    { x: cx + 6, y: cy - 2 },
    { x: cx + 16, y: cy - 12 + wingFlap },
    { x: cx + 12, y: cy + 4 }
  ], G.dark);

  // Head with curved ram horns
  const hy = cy - 9;
  c.fillCircle(cx, hy, 5, G.dark);
  c.drawLine(cx - 4, hy - 2, cx - 9, hy - 8, G.white);
  c.drawLine(cx - 9, hy - 8, cx - 6, hy - 10, G.white);
  c.drawLine(cx + 3, hy - 2, cx + 8, hy - 8, G.white);
  c.drawLine(cx + 8, hy - 8, cx + 5, hy - 10, G.white);

  // Barbed tail
  const tailSway = (frame === 0) ? -3 : (frame === 1 ? 3 : 0);
  c.drawLine(cx, cy + 6, cx + tailSway * 3, cy + 14, G.dark);
  c.setPixel(cx + tailSway * 3, cy + 14, G.redEye); // barb

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);

    // Flaming pitchfork/trident
    if (frame === 2) {
      c.drawLine(cx + 8, cy - 8, cx + 12, cy - 18, G.shadow);
      c.fillRect(cx + 10, cy - 20, 5, 3, [240, 60, 20, 255]);
    } else if (frame === 3) {
      c.drawLine(cx + 8, cy, cx + 18, cy + 10, G.shadow);
      c.fillRect(cx + 16, cy + 8, 6, 4, [240, 60, 20, 255]);
      c.drawLine(cx + 14, cy + 8, cx + 22, cy + 12, G.yellowEye);
    } else {
      c.drawLine(cx + 8, cy - 4, cx + 9, cy + 8, G.shadow);
      c.fillRect(cx + 7, cy - 7, 5, 3, [240, 60, 20, 255]);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 8, cy - 10, cx + 16, cy - 20, [240, 60, 20, 255]);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.redEye);

    if (frame === 2) {
      c.drawLine(cx - 3, cy - 8, cx - 8, cy - 18, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 2, G.shadow);
      c.fillRect(cx + 17, cy, 4, 4, [240, 60, 20, 255]);
    } else {
      c.drawLine(cx + 6, cy - 2, cx + 8, cy + 7, G.shadow);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.redEye);

    if (frame === 2) {
      c.drawLine(cx + 3, cy - 8, cx + 8, cy - 18, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 2, G.shadow);
      c.fillRect(cx - 21, cy, 4, 4, [240, 60, 20, 255]);
    } else {
      c.drawLine(cx - 6, cy - 2, cx - 8, cy + 7, G.shadow);
    }
  }

  return c;
}

const MythicGenerators = {
  cockatrice: () => createMonsterSheetFromRenderer(renderCockatriceCell),
  dragon: () => createMonsterSheetFromRenderer(renderDragonCell),
  centaur: () => createMonsterSheetFromRenderer(renderCentaurCell),
  jabberwock: () => createMonsterSheetFromRenderer(renderJabberwockCell),
  naga: () => createMonsterSheetFromRenderer(renderNagaCell),
  unicorn: () => createMonsterSheetFromRenderer(renderUnicornCell),
  angel: () => createMonsterSheetFromRenderer(renderAngelCell),
  demon: () => createMonsterSheetFromRenderer(renderDemonCell),
};

module.exports = { MythicGenerators };
