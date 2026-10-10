// Distributed under the NetHack General Public License.
// Generators for Aberrant monster classes (21 classes):
// blob, eye, jelly, mimic, piercer, pudding, rustmonst, umber, xorn, eel, fungus,
// trapper, worm, xan, light, vortex, elemental, golem, gremlin, imp, nymph

const Canvas = require('../../canvas');
const { createMonsterSheetFromRenderer, getMonsterKinematics, G } = require('./base');

// Helper for biped legs
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

// 1. Blob (amorphous undulating gelatinous dome, bubbling pseudopods)
function renderBlobCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 28 + dy;

  const squish = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));
  c.fillEllipse(cx, cy + 5, 12 + squish, 6, G.shadow);
  c.fillEllipse(cx, cy, 10, 8, G.mid);
  c.fillRect(cx - 6, cy - 4, 12, 6, G.hi);

  // Bubbles inside
  c.setPixel(cx - 3, cy, G.white);
  c.setPixel(cx + 3, cy + 2, G.white);

  // Pseudopods
  if (frame === 2) {
    c.fillCircle(cx, cy - 6, 4, G.mid);
  } else if (frame === 3) {
    if (dir === 2) {
      c.fillPolygon([{ x: cx - 4, y: cy }, { x: cx + 4, y: cy }, { x: cx, y: cy + 12 }], G.white);
    } else if (dir === 0) {
      c.fillPolygon([{ x: cx - 4, y: cy }, { x: cx + 4, y: cy }, { x: cx, y: cy - 12 }], G.white);
    } else if (dir === 1) {
      c.fillPolygon([{ x: cx, y: cy - 4 }, { x: cx, y: cy + 4 }, { x: cx + 14, y: cy }], G.white);
    } else if (dir === 3) {
      c.fillPolygon([{ x: cx, y: cy - 4 }, { x: cx, y: cy + 4 }, { x: cx - 14, y: cy }], G.white);
    }
  } else {
    const podX = (frame === 0) ? cx - 8 : cx + 8;
    c.fillCircle(podX, cy + 4, 3, G.hi);
  }

  return c;
}

// 2. Eye (floating giant central eyeball, waving optic tentacles, gaze beam)
function renderEyeCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const floatBob = (frame === 1) ? -2 : 0;
  const cx = 24 + dx;
  const cy = 24 + dy + floatBob;

  // Eyeball sphere
  c.fillCircle(cx, cy, 10, G.shadow);
  c.fillCircle(cx, cy, 8, G.white);

  // Optic tentacles waving around perimeter
  const tentWave = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));
  c.drawLine(cx - 8, cy - 6, cx - 14 + tentWave, cy - 12, G.shadow);
  c.drawLine(cx + 8, cy - 6, cx + 14 - tentWave, cy - 12, G.shadow);
  c.drawLine(cx - 9, cy + 5, cx - 15 + tentWave, cy + 10, G.shadow);
  c.drawLine(cx + 9, cy + 5, cx + 15 - tentWave, cy + 10, G.shadow);

  // Pupil / Iris
  if (dir === 2) {
    c.fillCircle(cx, cy, 5, G.magicBlue);
    c.fillCircle(cx, cy, 2, G.dark);
    c.setPixel(cx - 1, cy - 1, G.white);

    if (frame === 3) {
      // Paralysis gaze beam
      c.fillPolygon([{ x: cx - 2, y: cy + 4 }, { x: cx + 2, y: cy + 4 }, { x: cx + 8, y: cy + 18 }, { x: cx - 8, y: cy + 18 }], G.magicBlue);
      c.drawLine(cx, cy + 4, cx, cy + 18, G.white);
    }

  } else if (dir === 0) {
    // Back of eyeball / optic nerve trunk
    c.fillCircle(cx, cy, 6, G.shadow);
    c.fillCircle(cx, cy, 3, G.dark);
    if (frame === 3) {
      c.drawLine(cx, cy - 4, cx, cy - 18, G.magicBlue);
    }

  } else if (dir === 1) {
    c.fillCircle(cx + 4, cy, 5, G.magicBlue);
    c.fillCircle(cx + 5, cy, 2, G.dark);

    if (frame === 3) {
      c.fillPolygon([{ x: cx + 6, y: cy - 2 }, { x: cx + 6, y: cy + 2 }, { x: cx + 18, y: cy + 6 }, { x: cx + 18, y: cy - 6 }], G.magicBlue);
    }

  } else if (dir === 3) {
    c.fillCircle(cx - 4, cy, 5, G.magicBlue);
    c.fillCircle(cx - 5, cy, 2, G.dark);

    if (frame === 3) {
      c.fillPolygon([{ x: cx - 6, y: cy - 2 }, { x: cx - 6, y: cy + 2 }, { x: cx - 18, y: cy + 6 }, { x: cx - 18, y: cy - 6 }], G.magicBlue);
    }
  }

  return c;
}

// 3. Jelly (shimmering translucent cube / acidic slime, floating debris)
function renderJellyCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;

  const jShift = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));

  // Translucent cube shape
  c.fillRect(cx - 9 + jShift, cy - 6, 18, 16, G.mid);
  c.fillRect(cx - 7 + jShift, cy - 4, 14, 12, G.hi);
  c.fillRect(cx - 5 + jShift, cy - 2, 10, 8, G.white);

  // Dissolving bone/debris inside
  c.setPixel(cx - 2 + jShift, cy, G.dark);
  c.setPixel(cx + 2 + jShift, cy + 2, G.shadow);

  if (frame === 3) {
    // Acid splash droplets
    c.setPixel(cx - 12, cy - 4, G.white);
    c.setPixel(cx + 12, cy - 4, G.white);
    c.setPixel(cx - 14, cy + 6, G.hi);
    c.setPixel(cx + 14, cy + 6, G.hi);
    if (dir === 2) {
      c.fillRect(cx - 4, cy + 10, 8, 4, G.white);
    } else if (dir === 0) {
      c.fillRect(cx - 4, cy - 10, 8, 4, G.white);
    } else if (dir === 1) {
      c.fillRect(cx + 10, cy - 4, 4, 8, G.white);
    } else if (dir === 3) {
      c.fillRect(cx - 14, cy - 4, 4, 8, G.white);
    }
  }

  return c;
}

// 4. Mimic (treasure chest with toothy maw, tongue, lid opening and biting)
function renderMimicCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 27 + dy;

  const lidBob = (frame === 0) ? 0 : (frame === 1 ? -2 : (frame === 2 ? -4 : 2));

  // Chest base
  c.fillRect(cx - 10, cy, 20, 12, G.shadow);
  c.fillRect(cx - 8, cy + 2, 16, 8, G.mid);
  c.fillRect(cx - 1, cy + 2, 2, 4, G.yellowEye); // lock clasp

  // Chest lid
  c.fillRect(cx - 11, cy - 6 + lidBob, 22, 6, G.dark);
  c.fillRect(cx - 9, cy - 4 + lidBob, 18, 4, G.shadow);

  if (frame === 2 || frame === 3) {
    // Open lid with teeth and tongue!
    c.fillRect(cx - 8, cy - 2, 16, 4, G.dark); // mouth cavern
    // Sharp fangs top & bottom
    c.setPixel(cx - 6, cy - 2, G.white);
    c.setPixel(cx - 2, cy - 2, G.white);
    c.setPixel(cx + 2, cy - 2, G.white);
    c.setPixel(cx + 6, cy - 2, G.white);
    c.setPixel(cx - 4, cy + 1, G.white);
    c.setPixel(cx, cy + 1, G.white);
    c.setPixel(cx + 4, cy + 1, G.white);

    // Red tongue
    c.fillRect(cx - 2, cy, 4, 3, G.redEye);
  }

  if (frame === 3) {
    // Snap bite impact!
    c.drawLine(cx - 10, cy - 4, cx - 14, cy - 8, G.white);
    c.drawLine(cx + 10, cy - 4, cx + 14, cy - 8, G.white);
  }

  return c;
}

// 5. Piercer (stalactite cone hanging from ceiling, stony ridges, drop impale)
function renderPiercerCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 23 + dy;

  const sway = (frame === 0) ? -1 : (frame === 1 ? 1 : 0);

  // Rocky ceiling base
  c.fillRect(cx - 11, cy - 14, 22, 4, G.dark);
  c.fillRect(cx - 8, cy - 12, 16, 3, G.shadow);

  // Sharp descending stalactite cone
  c.fillPolygon([
    { x: cx - 8, y: cy - 10 },
    { x: cx + 8, y: cy - 10 },
    { x: cx + sway, y: cy + 14 }
  ], G.mid);
  c.drawLine(cx - 6, cy - 8, cx + sway, cy + 14, G.hi);
  c.drawLine(cx + 6, cy - 8, cx + sway, cy + 14, G.shadow);

  // Slit red eyes concealed on stone
  if (dir === 2) {
    c.setPixel(cx - 2, cy, G.redEye);
    c.setPixel(cx + 1, cy, G.redEye);
  }

  if (frame === 3) {
    // Impale thrust
    c.drawLine(cx, cy + 14, cx, cy + 19, G.white);
    c.drawLine(cx - 2, cy + 15, cx + 2, cy + 15, G.hi);
  }

  return c;
}

// 6. Pudding (thick viscous bubbling dark ooze puddle, splitting pseudopods)
function renderPuddingCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 29 + dy;

  const pShift = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -2 : 0));

  c.fillEllipse(cx + pShift, cy + 4, 13, 6, G.dark);
  c.fillEllipse(cx + pShift, cy, 10, 6, [32, 32, 32, 255]);
  c.fillRect(cx - 6 + pShift, cy - 2, 12, 4, G.shadow);

  // Glint highlights on dark wet sludge
  c.setPixel(cx - 4 + pShift, cy - 1, G.white);
  c.setPixel(cx + 3 - pShift, cy + 1, G.white);

  if (frame === 2) {
    c.fillCircle(cx, cy - 8, 5, G.shadow);
    c.fillRect(cx - 3, cy - 7, 6, 5, G.mid);
  } else if (frame === 3) {
    // Splitting slam
    c.fillCircle(cx - 7, cy + 2, 4, G.dark);
    c.fillCircle(cx + 7, cy + 2, 4, G.dark);
    c.drawLine(cx - 10, cy, cx - 14, cy - 4, G.white);
    c.drawLine(cx + 10, cy, cx + 14, cy - 4, G.white);
  } else {
    c.fillCircle(cx + pShift, cy - 3, 3, G.shadow);
  }

  return c;
}

// 7. Rustmonst (insectoid quadruped, feathery antennae, prehensile tail, rust touch)
function renderRustmonstCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;

  // 4 insectoid legs
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  let rStep = (frame === 0) ? 2 : (frame === 1 ? -2 : 0);
  c.fillRect(cx - 7, 36 + dy, 3, 7, G.dark);
  c.fillRect(cx + 4, 36 + dy, 3, 7, G.dark);
  c.fillRect(cx - 4 + lStep, 36 + dy, 2, 7, G.shadow);
  c.fillRect(cx + 2 + rStep, 26 + dy, 2, 7, G.shadow);

  // Armored carapace body
  c.fillEllipse(cx, cy, 9, 7, G.mid);
  c.fillRect(cx - 6, cy - 4, 12, 6, G.hi);

  // Head with feathery antennae
  const hy = cy - 7;
  c.fillCircle(cx, hy, 4, G.mid);
  const antWave = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.drawLine(cx - 2, hy - 2, cx - 9 + antWave, hy - 9, G.shadow);
  c.drawLine(cx + 2, hy - 2, cx + 9 - antWave, hy - 9, G.shadow);
  // Feathery fronds on antennae
  c.setPixel(cx - 8 + antWave, hy - 8, G.white);
  c.setPixel(cx + 8 - antWave, hy - 8, G.white);

  // Tail
  c.drawLine(cx, cy + 6, cx + antWave * 2, cy + 13, G.dark);

  if (frame === 3) {
    // Rust corrosion touch
    c.fillCircle(cx, hy - 10, 3, [220, 80, 20, 255]); // rust spark
  }

  return c;
}

// 8. Umber (umber hulk - massive chitinous burrower, 4 compound eyes, big mandibles)
function renderUmberCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  drawBipedLegs(c, cx, 43 + dy, dir, frame, 4, 8, G.dark);

  // Heavy chitinous torso
  c.fillRect(cx - 8, cy - 4, 16, 13, G.shadow);
  c.fillRect(cx - 6, cy - 3, 12, 10, G.mid);

  // Head
  const hy = cy - 9;
  c.fillCircle(cx, hy, 6, G.shadow);

  // 4 compound eyes!
  if (dir === 2) {
    c.setPixel(cx - 4, hy - 2, G.yellowEye);
    c.setPixel(cx - 2, hy - 2, G.yellowEye);
    c.setPixel(cx + 1, hy - 2, G.yellowEye);
    c.setPixel(cx + 3, hy - 2, G.yellowEye);

    // Large pincers / mandibles
    if (frame === 2) {
      c.drawLine(cx - 5, hy + 2, cx - 11, hy + 2, G.white);
      c.drawLine(cx + 5, hy + 2, cx + 11, hy + 2, G.white);
    } else if (frame === 3) {
      c.drawLine(cx - 5, hy + 2, cx - 2, hy + 6, G.white);
      c.drawLine(cx + 5, hy + 2, cx + 2, hy + 6, G.white);
      c.drawLine(cx - 8, cy + 2, cx - 16, cy + 8, G.white);
      c.drawLine(cx + 8, cy + 2, cx + 16, cy + 8, G.white);
    } else {
      c.drawLine(cx - 5, hy + 2, cx - 8, hy + 5, G.white);
      c.drawLine(cx + 5, hy + 2, cx + 8, hy + 5, G.white);
    }

  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 8, cy - 8, cx - 16, cy - 14, G.white);
      c.drawLine(cx + 8, cy - 8, cx + 16, cy - 14, G.white);
    }

  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 2, G.yellowEye);
    c.setPixel(cx + 4, hy - 2, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx + 6, cy, cx + 18, cy + 2, G.white);
    } else {
      c.drawLine(cx + 5, hy + 2, cx + 9, hy + 4, G.white);
    }

  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 2, G.yellowEye);
    c.setPixel(cx - 5, hy - 2, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 18, cy + 2, G.white);
    } else {
      c.drawLine(cx - 5, hy + 2, cx - 9, hy + 4, G.white);
    }
  }

  return c;
}

// 9. Xorn (tripedal, 3-armed, 3-eyed earth creature, top mouth)
function renderXornCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // 3 stony legs
  let lStep = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.fillRect(cx - 7 - lStep, 36 + dy, 4, 7, G.dark);
  c.fillRect(cx - 1 + lStep, 36 + dy, 3, 7, G.dark);
  c.fillRect(cx + 4 - lStep, 36 + dy, 4, 7, G.dark);

  // Barrel-shaped rocky body
  c.fillEllipse(cx, cy, 10, 10, G.shadow);
  c.fillRect(cx - 7, cy - 5, 14, 10, G.mid);

  // Top gaping mouth with teeth
  c.fillRect(cx - 4, cy - 9, 8, 3, G.dark);
  c.setPixel(cx - 3, cy - 9, G.white);
  c.setPixel(cx, cy - 9, G.white);
  c.setPixel(cx + 3, cy - 9, G.white);

  // 3 radial eyes
  c.setPixel(cx - 5, cy - 3, G.yellowEye);
  c.setPixel(cx, cy - 4, G.yellowEye);
  c.setPixel(cx + 4, cy - 3, G.yellowEye);

  // 3 stony arms
  if (frame === 2) {
    c.drawLine(cx - 8, cy, cx - 15, cy - 8, G.shadow);
    c.drawLine(cx + 8, cy, cx + 15, cy - 8, G.shadow);
  } else if (frame === 3) {
    c.drawLine(cx - 8, cy, cx - 18, cy + 4, G.shadow);
    c.drawLine(cx + 8, cy, cx + 18, cy + 4, G.shadow);
    c.drawLine(cx, cy + 2, cx, cy + 14, G.shadow);
  } else {
    c.drawLine(cx - 8, cy, cx - 13, cy + 5, G.shadow);
    c.drawLine(cx + 8, cy, cx + 13, cy + 5, G.shadow);
  }

  return c;
}

// 10. Eel (undulating sea serpent, snapping jaws, electric spark)
function renderEelCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  const wave = (frame === 0) ? -3 : (frame === 1 ? 3 : (frame === 2 ? -4 : 4));

  if (dir === 2 || dir === 0) {
    c.fillEllipse(cx + wave, cy + 6, 7, 6, G.mid);
    c.fillEllipse(cx - wave, cy - 2, 6, 6, G.shadow);
    c.fillCircle(cx, cy - 8, 5, G.dark);
    c.setPixel(cx - 2, cy - 8, G.yellowEye);
    c.setPixel(cx + 1, cy - 8, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx - 4, cy - 12, cx - 1, cy - 16, G.magicBlue); // electric zap
      c.drawLine(cx + 3, cy - 12, cx + 1, cy - 16, G.magicBlue);
    }
  } else if (dir === 1) {
    c.fillEllipse(cx - 8, cy + wave, 8, 4, G.mid);
    c.fillEllipse(cx, cy - wave, 8, 4, G.shadow);
    c.fillCircle(cx + 7, cy, 4, G.dark);
    c.setPixel(cx + 8, cy - 1, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx + 11, cy - 2, cx + 18, cy - 4, G.magicBlue);
    }
  } else if (dir === 3) {
    c.fillEllipse(cx + 8, cy + wave, 8, 4, G.mid);
    c.fillEllipse(cx, cy - wave, 8, 4, G.shadow);
    c.fillCircle(cx - 7, cy, 4, G.dark);
    c.setPixel(cx - 9, cy - 1, G.yellowEye);

    if (frame === 3) {
      c.drawLine(cx - 11, cy - 2, cx - 18, cy - 4, G.magicBlue);
    }
  }

  return c;
}

// 11. Fungus (violet/shrike fungus, mushroom cap, whipping spore tentacles)
function renderFungusCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Stalk base
  c.fillRect(cx - 5, cy + 4, 10, 9, G.shadow);
  c.fillRect(cx - 3, cy + 4, 6, 9, G.mid);

  // Broad mushroom cap
  const capSway = (frame === 0) ? -1 : (frame === 1 ? 1 : 0);
  c.fillEllipse(cx + capSway, cy - 2, 12, 7, G.dark);
  c.fillRect(cx - 9 + capSway, cy - 4, 18, 5, G.mid);
  c.setPixel(cx - 4 + capSway, cy - 4, G.toxicGreen); // glowing spores
  c.setPixel(cx + 3 + capSway, cy - 4, G.toxicGreen);

  // Whipping tentacles
  const whip = (frame === 0) ? -3 : (frame === 1 ? 3 : (frame === 2 ? -4 : 4));
  c.drawLine(cx - 5, cy + 6, cx - 12 + whip, cy + 12, G.shadow);
  c.drawLine(cx + 5, cy + 6, cx + 12 - whip, cy + 12, G.shadow);

  if (frame === 3) {
    // Spore burst!
    c.fillCircle(cx, cy - 10, 3, G.toxicGreen);
    c.drawLine(cx - 10, cy, cx - 16, cy + 6, G.white);
    c.drawLine(cx + 10, cy, cx + 16, cy + 6, G.white);
  }

  return c;
}

// 12. Trapper (flat floor lurker, leathery hide, smothering jaws)
function renderTrapperCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 29 + dy;

  const fold = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));

  // Flat rug-like leathery slab
  c.fillEllipse(cx + fold, cy + 4, 14, 5, G.dark);
  c.fillRect(cx - 12 + fold, cy + 2, 24, 4, G.shadow);
  c.fillRect(cx - 8 + fold, cy, 16, 3, G.mid);

  if (frame === 2 || frame === 3) {
    // Folds rising up to smother!
    c.drawLine(cx - 12, cy + 4, cx - 10, cy - 8, G.shadow);
    c.drawLine(cx + 12, cy + 4, cx + 10, cy - 8, G.shadow);
    c.fillCircle(cx, cy, 4, G.dark);
    c.setPixel(cx - 2, cy - 1, G.white); // crushing teeth
    c.setPixel(cx + 1, cy - 1, G.white);
  }

  if (frame === 3) {
    c.drawLine(cx - 10, cy - 8, cx, cy - 12, G.white);
    c.drawLine(cx + 10, cy - 8, cx, cy - 12, G.white);
  }

  return c;
}

// 13. Worm (giant segmented ringed burrowing worm, ring of teeth)
function renderWormCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  const seg = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);

  // Segmented body rings
  c.fillEllipse(cx - 6, cy + 4 + seg, 6, 5, G.dark);
  c.fillEllipse(cx, cy + 1 - seg, 7, 5, G.shadow);
  c.fillEllipse(cx + 5, cy - 3 + seg, 8, 6, G.mid);

  // Circular tooth-lined maw
  c.fillCircle(cx + 7, cy - 4, 5, G.dark);
  c.setPixel(cx + 6, cy - 6, G.white);
  c.setPixel(cx + 9, cy - 4, G.white);
  c.setPixel(cx + 6, cy - 2, G.white);

  if (frame === 3) {
    c.drawLine(cx + 10, cy - 4, cx + 18, cy - 4, G.white);
  }

  return c;
}

// 14. Xan (giant stinging insect, iridescent wings, long curved stinger)
function renderXanCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  // Thin insect legs
  c.drawLine(cx - 4, cy + 4, cx - 8, cy + 12, G.dark);
  c.drawLine(cx + 4, cy + 4, cx + 8, cy + 12, G.dark);

  // Thorax & Head
  c.fillCircle(cx, cy - 2, 4, G.mid);
  c.setPixel(cx - 2, cy - 3, G.redEye);
  c.setPixel(cx + 1, cy - 3, G.redEye);

  // Wings buzzing
  const wingUp = (frame === 1 || frame === 3);
  if (wingUp) {
    c.drawLine(cx, cy - 4, cx - 12, cy - 14, G.white);
    c.drawLine(cx, cy - 4, cx + 12, cy - 14, G.white);
  } else {
    c.drawLine(cx, cy - 4, cx - 14, cy - 6, G.white);
    c.drawLine(cx, cy - 4, cx + 14, cy - 6, G.white);
  }

  // Abdomen & curved stinger
  const stingWave = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.fillEllipse(cx, cy + 5, 5, 6, G.shadow);
  c.drawLine(cx, cy + 9, cx + stingWave, cy + 15, G.dark);
  c.setPixel(cx + stingWave, cy + 15, G.toxicGreen); // venom drop

  if (frame === 3) {
    c.drawLine(cx, cy + 12, cx, cy + 18, G.white);
  }

  return c;
}

// 15. Light (brilliant floating ball of light / will-o'-wisp, corona rays)
function renderLightCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const floatBob = (frame === 1) ? -2 : 0;
  const cx = 24 + dx;
  const cy = 24 + dy + floatBob;

  // Radiant core
  c.fillCircle(cx, cy, 9, G.hi);
  c.fillCircle(cx, cy, 6, G.white);

  // Dancing corona rays
  const rayRot = (frame === 0) ? 0 : (frame === 1 ? 3 : (frame === 2 ? -2 : 4));
  c.drawLine(cx - 14, cy, cx + 14, cy, G.yellowEye);
  c.drawLine(cx, cy - 14, cx, cy + 14, G.yellowEye);
  c.drawLine(cx - 10 + rayRot, cy - 10 - rayRot, cx + 10 - rayRot, cy + 10 + rayRot, G.white);
  c.drawLine(cx - 10 - rayRot, cy + 10 - rayRot, cx + 10 + rayRot, cy - 10 + rayRot, G.white);

  if (frame === 3) {
    // Blinding flash
    c.drawLine(cx - 17, cy, cx + 17, cy, G.white);
    c.drawLine(cx, cy - 17, cx, cy + 17, G.white);
    c.drawLine(cx - 12, cy - 12, cx + 12, cy + 12, G.white);
    c.drawLine(cx - 12, cy + 12, cx + 12, cy - 12, G.white);
  }

  return c;
}

// 16. Vortex (swirling kinetic whirlpool / tornado funnel, dust & lightning)
function renderVortexCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const floatBob = (frame === 1) ? -2 : 0;
  const cx = 24 + dx;
  const cy = 24 + dy + floatBob;

  const spin = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -4 : 4));

  // Funnel tiers
  c.fillEllipse(cx, cy - 10, 12, 4, G.mid);
  c.fillEllipse(cx + spin, cy - 4, 10, 4, G.shadow);
  c.fillEllipse(cx - spin, cy + 2, 7, 3, G.mid);
  c.fillEllipse(cx, cy + 8, 4, 2, G.dark);

  // Lightning filaments inside vortex
  c.drawLine(cx - 6, cy - 8, cx + 4, cy, G.magicBlue);
  c.drawLine(cx + 4, cy, cx - 2, cy + 6, G.white);

  if (frame === 3) {
    c.drawLine(cx - 12, cy - 10, cx - 18, cy - 14, G.magicBlue);
    c.drawLine(cx + 12, cy - 10, cx + 18, cy - 14, G.magicBlue);
  }

  return c;
}

// 17. Elemental (whirling manifestation of primal forces, rocky/flame/water)
function renderElementalCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  const surge = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 2 ? -3 : 3));

  // Craggy core
  c.fillCircle(cx, cy, 8, G.mid);
  c.fillRect(cx - 5, cy - 5, 10, 10, G.shadow);

  // Swirling stone/flame chunks orbiting
  c.fillCircle(cx - 10 + surge, cy - 6, 3, G.hi);
  c.fillCircle(cx + 10 - surge, cy - 6, 3, G.hi);
  c.fillCircle(cx - 7 - surge, cy + 8, 3, G.dark);
  c.fillCircle(cx + 7 + surge, cy + 8, 3, G.dark);

  // Glowing eyes in elemental core
  c.setPixel(cx - 2, cy - 1, G.redEye);
  c.setPixel(cx + 1, cy - 1, G.redEye);

  if (frame === 3) {
    // Kinetic blast
    c.drawLine(cx - 8, cy - 8, cx - 16, cy - 14, G.white);
    c.drawLine(cx + 8, cy - 8, cx + 16, cy - 14, G.white);
  }

  return c;
}

// 18. Golem (massive stone automaton, heavy blocky fists, glowing rune)
function renderGolemCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 24 + dy;

  // Blocky stone legs
  let lY = 43 + dy + (frame === 0 ? 0 : -2);
  let rY = 43 + dy + (frame === 1 ? 0 : -2);
  c.fillRect(cx - 7, lY - 8, 5, 8, G.dark);
  c.fillRect(cx + 2, rY - 8, 5, 8, G.dark);

  // Massive monolithic chest
  c.fillRect(cx - 8, cy - 5, 16, 14, G.shadow);
  c.fillRect(cx - 6, cy - 4, 12, 11, G.mid);

  // Glowing arcane rune on chest
  c.setPixel(cx - 1, cy, G.magicBlue);
  c.setPixel(cx, cy - 1, G.magicBlue);
  c.setPixel(cx, cy + 1, G.magicBlue);
  c.setPixel(cx + 1, cy, G.magicBlue);

  // Stone head
  const hy = cy - 10;
  c.fillRect(cx - 4, hy - 4, 8, 7, G.mid);
  c.setPixel(cx - 2, hy - 1, G.magicBlue);
  c.setPixel(cx + 1, hy - 1, G.magicBlue);

  // Heavy stone fists
  if (frame === 2) {
    c.fillRect(cx - 14, cy - 8, 6, 6, G.shadow);
    c.fillRect(cx + 8, cy - 8, 6, 6, G.shadow);
  } else if (frame === 3) {
    c.fillRect(cx - 14, cy + 6, 7, 7, G.shadow);
    c.fillRect(cx + 7, cy + 6, 7, 7, G.shadow);
    c.drawLine(cx - 10, cy + 13, cx + 10, cy + 13, G.white); // ground smash
  } else {
    c.fillRect(cx - 13, cy, 5, 6, G.shadow);
    c.fillRect(cx + 8, cy, 5, 6, G.shadow);
  }

  return c;
}

// 19. Gremlin (bat-eared squat imp, devilish grin, sharp claw scratch)
function renderGremlinCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 3, 5, G.dark);

  // Squat torso
  c.fillRect(cx - 5, cy - 2, 10, 9, G.shadow);
  c.fillRect(cx - 3, cy - 1, 6, 7, G.mid);

  // Head with large bat ears
  const hy = cy - 8;
  c.fillCircle(cx, hy, 4, G.mid);
  c.fillPolygon([{ x: cx - 3, y: hy }, { x: cx - 8, y: hy - 6 }, { x: cx - 1, y: hy - 4 }], G.shadow);
  c.fillPolygon([{ x: cx + 3, y: hy }, { x: cx + 8, y: hy - 6 }, { x: cx + 1, y: hy - 4 }], G.shadow);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.yellowEye);
    c.setPixel(cx + 1, hy - 1, G.yellowEye);
    c.fillRect(cx - 2, hy + 2, 4, 1, G.white); // toothy grin

    if (frame === 3) {
      c.drawLine(cx - 6, cy, cx - 14, cy + 6, G.white);
      c.drawLine(cx + 6, cy, cx + 14, cy + 6, G.white);
    } else {
      c.drawLine(cx - 5, cy, cx - 9, cy + 4, G.dark);
      c.drawLine(cx + 5, cy, cx + 9, cy + 4, G.dark);
    }
  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 6, hy - 6, cx - 12, hy - 12, G.white);
      c.drawLine(cx + 6, hy - 6, cx + 12, hy - 12, G.white);
    }
  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.yellowEye);
    if (frame === 3) {
      c.drawLine(cx + 5, cy, cx + 16, cy + 2, G.white);
    } else {
      c.drawLine(cx + 4, cy, cx + 8, cy + 4, G.dark);
    }
  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.yellowEye);
    if (frame === 3) {
      c.drawLine(cx - 5, cy, cx - 16, cy + 2, G.white);
    } else {
      c.drawLine(cx - 4, cy, cx - 8, cy + 4, G.dark);
    }
  }

  return c;
}

// 20. Imp (tiny horned winged fiend, barbed tail, miniature pitchfork)
function renderImpCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 26 + dy;

  drawBipedLegs(c, cx, 42 + dy, dir, frame, 2, 5, G.dark);

  // Small torso
  c.fillRect(cx - 4, cy - 2, 8, 8, G.shadow);
  c.fillRect(cx - 2, cy - 1, 4, 6, G.mid);

  // Small bat wings
  const wingUp = (frame === 1 || frame === 3);
  if (wingUp) {
    c.drawLine(cx - 3, cy - 2, cx - 8, cy - 8, G.dark);
    c.drawLine(cx + 3, cy - 2, cx + 8, cy - 8, G.dark);
  } else {
    c.drawLine(cx - 3, cy, cx - 9, cy + 3, G.dark);
    c.drawLine(cx + 3, cy, cx + 9, cy + 3, G.dark);
  }

  // Head with pointed horns
  const hy = cy - 7;
  c.fillCircle(cx, hy, 3, G.mid);
  c.setPixel(cx - 2, hy - 4, G.white);
  c.setPixel(cx + 1, hy - 4, G.white);

  // Barbed tail
  const tailSway = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.drawLine(cx, cy + 4, cx + tailSway * 2, cy + 10, G.dark);
  c.setPixel(cx + tailSway * 2, cy + 10, G.redEye);

  if (dir === 2) {
    c.setPixel(cx - 1, hy - 1, G.redEye);
    c.setPixel(cx + 1, hy - 1, G.redEye);

    // Mini pitchfork
    if (frame === 2) {
      c.drawLine(cx + 5, cy - 4, cx + 9, cy - 12, G.shadow);
    } else if (frame === 3) {
      c.drawLine(cx + 5, cy + 2, cx + 13, cy + 8, G.shadow);
      c.setPixel(cx + 14, cy + 8, G.white);
    } else {
      c.drawLine(cx + 5, cy - 2, cx + 6, cy + 6, G.shadow);
    }
  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx + 5, cy - 8, cx + 12, cy - 14, G.white);
    }
  } else if (dir === 1) {
    c.setPixel(cx + 1, hy - 1, G.redEye);
    if (frame === 3) {
      c.drawLine(cx + 5, cy, cx + 14, cy, G.shadow);
      c.setPixel(cx + 15, cy, G.white);
    } else {
      c.drawLine(cx + 4, cy - 2, cx + 5, cy + 6, G.shadow);
    }
  } else if (dir === 3) {
    c.setPixel(cx - 2, hy - 1, G.redEye);
    if (frame === 3) {
      c.drawLine(cx - 5, cy, cx - 14, cy, G.shadow);
      c.setPixel(cx - 15, cy, G.white);
    } else {
      c.drawLine(cx - 4, cy - 2, cx - 5, cy + 6, G.shadow);
    }
  }

  return c;
}

// 21. Nymph (graceful nature sprite, leaf dress, alluring dance, enchanting wave)
function renderNymphCell(dir, frame) {
  const c = new Canvas(48, 48);
  const { dx, dy } = getMonsterKinematics(dir, frame);
  const cx = 24 + dx;
  const cy = 25 + dy;

  // Graceful legs
  drawBipedLegs(c, cx, 42 + dy, dir, frame, 2, 7, G.hi);

  // Leaf tunic dress
  c.fillRect(cx - 4, cy - 3, 8, 9, G.mid);
  c.fillRect(cx - 3, cy - 2, 6, 7, G.hi);
  c.setPixel(cx, cy + 4, G.toxicGreen); // leaf trim

  // Head with flowing hair
  const hy = cy - 9;
  c.fillCircle(cx, hy, 4, G.hi);
  // Hair
  const hairSway = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
  c.drawLine(cx - 4, hy - 3, cx - 6 + hairSway, hy + 4, G.shadow);
  c.drawLine(cx + 4, hy - 3, cx + 6 - hairSway, hy + 4, G.shadow);

  if (dir === 2) {
    c.setPixel(cx - 2, hy - 1, G.dark);
    c.setPixel(cx + 1, hy - 1, G.dark);

    // Alluring wave / magic kiss
    if (frame === 2) {
      c.drawLine(cx + 5, cy - 2, cx + 10, cy - 8, G.hi);
    } else if (frame === 3) {
      c.drawLine(cx + 5, cy, cx + 14, cy + 2, G.hi);
      c.fillCircle(cx + 15, cy + 2, 2, G.magicBlue); // charm sparkle
    } else {
      c.drawLine(cx + 4, cy, cx + 7, cy + 6, G.hi);
    }
  } else if (dir === 0) {
    if (frame === 3) {
      c.drawLine(cx - 6, cy - 8, cx - 12, cy - 14, G.magicBlue);
      c.drawLine(cx + 6, cy - 8, cx + 12, cy - 14, G.magicBlue);
    }
  } else if (dir === 1) {
    c.setPixel(cx + 2, hy - 1, G.dark);
    if (frame === 3) {
      c.drawLine(cx + 4, cy, cx + 15, cy, G.hi);
      c.fillCircle(cx + 16, cy, 2, G.magicBlue);
    } else {
      c.drawLine(cx + 3, cy, cx + 6, cy + 6, G.hi);
    }
  } else if (dir === 3) {
    c.setPixel(cx - 3, hy - 1, G.dark);
    if (frame === 3) {
      c.drawLine(cx - 4, cy, cx - 15, cy, G.hi);
      c.fillCircle(cx - 16, cy, 2, G.magicBlue);
    } else {
      c.drawLine(cx - 3, cy, cx - 6, cy + 6, G.hi);
    }
  }

  return c;
}

const AberrantGenerators = {
  blob: () => createMonsterSheetFromRenderer(renderBlobCell),
  eye: () => createMonsterSheetFromRenderer(renderEyeCell),
  jelly: () => createMonsterSheetFromRenderer(renderJellyCell),
  mimic: () => createMonsterSheetFromRenderer(renderMimicCell),
  piercer: () => createMonsterSheetFromRenderer(renderPiercerCell),
  pudding: () => createMonsterSheetFromRenderer(renderPuddingCell),
  rustmonst: () => createMonsterSheetFromRenderer(renderRustmonstCell),
  umber: () => createMonsterSheetFromRenderer(renderUmberCell),
  xorn: () => createMonsterSheetFromRenderer(renderXornCell),
  eel: () => createMonsterSheetFromRenderer(renderEelCell),
  fungus: () => createMonsterSheetFromRenderer(renderFungusCell),
  trapper: () => createMonsterSheetFromRenderer(renderTrapperCell),
  worm: () => createMonsterSheetFromRenderer(renderWormCell),
  xan: () => createMonsterSheetFromRenderer(renderXanCell),
  light: () => createMonsterSheetFromRenderer(renderLightCell),
  vortex: () => createMonsterSheetFromRenderer(renderVortexCell),
  elemental: () => createMonsterSheetFromRenderer(renderElementalCell),
  golem: () => createMonsterSheetFromRenderer(renderGolemCell),
  gremlin: () => createMonsterSheetFromRenderer(renderGremlinCell),
  imp: () => createMonsterSheetFromRenderer(renderImpCell),
  nymph: () => createMonsterSheetFromRenderer(renderNymphCell),
};

module.exports = { AberrantGenerators };
