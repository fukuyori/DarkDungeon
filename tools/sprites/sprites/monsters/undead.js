// Distributed under the NetHack General Public License.
// Generators for Undead monster classes (6 classes): lich, mummy, vampire, wraith, zombie, ghost

const Canvas = require('../../canvas');
const { createMonsterSheetFromRenderer, getMonsterKinematics, G } = require('./base');

function drawBipedLegs(c, cx, footY, dir, frame, width = 3, height = 7, color = G.dark) {
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  let rStep = (frame === 0) ? 2 : (frame === 1 ? -2 : 0);

  if (dir === 2 || dir === 0) {
    let lY = footY + (frame === 0 ? 0 : -2);
    let rY = footY + (frame === 1 ? 0 : -2);
    c.fillRect(cx - 5, lY - height, width, height, color);
    c.fillRect(cx + 2, rY - height, width, height, color);
  } else if (dir === 1) {
    let fX = cx + lStep + 2;
    let bX = cx + rStep - 3;
    c.fillRect(bX, footY - height, width, height, G.shadow);
    c.fillRect(fX, footY - height, width, height, color);
  } else if (dir === 3) {
    let fX = cx - lStep - 4;
    let bX = cx - rStep + 1;
    c.fillRect(bX, footY - height, width, height, G.shadow);
    c.fillRect(fX, footY - height, width, height, color);
  }
}

// 1. Lich (ancient skeletal arch-mage, jeweled crown, tattered royal robes, magic staff)
function renderLichCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Flowing tattered robe bottom
  let step = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.fillPolygon([
    { x: cx - 7 + step, y: 42 + dy },
    { x: cx + 7 + step, y: 42 + dy },
    { x: cx + 5, y: cy + 4 },
    { x: cx - 5, y: cy + 4 }
  ], G.dark);
  c.fillRect(cx - 5, cy - 2, 10, 8, G.shadow); // robe torso

  // Skeletal skull
  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.white);
  // Crown
  c.fillRect(cx - 5, hy - 6, 10, 3, G.dark);
  c.setPixel(cx - 4, hy - 7, G.yellowEye);
  c.setPixel(cx, hy - 7, G.redEye); // crown gem
  c.setPixel(cx + 3, hy - 7, G.yellowEye);

  if (dir === 2) {
    // Glowing red eye sockets
    c.setPixel(cx - 2, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);
    c.fillRect(cx - 2, hy + 2, 4, 2, G.shadow); // jaw

    // Arcane staff
    if (frame === 2) {
      c.drawLine(cx + 7, cy - 10, cx + 9, cy + 12, G.shadow);
      c.fillCircle(cx + 7, cy - 12, 3, G.magicBlue); // charged spell
    } else if (frame === 3) {
      c.drawLine(cx + 7, cy - 4, cx + 16, cy + 8, G.shadow);
      c.fillCircle(cx + 16, cy + 8, 4, G.magicBlue);
      c.drawLine(cx + 12, cy + 8, cx + 22, cy + 12, G.white); // lightning zap
    } else {
      c.drawLine(cx + 7, cy - 6, cx + 8, cy + 12, G.shadow);
      c.setPixel(cx + 7, cy - 8, G.magicBlue);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 7, cy - 12, cx + 16, cy - 20, G.magicBlue);
      c.drawLine(cx - 7, cy - 12, cx - 16, cy - 20, G.magicBlue);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.redEye);

    if (frame === 2) {
      c.drawLine(cx - 3, cy - 8, cx - 5, cy + 12, G.shadow);
      c.fillCircle(cx - 3, cy - 11, 3, G.magicBlue);
    } else if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 2, G.shadow);
      c.fillCircle(cx + 18, cy + 2, 4, G.magicBlue);
    } else {
      c.drawLine(cx + 6, cy - 6, cx + 6, cy + 12, G.shadow);
      c.setPixel(cx + 6, cy - 8, G.magicBlue);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.redEye);

    if (frame === 2) {
      c.drawLine(cx + 3, cy - 8, cx + 5, cy + 12, G.shadow);
      c.fillCircle(cx + 3, cy - 11, 3, G.magicBlue);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 2, G.shadow);
      c.fillCircle(cx - 18, cy + 2, 4, G.magicBlue);
    } else {
      c.drawLine(cx - 6, cy - 6, cx - 6, cy + 12, G.shadow);
      c.setPixel(cx - 6, cy - 8, G.magicBlue);
    }
  }

  return c;
}

// 2. Mummy (bandaged biped, trailing desiccated linen, reaching curse arms)
function renderMummyCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Bandaged legs
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  let rStep = (frame === 0) ? 2 : (frame === 1 ? -2 : 0);
  if (dir === 2 || dir === 0) {
    let lY = 42 + dy + (frame === 0 ? 0 : -2);
    let rY = 42 + dy + (frame === 1 ? 0 : -2);
    c.fillRect(cx - 5, lY - 8, 3, 8, G.mid);
    c.fillRect(cx + 2, rY - 8, 3, 8, G.mid);
    // Bandage wraps horizontal lines
    c.drawLine(cx - 5, lY - 6, cx - 2, lY - 6, G.white);
    c.drawLine(cx + 2, rY - 6, cx + 5, rY - 6, G.white);
  } else if (dir === 1) {
    c.fillRect(cx + rStep - 3, 42 + dy - 8, 3, 8, G.shadow);
    c.fillRect(cx + lStep + 2, 42 + dy - 8, 3, 8, G.mid);
  } else if (dir === 3) {
    c.fillRect(cx - rStep + 1, 42 + dy - 8, 3, 8, G.shadow);
    c.fillRect(cx - lStep - 4, 42 + dy - 8, 3, 8, G.mid);
  }

  // Torso wraps
  c.fillRect(cx - 6, cy - 3, 12, 11, G.mid);
  c.drawLine(cx - 6, cy - 1, cx + 5, cy - 1, G.white);
  c.drawLine(cx - 6, cy + 2, cx + 5, cy + 2, G.shadow);
  c.drawLine(cx - 6, cy + 5, cx + 5, cy + 5, G.white);

  // Head wraps
  const hy = cy - 9;
  c.fillCircle(cx, hy, 5, G.mid);
  c.drawLine(cx - 4, hy - 3, cx + 4, hy - 3, G.white);
  c.drawLine(cx - 4, hy + 2, cx + 4, hy + 2, G.shadow);

  // Trailing bandages
  c.drawLine(cx + 6, cy + 4, cx + 10 + lStep, cy + 12, G.hi);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.yellowEye);
    c.setPixel(cx + 1, hy - 1, G.yellowEye);

    // Reaching mummy arms
    if (frame === 2) {
      c.drawLine(cx - 7, cy - 2, cx - 13, cy - 10, G.mid);
      c.drawLine(cx + 7, cy - 2, cx + 13, cy - 10, G.mid);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 16, cy + 6, G.mid);
      c.drawLine(cx + 6, cy, cx + 16, cy + 6, G.mid);
      c.drawLine(cx - 14, cy + 6, cx - 18, cy + 4, G.white);
      c.drawLine(cx + 14, cy + 6, cx + 18, cy + 4, G.white);
    } else {
      c.drawLine(cx - 6, cy, cx - 12, cy + 2, G.mid);
      c.drawLine(cx + 6, cy, cx + 12, cy + 2, G.mid);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 14, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 14, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.yellowEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx - 8, cy - 10, G.mid);
    } else if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 18, cy, G.mid);
      c.drawLine(cx + 16, cy - 2, cx + 22, cy + 4, G.white);
    } else {
      c.drawLine(cx + 4, cy, cx + 14, cy + 2, G.mid);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.yellowEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx + 8, cy - 10, G.mid);
    } else if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 18, cy, G.mid);
      c.drawLine(cx - 16, cy - 2, cx - 22, cy + 4, G.white);
    } else {
      c.drawLine(cx - 4, cy, cx - 14, cy + 2, G.mid);
    }
  }

  return c;
}

// 3. Vampire (aristocratic biped, bat-wing cape, fangs, claw slash)
function renderVampireCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Legs in black trousers
  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 7, G.dark);

  // Torso / waistcoat
  c.fillRect(cx - 5, cy - 3, 10, 11, G.dark);
  c.fillRect(cx - 3, cy - 2, 6, 8, G.shadow);
  c.fillRect(cx - 1, cy - 2, 2, 4, G.white); // ascot/cravat

  // High-collared cape
  c.fillPolygon([
    { x: cx - 9, y: cy - 12 },
    { x: cx - 6, y: cy - 2 },
    { x: cx - 10, y: cy + 12 },
    { x: cx - 7, y: cy + 12 }
  ], G.dark);
  c.fillPolygon([
    { x: cx + 9, y: cy - 12 },
    { x: cx + 6, y: cy - 2 },
    { x: cx + 10, y: cy + 12 },
    { x: cx + 7, y: cy + 12 }
  ], G.dark);

  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.white); // pale aristocratic face
  c.fillRect(cx - 4, hy - 4, 8, 3, G.dark); // slick hair

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);
    // Fangs
    c.setPixel(cx - 2, hy + 2, G.white);
    c.setPixel(cx + 1, hy + 2, G.white);
    c.setPixel(cx, hy + 3, [220, 30, 30, 255]); // drop of blood

    if (frame === 2) {
      // Cape wraps forward
      c.fillRect(cx - 7, cy - 4, 14, 12, G.dark);
    } else if (frame === 3) {
      // Cape flares out, claws strike
      c.drawLine(cx - 7, cy, cx - 18, cy + 4, G.white);
      c.drawLine(cx + 7, cy, cx + 18, cy + 4, G.white);
      c.drawLine(cx - 14, cy + 4, cx - 8, cy + 10, [220, 30, 30, 255]);
    }

  } else if (dir === 0) {
    c.fillRect(cx - 7, cy - 5, 14, 16, G.dark); // back cape
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 16, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.redEye);
    c.setPixel(cx + 3, hy + 2, G.white);

    if (frame === 2) {
      c.fillRect(cx - 6, cy - 4, 10, 12, G.dark);
    } else if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 18, cy + 2, G.white);
      c.drawLine(cx + 14, cy - 2, cx + 20, cy + 6, [220, 30, 30, 255]);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.redEye);
    c.setPixel(cx - 4, hy + 2, G.white);

    if (frame === 2) {
      c.fillRect(cx - 4, cy - 4, 10, 12, G.dark);
    } else if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 18, cy + 2, G.white);
      c.drawLine(cx - 14, cy - 2, cx - 20, cy + 6, [220, 30, 30, 255]);
    }
  }

  return c;
}

// 4. Wraith (shadowy floating hooded apparition, ethereal wisps trailing, chilling touch)
function renderWraithCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const floatBob = (frame === 1) ? -2 : 0;
  const cx = 24 + dx;
  const cy = 23 + dy + floatBob;

  // Floating ethereal shroud trailing below
  const wispCurl = (frame === 0) ? -3 : (frame === 1 ? 3 : (frame === 2 ? -4 : 4));
  c.fillPolygon([
    { x: cx - 8, cy: cy - 2 },
    { x: cx + 8, cy: cy - 2 },
    { x: cx + 5 + wispCurl, y: cy + 18 },
    { x: cx + wispCurl, y: cy + 14 },
    { x: cx - 5 + wispCurl, y: cy + 18 }
  ], G.dark);
  c.fillEllipse(cx, cy, 7, 8, G.shadow);

  // Deep hooded cowl
  const hy = cy - 8;
  c.fillCircle(cx, hy, 6, G.dark);
  c.fillRect(cx - 4, hy - 2, 8, 5, [16, 16, 16, 255]); // pitch black inside hood

  if (dir === 2) {
    // Pinprick glowing spectral red eyes in darkness
    c.setPixel(cx - 2, hy, G.redEye);
    c.setPixel(cx + 1, hy, G.redEye);

    // Chilling touch hands
    if (frame === 2) {
      c.drawLine(cx - 7, cy, cx - 14, cy - 8, G.shadow);
      c.drawLine(cx + 7, cy, cx + 14, cy - 8, G.shadow);
      c.fillCircle(cx - 14, cy - 8, 2, G.magicBlue);
      c.fillCircle(cx + 14, cy - 8, 2, G.magicBlue);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 6, G.shadow);
      c.drawLine(cx + 6, cy, cx + 18, cy + 6, G.shadow);
      c.fillCircle(cx - 18, cy + 6, 3, G.magicBlue);
      c.fillCircle(cx + 18, cy + 6, 3, G.magicBlue);
      c.drawLine(cx - 14, cy + 6, cx + 14, cy + 6, G.white);
    } else {
      c.drawLine(cx - 6, cy + 1, cx - 11, cy + 7, G.shadow);
      c.drawLine(cx + 6, cy + 1, cx + 11, cy + 7, G.shadow);
      c.setPixel(cx - 11, cy + 7, G.magicBlue);
      c.setPixel(cx + 11, cy + 7, G.magicBlue);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 16, G.magicBlue);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 16, G.magicBlue);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy, G.redEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx - 10, cy - 8, G.shadow);
      c.fillCircle(cx - 10, cy - 8, 2, G.magicBlue);
    } else if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 18, cy + 2, G.shadow);
      c.fillCircle(cx + 18, cy + 2, 3, G.magicBlue);
    } else {
      c.drawLine(cx + 4, cy + 1, cx + 11, cy + 6, G.shadow);
      c.setPixel(cx + 11, cy + 6, G.magicBlue);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy, G.redEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx + 10, cy - 8, G.shadow);
      c.fillCircle(cx + 10, cy - 8, 2, G.magicBlue);
    } else if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 18, cy + 2, G.shadow);
      c.fillCircle(cx - 18, cy + 2, 3, G.magicBlue);
    } else {
      c.drawLine(cx - 4, cy + 1, cx - 11, cy + 6, G.shadow);
      c.setPixel(cx - 11, cy + 6, G.magicBlue);
    }
  }

  return c;
}

// 5. Zombie (decayed shambling corpse, tattered clothes, exposed bone, grasping hands)
function renderZombieCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Shambling uneven legs
  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 7, G.dark);
  if (dir === 2 || dir === 0) {
    c.setPixel(cx - 4, 38 + dy, G.white); // exposed knee bone
  }

  // Tattered decayed torso
  c.fillRect(cx - 6, cy - 3, 12, 11, G.dark);
  c.fillRect(cx - 4, cy - 2, 8, 8, G.shadow);
  // Exposed ribs
  c.drawLine(cx - 3, cy, cx - 1, cy, G.white);
  c.drawLine(cx - 3, cy + 2, cx - 1, cy + 2, G.white);

  const hy = cy - 9;
  c.fillCircle(cx, hy, 5, G.mid);

  if (dir === 2) {
    c.fillRect(cx - 3, hy - 1, 2, 2, G.dark); // hollow empty socket
    c.setPixel(cx + 1, hy - 1, G.yellowEye); // one cloudy yellow eye
    c.fillRect(cx - 2, hy + 2, 4, 2, G.dark); // slack jaw
    c.setPixel(cx - 1, hy + 2, G.white);

    // Grasping zombie arms
    if (frame === 2) {
      c.drawLine(cx - 6, cy - 2, cx - 12, cy - 10, G.shadow);
      c.drawLine(cx + 6, cy - 2, cx + 12, cy - 10, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 17, cy + 2, G.shadow);
      c.drawLine(cx + 6, cy, cx + 17, cy + 2, G.shadow);
      c.drawLine(cx - 14, cy, cx - 20, cy + 6, G.white);
      c.drawLine(cx + 14, cy, cx + 20, cy + 6, G.white);
    } else {
      c.drawLine(cx - 6, cy, cx - 13, cy + 2, G.shadow);
      c.drawLine(cx + 6, cy, cx + 13, cy + 2, G.shadow);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 14, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 14, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.yellowEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx - 8, cy - 10, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 18, cy + 2, G.shadow);
      c.drawLine(cx + 16, cy, cx + 22, cy + 6, G.white);
    } else {
      c.drawLine(cx + 4, cy, cx + 14, cy + 2, G.shadow);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.yellowEye);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx + 8, cy - 10, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 18, cy + 2, G.shadow);
      c.drawLine(cx - 16, cy, cx - 22, cy + 6, G.white);
    } else {
      c.drawLine(cx - 4, cy, cx - 14, cy + 2, G.shadow);
    }
  }

  return c;
}

// 6. Ghost (translucent billowing pale specter, howling hollow face, floating)
function renderGhostCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const floatBob = (frame === 1) ? -2 : (frame === 0 ? 0 : (frame === 2 ? -3 : 2));
  const cx = 24 + dx;
  const cy = 23 + dy + floatBob;

  // Billowing phantom shroud
  const wave = (frame === 0) ? -3 : (frame === 1 ? 3 : (frame === 2 ? -4 : 4));
  c.fillPolygon([
    { x: cx - 8, y: cy - 4 },
    { x: cx + 8, y: cy - 4 },
    { x: cx + 6 + wave, y: cy + 18 },
    { x: cx + wave, y: cy + 13 },
    { x: cx - 6 + wave, y: cy + 18 }
  ], G.white);
  c.fillEllipse(cx, cy, 7, 8, G.hi);

  // Howling specter head
  const hy = cy - 8;
  c.fillCircle(cx, hy, 6, G.white);

  if (dir === 2) {
    // Hollow black eyes and howling mouth
    c.fillCircle(cx - 2, hy - 1, 2, G.dark);
    c.fillCircle(cx + 2, hy - 1, 2, G.dark);
    c.fillEllipse(cx, hy + 3, 2, 3, G.dark);

    // Phantom arms
    if (frame === 2) {
      c.drawLine(cx - 7, cy, cx - 15, cy - 8, G.hi);
      c.drawLine(cx + 7, cy, cx + 15, cy - 8, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 6, G.hi);
      c.drawLine(cx + 6, cy, cx + 18, cy + 6, G.hi);
      c.drawLine(cx - 15, cy + 4, cx + 15, cy + 4, G.white);
    } else {
      c.drawLine(cx - 6, cy + 1, cx - 12, cy + 6, G.hi);
      c.drawLine(cx + 6, cy + 1, cx + 12, cy + 6, G.hi);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 16, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 16, G.white);
    }

  } else if (dir === 1) {
    c.fillCircle(cx + 2, hy - 1, 2, G.dark);
    c.fillEllipse(cx + 3, hy + 3, 2, 2, G.dark);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx - 10, cy - 8, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 18, cy + 2, G.hi);
    } else {
      c.drawLine(cx + 4, cy + 1, cx + 12, cy + 6, G.hi);
    }

  } else if (dir === 3) {
    c.fillCircle(cx - 2, hy - 1, 2, G.dark);
    c.fillEllipse(cx - 3, hy + 3, 2, 2, G.dark);

    if (frame === 2) {
      c.drawLine(cx, cy - 2, cx + 10, cy - 8, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 18, cy + 2, G.hi);
    } else {
      c.drawLine(cx - 4, cy + 1, cx - 12, cy + 6, G.hi);
    }
  }

  return c;
}

const UndeadGenerators = {
  lich: () => createMonsterSheetFromRenderer(renderLichCell),
  mummy: () => createMonsterSheetFromRenderer(renderMummyCell),
  vampire: () => createMonsterSheetFromRenderer(renderVampireCell),
  wraith: () => createMonsterSheetFromRenderer(renderWraithCell),
  zombie: () => createMonsterSheetFromRenderer(renderZombieCell),
  ghost: () => createMonsterSheetFromRenderer(renderGhostCell),
};

module.exports = { UndeadGenerators };
