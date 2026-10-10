// Distributed under the NetHack General Public License.
// Generators for Humanoid monster classes (13 classes):
// humanoid, kobold, leprechaun, orc, gnome, giant, kop, ogre, troll, yeti, human, zruty, quantmech

const Canvas = require('../../canvas');
const { createMonsterSheetFromRenderer, getMonsterKinematics, G } = require('./base');

// Helper for biped walk limbs
function drawBipedLegs(c, cx, footY, dir, frame, width = 3, height = 7, color = G.shadow) {
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  let rStep = (frame === 0) ? 2 : (frame === 1 ? -2 : 0);

  if (dir === 2 || dir === 0) {
    // Front or Back facing
    let lY = footY + (frame === 0 ? 0 : (frame === 1 ? -2 : -1));
    let rY = footY + (frame === 1 ? 0 : (frame === 0 ? -2 : -1));
    c.fillRect(cx - 5, lY - height, width, height, color);
    c.fillRect(cx + 2, rY - height, width, height, color);
  } else if (dir === 1) {
    // Facing Right
    let fX = cx + lStep + 2;
    let bX = cx + rStep - 3;
    c.fillRect(bX, footY - height, width, height, G.dark);
    c.fillRect(fX, footY - height, width, height, color);
  } else if (dir === 3) {
    // Facing Left
    let fX = cx - lStep - 4;
    let bX = cx - rStep + 1;
    c.fillRect(bX, footY - height, width, height, G.dark);
    c.fillRect(fX, footY - height, width, height, color);
  }
}

// 1. Humanoid (small stocky dwarf/hobbit with round cap and small battleaxe)
function renderHumanoidCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Legs
  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 6, G.dark);

  // Stocky Torso
  c.fillRect(cx - 6, cy - 2, 12, 11, G.mid);
  c.fillRect(cx - 6, cy + 4, 12, 3, G.dark); // belt

  // Head
  const hy = cy - 8;
  c.fillCircle(cx, hy, 5, G.hi);

  if (dir === 2) {
    // Cap
    c.fillRect(cx - 6, hy - 6, 12, 3, G.shadow);
    c.fillRect(cx - 4, hy - 9, 8, 3, G.shadow);
    // Face & Beard
    c.setPixel(cx - 2, hy - 1, G.dark);
    c.setPixel(cx + 1, hy - 1, G.dark);
    c.fillRect(cx - 4, hy + 1, 8, 5, G.white); // full beard

    // Small Axe
    if (frame === 2) {
      c.drawLine(cx + 7, cy - 8, cx + 13, cy - 14, G.shadow);
      c.fillRect(cx + 11, cy - 16, 5, 4, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy + 2, cx + 14, cy + 8, G.shadow);
      c.fillRect(cx + 12, cy + 6, 5, 4, G.white);
      c.drawLine(cx + 8, cy + 4, cx + 18, cy + 10, G.hi);
    } else {
      c.drawLine(cx + 7, cy - 2, cx + 9, cy + 6, G.shadow);
      c.fillRect(cx + 7, cy - 4, 4, 4, G.white);
    }

  } else if (dir === 0) {
    c.fillRect(cx - 6, hy - 6, 12, 4, G.shadow);
    c.fillRect(cx - 4, hy - 9, 8, 3, G.shadow);

    if (frame === 3) {
      c.drawLine(cx + 6, cy - 10, cx + 12, cy - 16, G.white);
      c.drawLine(cx - 6, cy - 10, cx - 12, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.fillRect(cx - 5, hy - 6, 10, 3, G.shadow);
    c.setPixel(cx + 2, hy - 1, G.dark);
    c.fillRect(cx, hy + 1, 5, 4, G.white);

    if (frame === 2) {
      c.drawLine(cx - 2, cy - 8, cx - 6, cy - 14, G.shadow);
      c.fillRect(cx - 8, cy - 16, 4, 4, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 5, cy, cx + 14, cy + 3, G.shadow);
      c.fillRect(cx + 12, cy + 1, 4, 5, G.white);
      c.drawLine(cx + 15, cy - 2, cx + 18, cy + 6, G.hi);
    } else {
      c.drawLine(cx + 5, cy - 2, cx + 6, cy + 6, G.shadow);
      c.fillRect(cx + 5, cy - 4, 4, 4, G.white);
    }

  } else if (dir === 3) {
    c.fillRect(cx - 5, hy - 6, 10, 3, G.shadow);
    c.setPixel(cx - 3, hy - 1, G.dark);
    c.fillRect(cx - 5, hy + 1, 5, 4, G.white);

    if (frame === 2) {
      c.drawLine(cx + 2, cy - 8, cx + 6, cy - 14, G.shadow);
      c.fillRect(cx + 4, cy - 16, 4, 4, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 5, cy, cx - 14, cy + 3, G.shadow);
      c.fillRect(cx - 16, cy + 1, 4, 5, G.white);
      c.drawLine(cx - 15, cy - 2, cx - 18, cy + 6, G.hi);
    } else {
      c.drawLine(cx - 5, cy - 2, cx - 6, cy + 6, G.shadow);
      c.fillRect(cx - 9, cy - 4, 4, 4, G.white);
    }
  }

  return c;
}

// 2. Kobold (small scaly reptilian biped with hornlets and spear/dart)
function renderKoboldCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;

  // Thin digitigrade legs
  drawBipedLegs(c, cx, 42 + dy, dir, frame, 2, 7, G.dark);

  // Slender torso
  c.fillRect(cx - 4, cy - 3, 8, 10, G.shadow);
  c.fillRect(cx - 2, cy - 2, 4, 8, G.mid);

  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.mid);

  // Hornlets
  c.setPixel(cx - 3, hy - 5, G.white);
  c.setPixel(cx + 2, hy - 5, G.white);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);
    c.fillRect(cx - 2, hy + 1, 4, 3, G.dark); // snout

    // Spear
    if (frame === 2) {
      c.drawLine(cx + 6, cy - 12, cx + 8, cy + 8, G.shadow);
      c.fillRect(cx + 5, cy - 14, 3, 3, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 5, cy + 6, cx + 7, cy + 16, G.shadow);
      c.fillRect(cx + 6, cy + 14, 3, 3, G.white);
      c.drawLine(cx + 6, cy + 16, cx + 6, cy + 20, G.hi);
    } else {
      c.drawLine(cx + 6, cy - 6, cx + 7, cy + 8, G.shadow);
      c.fillRect(cx + 5, cy - 8, 3, 3, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 5, cy - 14, cx + 5, cy - 22, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.redEye);
    c.fillRect(cx + 2, hy, 4, 3, G.dark); // snout

    if (frame === 2) {
      c.drawLine(cx - 4, cy - 10, cx + 4, cy + 8, G.shadow);
      c.fillRect(cx - 6, cy - 12, 3, 3, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy, G.shadow);
      c.fillRect(cx + 17, cy - 1, 4, 3, G.white);
    } else {
      c.drawLine(cx + 5, cy - 6, cx + 5, cy + 8, G.shadow);
      c.fillRect(cx + 4, cy - 8, 3, 3, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.redEye);
    c.fillRect(cx - 6, hy, 4, 3, G.dark);

    if (frame === 2) {
      c.drawLine(cx + 4, cy - 10, cx - 4, cy + 8, G.shadow);
      c.fillRect(cx + 3, cy - 12, 3, 3, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy, G.shadow);
      c.fillRect(cx - 21, cy - 1, 4, 3, G.white);
    } else {
      c.drawLine(cx - 5, cy - 6, cx - 5, cy + 8, G.shadow);
      c.fillRect(cx - 7, cy - 8, 3, 3, G.white);
    }
  }

  return c;
}

// 3. Leprechaun (mischievous sprite with buckled hat, coat, bag of gold)
function renderLeprechaunCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 6, G.dark);

  // Green coat / tunic
  c.fillRect(cx - 5, cy - 3, 10, 10, G.shadow);
  c.fillRect(cx - 3, cy - 3, 6, 8, G.mid);
  c.fillRect(cx - 5, cy + 3, 10, 2, G.dark); // belt with buckle
  c.setPixel(cx, cy + 3, G.yellowEye); // gold buckle

  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.hi);

  // Tall hat with buckle
  c.fillRect(cx - 6, hy - 5, 12, 2, G.dark); // brim
  c.fillRect(cx - 4, hy - 11, 8, 6, G.shadow); // crown
  c.fillRect(cx - 4, hy - 7, 8, 2, G.dark); // band
  c.setPixel(cx, hy - 6, G.yellowEye); // hat buckle

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.dark);
    c.setPixel(cx + 1, hy - 1, G.dark);
    c.fillRect(cx - 3, hy + 2, 6, 2, G.hi); // red/gray chin beard

    // Bag of gold
    c.fillCircle(cx + 7, cy + 3, 4, G.shadow);
    c.setPixel(cx + 7, cy, G.yellowEye); // coins peeking out

    if (frame === 3) {
      // Magic shillelagh spark
      c.drawLine(cx - 6, cy - 4, cx - 12, cy - 10, G.shadow);
      c.fillCircle(cx - 12, cy - 10, 2, G.yellowEye);
    } else {
      c.drawLine(cx - 6, cy, cx - 8, cy + 6, G.shadow);
    }

  } else if (dir === 0) {
    c.fillCircle(cx + 6, cy + 3, 4, G.shadow);
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 14, cy - 14, G.yellowEye);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.dark);
    c.fillRect(cx + 1, hy + 2, 3, 2, G.hi);
    c.fillCircle(cx - 6, cy + 3, 4, G.shadow);

    if (frame === 3) {
      c.drawLine(cx + 4, cy - 2, cx + 14, cy - 4, G.shadow);
      c.fillCircle(cx + 15, cy - 4, 3, G.yellowEye);
    } else {
      c.drawLine(cx + 4, cy, cx + 7, cy + 6, G.shadow);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.dark);
    c.fillRect(cx - 4, hy + 2, 3, 2, G.hi);
    c.fillCircle(cx + 6, cy + 3, 4, G.shadow);

    if (frame === 3) {
      c.drawLine(cx - 4, cy - 2, cx - 14, cy - 4, G.shadow);
      c.fillCircle(cx - 15, cy - 4, 3, G.yellowEye);
    } else {
      c.drawLine(cx - 4, cy, cx - 7, cy + 6, G.shadow);
    }
  }

  return c;
}

// 4. Orc (brutish biped, wide shoulders, tusks, crude scimitar)
function renderOrcClassCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 4, 7, G.dark);

  // Heavy torso / chain-leather
  c.fillRect(cx - 7, cy - 3, 14, 11, G.shadow);
  c.fillRect(cx - 5, cy - 2, 10, 8, G.mid);
  c.fillRect(cx - 7, cy + 5, 14, 3, G.dark); // broad belt

  const hy = cy - 9;
  c.fillCircle(cx, hy, 5, G.mid);
  // Pointed orc ears
  c.setPixel(cx - 6, hy - 1, G.dark);
  c.setPixel(cx + 5, hy - 1, G.dark);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);
    // Tusks
    c.setPixel(cx - 3, hy + 3, G.white);
    c.setPixel(cx + 2, hy + 3, G.white);

    // Scimitar
    if (frame === 2) {
      c.drawLine(cx + 8, cy - 6, cx + 14, cy - 14, G.white);
      c.drawLine(cx + 14, cy - 14, cx + 16, cy - 12, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx + 8, cy + 2, cx + 18, cy + 10, G.white);
      c.drawLine(cx + 10, cy + 4, cx + 19, cy + 7, G.hi);
      c.drawLine(cx + 12, cy + 6, cx + 20, cy + 4, G.white);
    } else {
      c.drawLine(cx + 8, cy - 2, cx + 12, cy + 6, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 8, cy - 10, cx + 16, cy - 18, G.white);
      c.drawLine(cx + 10, cy - 8, cx + 18, cy - 14, G.hi);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.redEye);
    c.setPixel(cx + 4, hy + 2, G.white); // tusk

    if (frame === 2) {
      c.drawLine(cx - 4, cy - 6, cx - 8, cy - 14, G.white);
      c.drawLine(cx - 8, cy - 14, cx - 11, cy - 12, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx + 8, cy, cx + 18, cy + 2, G.white);
      c.drawLine(cx + 14, cy - 2, cx + 20, cy + 5, G.hi);
    } else {
      c.drawLine(cx + 6, cy - 2, cx + 10, cy + 6, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.redEye);
    c.setPixel(cx - 5, hy + 2, G.white);

    if (frame === 2) {
      c.drawLine(cx + 4, cy - 6, cx + 8, cy - 14, G.white);
      c.drawLine(cx + 8, cy - 14, cx + 11, cy - 12, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx - 8, cy, cx - 18, cy + 2, G.white);
      c.drawLine(cx - 14, cy - 2, cx - 20, cy + 5, G.hi);
    } else {
      c.drawLine(cx - 6, cy - 2, cx - 10, cy + 6, G.white);
    }
  }

  return c;
}

// 5. Gnome (pointed floppy cap, big bulbous nose, miner tunic, pickaxe)
function renderGnomeClassCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 5, G.dark);

  // Tunic
  c.fillRect(cx - 5, cy - 2, 10, 10, G.shadow);
  c.fillRect(cx - 4, cy - 1, 8, 7, G.mid);

  const hy = cy - 8;
  c.fillCircle(cx, hy, 4, G.hi);

  // Pointed cap
  c.fillPolygon([
    { x: cx - 5, y: hy - 3 },
    { x: cx + 5, y: hy - 3 },
    { x: cx + 3, y: hy - 11 },
    { x: cx - 1, y: hy - 11 }
  ], G.shadow);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.dark);
    c.setPixel(cx + 1, hy - 1, G.dark);
    // Big nose
    c.fillRect(cx - 2, hy + 1, 4, 3, G.hi);
    c.fillRect(cx - 3, hy + 3, 6, 3, G.white); // beard

    // Pickaxe
    if (frame === 2) {
      c.drawLine(cx + 6, cy - 8, cx + 10, cy - 16, G.shadow);
      c.drawLine(cx + 6, cy - 16, cx + 14, cy - 16, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy + 2, cx + 14, cy + 10, G.shadow);
      c.drawLine(cx + 10, cy + 12, cx + 16, cy + 6, G.white);
      c.drawLine(cx + 12, cy + 8, cx + 18, cy + 12, G.hi);
    } else {
      c.drawLine(cx + 6, cy - 2, cx + 8, cy + 6, G.shadow);
      c.drawLine(cx + 5, cy - 2, cx + 11, cy - 2, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 6, cy - 10, cx + 14, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.dark);
    c.fillRect(cx + 2, hy, 4, 3, G.hi); // big nose side
    c.fillRect(cx + 1, hy + 2, 4, 3, G.white);

    if (frame === 2) {
      c.drawLine(cx - 3, cy - 8, cx - 6, cy - 16, G.shadow);
      c.drawLine(cx - 10, cy - 16, cx - 2, cy - 16, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 15, cy + 4, G.shadow);
      c.drawLine(cx + 13, cy + 8, cx + 17, cy, G.white);
    } else {
      c.drawLine(cx + 5, cy - 2, cx + 6, cy + 6, G.shadow);
      c.drawLine(cx + 2, cy - 2, cx + 8, cy - 2, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.dark);
    c.fillRect(cx - 6, hy, 4, 3, G.hi);
    c.fillRect(cx - 5, hy + 2, 4, 3, G.white);

    if (frame === 2) {
      c.drawLine(cx + 3, cy - 8, cx + 6, cy - 16, G.shadow);
      c.drawLine(cx + 2, cy - 16, cx + 10, cy - 16, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 15, cy + 4, G.shadow);
      c.drawLine(cx - 13, cy + 8, cx - 17, cy, G.white);
    } else {
      c.drawLine(cx - 5, cy - 2, cx - 6, cy + 6, G.shadow);
      c.drawLine(cx - 2, cy - 2, cx - 8, cy - 2, G.white);
    }
  }

  return c;
}

// 6. Giant (massive towering biped, hulking chest, huge tree club)
function renderGiantCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 23 + dy;

  // Massive legs
  drawBipedLegs(c, cx, 43 + dy, dir, frame, 5, 9, G.dark);

  // Huge Torso
  c.fillRect(cx - 9, cy - 6, 18, 15, G.shadow);
  c.fillRect(cx - 7, cy - 5, 14, 12, G.mid);
  c.fillRect(cx - 9, cy + 5, 18, 4, G.dark); // hide belt

  const hy = cy - 12;
  c.fillCircle(cx, hy, 6, G.mid);

  if (dir === 2) {
    c.setPixel(cx - 3, hy - 1, G.redEye);
    c.setPixel(cx + 2, hy - 1, G.redEye);
    c.fillRect(cx - 4, hy + 2, 8, 4, G.shadow); // rugged beard

    // Massive club
    if (frame === 2) {
      c.fillRect(cx + 9, cy - 18, 6, 16, G.shadow);
      c.fillRect(cx + 10, cy - 22, 5, 6, G.dark);
    } else if (frame === 3) {
      c.fillRect(cx + 8, cy + 6, 14, 7, G.shadow);
      c.fillRect(cx + 18, cy + 4, 6, 9, G.dark);
      c.drawLine(cx + 10, cy + 12, cx + 22, cy + 14, G.white); // impact
    } else {
      c.fillRect(cx + 9, cy - 4, 5, 14, G.shadow);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 16, cx - 16, cy - 22, G.white);
      c.drawLine(cx + 8, cy - 16, cx + 16, cy - 22, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 3, hy - 1, G.redEye);
    c.fillRect(cx + 1, hy + 2, 5, 4, G.shadow);

    if (frame === 2) {
      c.fillRect(cx - 10, cy - 18, 6, 16, G.shadow);
    } else if (frame === 3) {
      c.fillRect(cx + 8, cy + 2, 14, 7, G.shadow);
      c.drawLine(cx + 16, cy, cx + 22, cy + 8, G.white);
    } else {
      c.fillRect(cx + 8, cy - 2, 5, 14, G.shadow);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 4, hy - 1, G.redEye);
    c.fillRect(cx - 6, hy + 2, 5, 4, G.shadow);

    if (frame === 2) {
      c.fillRect(cx + 4, cy - 18, 6, 16, G.shadow);
    } else if (frame === 3) {
      c.fillRect(cx - 22, cy + 2, 14, 7, G.shadow);
      c.drawLine(cx - 16, cy, cx - 22, cy + 8, G.white);
    } else {
      c.fillRect(cx - 13, cy - 2, 5, 14, G.shadow);
    }
  }

  return c;
}

// 7. Kop (Keystone Kop biped officer with peaked cap, badge, nightstick)
function renderKopCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 7, G.dark);

  // Blue/gray coat with shiny buttons
  c.fillRect(cx - 6, cy - 3, 12, 11, G.dark);
  c.fillRect(cx - 4, cy - 2, 8, 9, G.shadow);
  c.setPixel(cx, cy - 1, G.yellowEye); // brass button
  c.setPixel(cx, cy + 2, G.yellowEye);
  c.setPixel(cx, cy + 5, G.yellowEye);

  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.hi);

  // Peaked police cap
  c.fillRect(cx - 6, hy - 6, 12, 3, G.dark);
  c.fillRect(cx - 4, hy - 8, 8, 3, G.shadow);
  c.setPixel(cx, hy - 5, G.yellowEye); // badge

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.dark);
    c.setPixel(cx + 1, hy - 1, G.dark);
    c.fillRect(cx - 3, hy + 1, 6, 2, G.dark); // mustache

    // Nightstick / club
    if (frame === 2) {
      c.drawLine(cx + 7, cy - 6, cx + 13, cy - 14, G.dark);
      c.fillRect(cx + 11, cy - 16, 3, 4, G.mid);
    } else if (frame === 3) {
      c.drawLine(cx + 7, cy + 2, cx + 15, cy + 10, G.dark);
      c.drawLine(cx + 10, cy + 6, cx + 18, cy + 8, G.white);
    } else {
      c.drawLine(cx + 7, cy, cx + 9, cy + 8, G.dark);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 7, cy - 8, cx + 14, cy - 14, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.dark);
    c.fillRect(cx + 1, hy + 1, 3, 2, G.dark);

    if (frame === 2) {
      c.drawLine(cx - 3, cy - 6, cx - 7, cy - 14, G.dark);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 16, cy + 2, G.dark);
      c.drawLine(cx + 14, cy - 2, cx + 18, cy + 6, G.white);
    } else {
      c.drawLine(cx + 6, cy, cx + 8, cy + 8, G.dark);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.dark);
    c.fillRect(cx - 4, hy + 1, 3, 2, G.dark);

    if (frame === 2) {
      c.drawLine(cx + 3, cy - 6, cx + 7, cy - 14, G.dark);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 16, cy + 2, G.dark);
      c.drawLine(cx - 14, cy - 2, cx - 18, cy + 6, G.white);
    } else {
      c.drawLine(cx - 6, cy, cx - 8, cy + 8, G.dark);
    }
  }

  return c;
}

// 8. Ogre (huge fat potbelly biped, spiked club, warts)
function renderOgreCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 5, 8, G.dark);

  // Potbelly
  c.fillEllipse(cx, cy + 1, 9, 8, G.shadow);
  c.fillRect(cx - 7, cy - 2, 14, 8, G.mid);
  c.fillRect(cx - 8, cy + 5, 16, 4, G.dark); // loincloth

  const hy = cy - 10;
  c.fillCircle(cx, hy, 5, G.mid);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.yellowEye);
    c.setPixel(cx + 1, hy - 1, G.yellowEye);
    c.fillRect(cx - 3, hy + 2, 6, 3, G.dark);
    c.setPixel(cx - 2, hy + 2, G.white); // underbite fang
    c.setPixel(cx + 1, hy + 2, G.white);

    // Spiked club
    if (frame === 2) {
      c.drawLine(cx + 8, cy - 8, cx + 13, cy - 18, G.dark);
      c.fillRect(cx + 11, cy - 19, 5, 5, G.shadow);
      c.setPixel(cx + 10, cy - 19, G.white); // spikes
      c.setPixel(cx + 16, cy - 17, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 8, cy + 2, cx + 17, cy + 11, G.dark);
      c.fillRect(cx + 15, cy + 9, 6, 6, G.shadow);
      c.setPixel(cx + 17, cy + 7, G.white);
      c.drawLine(cx + 12, cy + 12, cx + 20, cy + 14, G.hi);
    } else {
      c.drawLine(cx + 8, cy - 2, cx + 10, cy + 8, G.dark);
      c.fillRect(cx + 8, cy + 6, 4, 5, G.shadow);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 8, cy - 12, cx + 16, cy - 20, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.yellowEye);
    c.setPixel(cx + 3, hy + 2, G.white);

    if (frame === 2) {
      c.drawLine(cx - 4, cy - 8, cx - 8, cy - 18, G.dark);
      c.fillRect(cx - 10, cy - 19, 5, 5, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx + 8, cy + 1, cx + 18, cy + 3, G.dark);
      c.fillRect(cx + 16, cy + 1, 6, 6, G.shadow);
    } else {
      c.drawLine(cx + 7, cy, cx + 9, cy + 9, G.dark);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.yellowEye);
    c.setPixel(cx - 4, hy + 2, G.white);

    if (frame === 2) {
      c.drawLine(cx + 4, cy - 8, cx + 8, cy - 18, G.dark);
      c.fillRect(cx + 6, cy - 19, 5, 5, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx - 8, cy + 1, cx - 18, cy + 3, G.dark);
      c.fillRect(cx - 22, cy + 1, 6, 6, G.shadow);
    } else {
      c.drawLine(cx - 7, cy, cx - 9, cy + 9, G.dark);
    }
  }

  return c;
}

// 9. Troll (lanky, hunchbacked, long clawed arms, sinewy regenerate)
function renderTrollCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  // Lanky long legs
  drawBipedLegs(c, cx, 43 + dy, dir, frame, 3, 9, G.dark);

  // Hunched Torso
  c.fillRect(cx - 6, cy - 4, 12, 12, G.shadow);
  c.fillRect(cx - 4, cy - 3, 8, 9, G.mid);

  const hy = cy - 9;
  c.fillCircle(cx, hy, 5, G.shadow);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.toxicGreen); // glowing troll eyes
    c.setPixel(cx + 1, hy - 1, G.toxicGreen);
    c.fillRect(cx - 3, hy + 2, 6, 3, G.dark);
    c.setPixel(cx - 2, hy + 3, G.white);

    // Long clawed arms
    if (frame === 2) {
      c.drawLine(cx - 7, cy - 2, cx - 14, cy - 10, G.shadow);
      c.drawLine(cx + 7, cy - 2, cx + 14, cy - 10, G.shadow);
      c.setPixel(cx - 14, cy - 11, G.white);
      c.setPixel(cx + 14, cy - 11, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 7, cy + 2, cx - 16, cy + 12, G.shadow);
      c.drawLine(cx + 7, cy + 2, cx + 16, cy + 12, G.shadow);
      c.drawLine(cx - 16, cy + 12, cx - 12, cy + 14, G.white);
      c.drawLine(cx + 16, cy + 12, cx + 12, cy + 14, G.white);
      c.drawLine(cx - 10, cy + 14, cx + 10, cy + 14, G.hi);
    } else {
      c.drawLine(cx - 7, cy, cx - 11, cy + 9, G.shadow);
      c.drawLine(cx + 7, cy, cx + 11, cy + 9, G.shadow);
      c.setPixel(cx - 11, cy + 10, G.white);
      c.setPixel(cx + 11, cy + 10, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 16, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.toxicGreen);

    if (frame === 2) {
      c.drawLine(cx, cy - 4, cx - 10, cy - 12, G.shadow);
      c.setPixel(cx - 11, cy - 13, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 18, cy + 4, G.shadow);
      c.drawLine(cx + 16, cy + 2, cx + 22, cy + 8, G.white);
    } else {
      c.drawLine(cx + 2, cy, cx + 8, cy + 10, G.shadow);
      c.setPixel(cx + 8, cy + 11, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.toxicGreen);

    if (frame === 2) {
      c.drawLine(cx, cy - 4, cx + 10, cy - 12, G.shadow);
      c.setPixel(cx + 11, cy - 13, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 18, cy + 4, G.shadow);
      c.drawLine(cx - 16, cy + 2, cx - 22, cy + 8, G.white);
    } else {
      c.drawLine(cx - 2, cy, cx - 8, cy + 10, G.shadow);
      c.setPixel(cx - 8, cy + 11, G.white);
    }
  }

  return c;
}

// 10. Yeti (shaggy light-gray apelike beast, roaring fangs, powerful ape gait)
function renderYetiCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 5, 8, G.hi);

  // Shaggy torso
  c.fillEllipse(cx, cy, 9, 8, G.white);
  c.fillRect(cx - 7, cy - 4, 14, 10, G.hi);

  const hy = cy - 9;
  c.fillCircle(cx, hy, 6, G.white);
  c.fillRect(cx - 4, hy - 3, 8, 6, G.shadow); // dark ape face

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.magicBlue); // frosty blue eyes
    c.setPixel(cx + 1, hy - 1, G.magicBlue);
    c.fillRect(cx - 2, hy + 2, 4, 2, G.dark);
    c.setPixel(cx - 2, hy + 2, G.white); // fangs
    c.setPixel(cx + 1, hy + 2, G.white);

    // Powerful ape arms
    if (frame === 2) {
      c.drawLine(cx - 9, cy - 2, cx - 16, cy - 12, G.hi);
      c.drawLine(cx + 9, cy - 2, cx + 16, cy - 12, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx - 9, cy + 2, cx - 17, cy + 12, G.hi);
      c.drawLine(cx + 9, cy + 2, cx + 17, cy + 12, G.hi);
      c.drawLine(cx - 14, cy + 12, cx + 14, cy + 12, G.white); // frosted slam
    } else {
      c.drawLine(cx - 8, cy, cx - 12, cy + 8, G.hi);
      c.drawLine(cx + 8, cy, cx + 12, cy + 8, G.hi);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 16, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.magicBlue);

    if (frame === 2) {
      c.drawLine(cx, cy - 4, cx - 12, cy - 12, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 4, G.hi);
      c.drawLine(cx + 15, cy + 1, cx + 21, cy + 7, G.white);
    } else {
      c.drawLine(cx + 4, cy, cx + 10, cy + 8, G.hi);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.magicBlue);

    if (frame === 2) {
      c.drawLine(cx, cy - 4, cx + 12, cy - 12, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 4, G.hi);
      c.drawLine(cx - 15, cy + 1, cx - 21, cy + 7, G.white);
    } else {
      c.drawLine(cx - 4, cy, cx - 10, cy + 8, G.hi);
    }
  }

  return c;
}

// 11. Human (classic noble fighter biped in plate armor, helmet, broadsword)
function renderHumanClassCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 7, G.shadow);

  // Plate breastplate
  c.fillRect(cx - 6, cy - 3, 12, 11, G.mid);
  c.fillRect(cx - 4, cy - 2, 8, 9, G.hi);
  c.fillRect(cx - 6, cy + 5, 12, 2, G.dark); // belt

  const hy = cy - 9;
  c.fillCircle(cx, hy, 5, G.hi);
  // Helm
  c.fillRect(cx - 5, hy - 5, 10, 5, G.shadow);
  c.fillRect(cx - 1, hy - 7, 2, 4, G.white); // helm plume

  if (dir === 2) {
    // Visor slit
    c.fillRect(cx - 3, hy - 1, 6, 2, G.dark);

    // Broadsword
    if (frame === 2) {
      c.drawLine(cx + 7, cy - 8, cx + 13, cy - 18, G.white);
      c.fillRect(cx + 6, cy - 8, 3, 2, G.dark);
    } else if (frame === 3) {
      c.drawLine(cx + 7, cy + 2, cx + 16, cy + 12, G.white);
      c.drawLine(cx + 10, cy + 6, cx + 19, cy + 10, G.hi);
    } else {
      c.drawLine(cx + 7, cy - 2, cx + 11, cy + 8, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 7, cy - 10, cx + 16, cy - 18, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.dark);

    if (frame === 2) {
      c.drawLine(cx - 3, cy - 8, cx - 8, cy - 18, G.white);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 2, G.white);
      c.drawLine(cx + 15, cy - 2, cx + 21, cy + 6, G.hi);
    } else {
      c.drawLine(cx + 6, cy - 2, cx + 9, cy + 7, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.dark);

    if (frame === 2) {
      c.drawLine(cx + 3, cy - 8, cx + 8, cy - 18, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 2, G.white);
      c.drawLine(cx - 15, cy - 2, cx - 21, cy + 6, G.hi);
    } else {
      c.drawLine(cx - 6, cy - 2, cx - 9, cy + 7, G.white);
    }
  }

  return c;
}

// 12. Zruty (slavic mythical multi-limbed or heavy furred horned beastman)
function renderZrutyCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 4, 8, G.dark);

  // Muscular hulking torso
  c.fillRect(cx - 8, cy - 4, 16, 12, G.shadow);
  c.fillRect(cx - 6, cy - 3, 12, 10, G.mid);

  const hy = cy - 10;
  c.fillCircle(cx, hy, 5, G.mid);

  // Curved horns
  c.drawLine(cx - 4, hy - 3, cx - 8, hy - 8, G.white);
  c.drawLine(cx + 3, hy - 3, cx + 7, hy - 8, G.white);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);
    c.fillRect(cx - 3, hy + 2, 6, 2, G.dark);

    // Quad-armed claws
    if (frame === 2) {
      c.drawLine(cx - 8, cy - 2, cx - 15, cy - 8, G.shadow);
      c.drawLine(cx + 8, cy - 2, cx + 15, cy - 8, G.shadow);
      c.drawLine(cx - 8, cy + 2, cx - 14, cy - 2, G.shadow);
      c.drawLine(cx + 8, cy + 2, cx + 14, cy - 2, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx - 8, cy, cx - 17, cy + 8, G.shadow);
      c.drawLine(cx + 8, cy, cx + 17, cy + 8, G.shadow);
      c.drawLine(cx - 8, cy + 4, cx - 16, cy + 12, G.shadow);
      c.drawLine(cx + 8, cy + 4, cx + 16, cy + 12, G.shadow);
      c.drawLine(cx - 12, cy + 10, cx + 12, cy + 10, G.white);
    } else {
      c.drawLine(cx - 8, cy, cx - 13, cy + 6, G.shadow);
      c.drawLine(cx + 8, cy, cx + 13, cy + 6, G.shadow);
      c.drawLine(cx - 8, cy + 4, cx - 12, cy + 8, G.shadow);
      c.drawLine(cx + 8, cy + 4, cx + 12, cy + 8, G.shadow);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 16, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.redEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 4, cx - 12, cy - 10, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 4, G.shadow);
      c.drawLine(cx + 14, cy, cx + 22, cy + 8, G.white);
    } else {
      c.drawLine(cx + 4, cy, cx + 12, cy + 6, G.shadow);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.redEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 4, cx + 12, cy - 10, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 4, G.shadow);
      c.drawLine(cx - 14, cy, cx - 22, cy + 8, G.white);
    } else {
      c.drawLine(cx - 4, cy, cx - 12, cy + 6, G.shadow);
    }
  }

  return c;
}

// 13. Quantmech (quantum mechanic biped, lab coat, goggles, quantum wrench/box)
function renderQuantmechCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 6, G.dark);

  // White lab coat
  c.fillRect(cx - 5, cy - 3, 10, 11, G.white);
  c.fillRect(cx - 4, cy - 2, 8, 9, G.hi);
  c.fillRect(cx - 1, cy - 2, 2, 10, G.shadow); // coat seam

  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.hi);

  // Goggles
  c.fillRect(cx - 4, hy - 2, 8, 3, G.dark);
  c.setPixel(cx - 2, hy - 1, G.toxicGreen); // glowing green lenses
  c.setPixel(cx + 1, hy - 1, G.toxicGreen);

  if (dir === 2) {
    // Quantum wrench / box
    if (frame === 2) {
      c.drawLine(cx + 6, cy - 6, cx + 12, cy - 14, G.shadow);
      c.fillRect(cx + 10, cy - 16, 4, 4, G.magicBlue); // quantum spark
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy + 2, cx + 15, cy + 8, G.shadow);
      c.fillRect(cx + 13, cy + 6, 5, 5, G.magicBlue);
      c.drawLine(cx + 10, cy + 8, cx + 20, cy + 12, G.white);
    } else {
      c.drawLine(cx + 6, cy - 2, cx + 8, cy + 6, G.shadow);
      c.fillRect(cx + 6, cy - 4, 3, 3, G.magicBlue);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 6, cy - 10, cx + 14, cy - 16, G.magicBlue);
    }

  } else if (dir === 1) {
    if (frame === 2) {
      c.drawLine(cx - 3, cy - 6, cx - 8, cy - 14, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx + 5, cy, cx + 16, cy + 2, G.shadow);
      c.fillRect(cx + 15, cy, 4, 4, G.magicBlue);
    } else {
      c.drawLine(cx + 5, cy - 2, cx + 7, cy + 6, G.shadow);
    }

  } else if (dir === 3) {
    if (frame === 2) {
      c.drawLine(cx + 3, cy - 6, cx + 8, cy - 14, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx - 5, cy, cx - 16, cy + 2, G.shadow);
      c.fillRect(cx - 19, cy, 4, 4, G.magicBlue);
    } else {
      c.drawLine(cx - 5, cy - 2, cx - 7, cy + 6, G.shadow);
    }
  }

  return c;
}

const HumanoidGenerators = {
  humanoid: () => createMonsterSheetFromRenderer(renderHumanoidCell),
  kobold: () => createMonsterSheetFromRenderer(renderKoboldCell),
  leprechaun: () => createMonsterSheetFromRenderer(renderLeprechaunCell),
  orc: () => createMonsterSheetFromRenderer(renderOrcClassCell),
  gnome: () => createMonsterSheetFromRenderer(renderGnomeClassCell),
  giant: () => createMonsterSheetFromRenderer(renderGiantCell),
  kop: () => createMonsterSheetFromRenderer(renderKopCell),
  ogre: () => createMonsterSheetFromRenderer(renderOgreCell),
  troll: () => createMonsterSheetFromRenderer(renderTrollCell),
  yeti: () => createMonsterSheetFromRenderer(renderYetiCell),
  human: () => createMonsterSheetFromRenderer(renderHumanClassCell),
  zruty: () => createMonsterSheetFromRenderer(renderZrutyCell),
  quantmech: () => createMonsterSheetFromRenderer(renderQuantmechCell),
};

module.exports = { HumanoidGenerators };
