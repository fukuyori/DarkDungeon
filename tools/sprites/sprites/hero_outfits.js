// Distributed under the NetHack General Public License.
// Generator for Hero Outfit layers (13 roles)
// All outfits fit every body pixel-exactly across all 16 frames.

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');
const { getHeroKinematics } = require('./hero_hair');

const ROLES = [
  'archeologist',
  'barbarian',
  'caveman',
  'healer',
  'knight',
  'monk',
  'priest',
  'ranger',
  'rogue',
  'samurai',
  'tourist',
  'valkyrie',
  'wizard',
];

function createOutfitSheet(role) {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderOutfitCell(role, dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function getFootCoords(dir, frame, cx) {
  if (dir === 2) {
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 43 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 42 : 42));
    return { lFootY, rFootY, lFootX: cx - 6, rFootX: cx + 2 };
  } else if (dir === 0) {
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 42 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 43 : 42));
    return { lFootY, rFootY, lFootX: cx - 6, rFootX: cx + 2 };
  } else if (dir === 1) {
    let lLegX = cx - 4, lFootY = 40, rLegX = cx + 3, rFootY = 43;
    if (frame === 1) { lLegX = cx + 1; lFootY = 42; rLegX = cx - 2; rFootY = 40; }
    else if (frame === 2) { lLegX = cx - 2; lFootY = 42; rLegX = cx + 2; rFootY = 42; }
    else if (frame === 3) { lLegX = cx - 3; lFootY = 41; rLegX = cx + 5; rFootY = 43; }
    return { lFootY, rFootY, lFootX: lLegX - 2, rFootX: rLegX - 2 };
  } else {
    let lLegX = cx + 4, lFootY = 40, rLegX = cx - 3, rFootY = 43;
    if (frame === 1) { lLegX = cx - 1; lFootY = 42; rLegX = cx + 2; rFootY = 40; }
    else if (frame === 2) { lLegX = cx + 2; lFootY = 42; rLegX = cx - 2; rFootY = 42; }
    else if (frame === 3) { lLegX = cx + 3; lFootY = 41; rLegX = cx - 5; rFootY = 43; }
    return { lFootY, rFootY, lFootX: lLegX - 2, rFootX: rLegX - 2 };
  }
}

function renderOutfitCell(role, dir, frame) {
  const outfit = new Canvas(48, 48);
  const { cx, hy, yBob, xShift } = getHeroKinematics(dir, frame);
  const ty = 26 + yBob;
  const feet = getFootCoords(dir, frame, cx);

  if (role === 'valkyrie') {
    return renderValkyrieOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'archeologist') {
    return renderArcheologistOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'barbarian') {
    return renderBarbarianOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'caveman') {
    return renderCavemanOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'healer') {
    return renderHealerOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'knight') {
    return renderKnightOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'monk') {
    return renderMonkOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'priest') {
    return renderPriestOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'ranger') {
    return renderRangerOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'rogue') {
    return renderRogueOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'samurai') {
    return renderSamuraiOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'tourist') {
    return renderTouristOutfit(dir, frame, cx, hy, ty, feet);
  } else if (role === 'wizard') {
    return renderWizardOutfit(dir, frame, cx, hy, ty, feet);
  }

  return outfit;
}

// 1. Valkyrie (Horned helmet, chainmail, greaves) - Approved Pilot
function renderValkyrieOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.valkyrieArmor;

  if (dir === 2) {
    outfit.fillEllipse(cx, hy - 5, 7, 4, P.steelMid);
    outfit.fillRect(cx - 5, hy - 8, 5, 4, P.steelHi);
    outfit.fillRect(cx + 1, hy - 8, 4, 4, P.steelShadow);

    outfit.fillRect(cx - 6, hy - 3, 12, 2, P.brassMid);
    outfit.fillRect(cx - 6, hy - 3, 4, 1, P.brassHi);
    outfit.fillRect(cx + 2, hy - 3, 4, 1, P.brassShadow);

    outfit.fillRect(cx - 9, hy - 5, 3, 3, P.hornMid);
    outfit.fillRect(cx - 12, hy - 8, 3, 3, P.hornHi);
    outfit.fillRect(cx - 13, hy - 11, 2, 4, P.hornHi);
    outfit.setPixel(cx - 13, hy - 12, P.hornHi);

    outfit.fillRect(cx + 7, hy - 5, 3, 3, P.hornShadow);
    outfit.fillRect(cx + 10, hy - 8, 3, 3, P.hornMid);
    outfit.fillRect(cx + 12, hy - 11, 2, 4, P.hornMid);
    outfit.setPixel(cx + 13, hy - 12, P.hornMid);

    outfit.fillRect(cx - 9, ty - 7, 4, 4, P.steelMid);
    outfit.fillRect(cx - 9, ty - 7, 2, 3, P.steelHi);
    outfit.fillRect(cx + 5, ty - 7, 4, 4, P.steelShadow);

    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.steelMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 8, P.steelHi);
    outfit.fillRect(cx + 2, ty - 6, 4, 10, P.steelShadow);

    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.brassMid);
    outfit.setPixel(cx - 1, ty + 1, P.ruby);
    outfit.setPixel(cx, ty + 1, P.ruby);

    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.steelMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 2, 4, P.steelHi);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.steelShadow);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 2, 4, P.steelMid);

  } else if (dir === 0) {
    outfit.fillEllipse(cx, hy - 5, 7, 4, P.steelMid);
    outfit.fillRect(cx - 5, hy - 8, 5, 4, P.steelHi);
    outfit.fillRect(cx + 1, hy - 8, 4, 4, P.steelShadow);

    outfit.fillRect(cx - 9, hy - 5, 3, 3, P.hornMid);
    outfit.fillRect(cx - 12, hy - 8, 3, 3, P.hornHi);
    outfit.fillRect(cx - 13, hy - 11, 2, 4, P.hornHi);
    outfit.setPixel(cx - 13, hy - 12, P.hornHi);

    outfit.fillRect(cx + 7, hy - 5, 3, 3, P.hornShadow);
    outfit.fillRect(cx + 10, hy - 8, 3, 3, P.hornMid);
    outfit.fillRect(cx + 12, hy - 11, 2, 4, P.hornMid);
    outfit.setPixel(cx + 13, hy - 12, P.hornMid);

    outfit.fillRect(cx - 9, ty - 7, 4, 4, P.steelMid);
    outfit.fillRect(cx + 5, ty - 7, 4, 4, P.steelShadow);

    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.steelMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 8, P.steelHi);
    outfit.fillRect(cx + 2, ty - 6, 4, 10, P.steelShadow);

    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.steelMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.steelShadow);

  } else if (dir === 1) {
    outfit.fillEllipse(cx, hy - 5, 6, 4, P.steelMid);
    outfit.fillRect(cx - 4, hy - 8, 4, 4, P.steelHi);

    outfit.fillRect(cx - 2, hy - 7, 3, 3, P.hornMid);
    outfit.fillRect(cx - 4, hy - 10, 3, 3, P.hornHi);
    outfit.setPixel(cx - 4, hy - 11, P.hornHi);

    outfit.fillRect(cx + 2, hy - 6, 3, 3, P.hornMid);
    outfit.fillRect(cx + 4, hy - 9, 3, 3, P.hornHi);
    outfit.setPixel(cx + 5, hy - 11, P.hornHi);

    outfit.fillRect(cx - 4, ty - 6, 9, 10, P.steelMid);
    outfit.fillRect(cx - 4, ty - 6, 3, 8, P.steelHi);
    outfit.fillRect(cx - 3, ty - 7, 5, 4, P.steelHi);

    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.steelMid);

  } else if (dir === 3) {
    outfit.fillEllipse(cx, hy - 5, 6, 4, P.steelMid);
    outfit.fillRect(cx - 1, hy - 8, 4, 4, P.steelHi);

    outfit.fillRect(cx - 5, hy - 6, 3, 3, P.hornMid);
    outfit.fillRect(cx - 7, hy - 9, 3, 3, P.hornHi);
    outfit.setPixel(cx - 8, hy - 11, P.hornHi);

    outfit.fillRect(cx - 5, ty - 6, 9, 10, P.steelMid);
    outfit.fillRect(cx - 5, ty - 6, 3, 8, P.steelHi);
    outfit.fillRect(cx - 2, ty - 7, 5, 4, P.steelHi);

    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.steelMid);
  }

  return outfit;
}

// 2. Archeologist (Fedora, leather explorer jacket, boots)
function renderArcheologistOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitArcheologist;

  if (dir === 2) {
    // Fedora brim and crown
    outfit.fillRect(cx - 8, hy - 3, 16, 2, P.hatMid);
    outfit.fillRect(cx - 6, hy - 7, 12, 4, P.hatMid);
    outfit.fillRect(cx - 5, hy - 7, 5, 3, P.hatHi);
    outfit.fillRect(cx - 6, hy - 4, 12, 1, P.hatBand);

    // Leather explorer jacket with open collar showing shirt
    outfit.fillRect(cx - 7, ty - 6, 14, 10, P.jacketMid);
    outfit.fillRect(cx - 7, ty - 6, 3, 9, P.jacketHi);
    outfit.fillRect(cx + 4, ty - 6, 3, 10, P.jacketShadow);
    outfit.fillRect(cx - 2, ty - 6, 4, 6, P.shirt); // open collar shirt

    // Belt & buckle
    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.belt);
    outfit.fillRect(cx - 1, ty + 1, 3, 2, P.buckle);

    // Boots
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 0) {
    // Fedora from back
    outfit.fillRect(cx - 8, hy - 3, 16, 2, P.hatMid);
    outfit.fillRect(cx - 6, hy - 7, 12, 4, P.hatMid);
    outfit.fillRect(cx - 6, hy - 4, 12, 1, P.hatBand);

    // Jacket back
    outfit.fillRect(cx - 7, ty - 6, 14, 10, P.jacketMid);
    outfit.fillRect(cx - 7, ty - 6, 4, 8, P.jacketHi);
    outfit.fillRect(cx + 3, ty - 6, 4, 10, P.jacketShadow);

    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 1) {
    outfit.fillRect(cx - 7, hy - 3, 15, 2, P.hatMid);
    outfit.fillRect(cx - 5, hy - 7, 10, 4, P.hatMid);
    outfit.fillRect(cx - 5, hy - 4, 10, 1, P.hatBand);

    outfit.fillRect(cx - 5, ty - 6, 10, 10, P.jacketMid);
    outfit.fillRect(cx - 5, ty - 6, 3, 8, P.jacketHi);
    outfit.fillRect(cx + 2, ty - 4, 3, 4, P.shirt);

    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 3) {
    outfit.fillRect(cx - 8, hy - 3, 15, 2, P.hatMid);
    outfit.fillRect(cx - 5, hy - 7, 10, 4, P.hatMid);
    outfit.fillRect(cx - 5, hy - 4, 10, 1, P.hatBand);

    outfit.fillRect(cx - 5, ty - 6, 10, 10, P.jacketMid);
    outfit.fillRect(cx - 5, ty - 6, 3, 8, P.jacketHi);
    outfit.fillRect(cx - 5, ty - 4, 3, 4, P.shirt);

    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);
  }

  return outfit;
}

// 3. Barbarian (Fur harness, bare arms, fur-topped boots)
function renderBarbarianOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitBarbarian;

  if (dir === 2) {
    // Fur mantle at shoulders
    outfit.fillRect(cx - 8, ty - 7, 5, 4, P.furMid);
    outfit.fillRect(cx - 8, ty - 7, 2, 3, P.furHi);
    outfit.fillRect(cx + 3, ty - 7, 5, 4, P.furShadow);

    // Cross leather chest straps
    outfit.drawLine(cx - 5, ty - 6, cx + 4, ty, P.leatherMid);
    outfit.drawLine(cx + 4, ty - 6, cx - 5, ty, P.leatherShadow);
    outfit.setPixel(cx, ty - 3, P.studs);

    // Studded leather loincloth
    outfit.fillRect(cx - 6, ty + 1, 12, 4, P.leatherMid);
    outfit.fillRect(cx - 6, ty + 1, 3, 3, P.leatherHi);
    outfit.fillRect(cx - 4, ty + 2, 8, 1, P.studs);

    // Leather bracers on arms
    outfit.fillRect(cx - 9, ty + 1, 3, 3, P.leatherMid);
    outfit.fillRect(cx + 6, ty + 1, 3, 3, P.leatherMid);

    // Fur-topped boots
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 2, P.furMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 2, 4, 3, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 2, P.furShadow);
    outfit.fillRect(feet.rFootX, feet.rFootY - 2, 4, 3, P.boots);

  } else if (dir === 0) {
    outfit.fillRect(cx - 8, ty - 7, 16, 4, P.furMid);
    outfit.fillRect(cx - 8, ty - 7, 5, 3, P.furHi);
    outfit.fillRect(cx - 6, ty + 1, 12, 4, P.leatherMid);

    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 2, P.furMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 2, 4, 3, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 2, P.furShadow);
    outfit.fillRect(feet.rFootX, feet.rFootY - 2, 4, 3, P.boots);

  } else if (dir === 1) {
    outfit.fillRect(cx - 5, ty - 7, 6, 4, P.furMid);
    outfit.fillRect(cx - 4, ty + 1, 8, 4, P.leatherMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 2, P.furMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 2, 4, 3, P.boots);

  } else if (dir === 3) {
    outfit.fillRect(cx - 1, ty - 7, 6, 4, P.furMid);
    outfit.fillRect(cx - 4, ty + 1, 8, 4, P.leatherMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 2, P.furMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 2, 4, 3, P.boots);
  }

  return outfit;
}

// 4. Caveman (Spotted pelt tunic, asymmetrical strap, jagged hem)
function renderCavemanOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitCaveman;

  if (dir === 2) {
    // Single shoulder strap from left shoulder diagonally across chest
    outfit.fillRect(cx - 7, ty - 7, 4, 4, P.peltMid);
    outfit.drawLine(cx - 7, ty - 5, cx + 4, ty + 1, P.peltMid);
    outfit.drawLine(cx - 6, ty - 5, cx + 5, ty + 1, P.peltHi);

    // Spotted tunic around waist
    outfit.fillRect(cx - 6, ty - 1, 12, 6, P.peltMid);
    outfit.fillRect(cx - 6, ty - 1, 4, 5, P.peltHi);
    outfit.setPixel(cx - 4, ty, P.spots);
    outfit.setPixel(cx + 2, ty + 1, P.spots);
    outfit.setPixel(cx - 1, ty + 3, P.spots);

    // Jagged hem
    outfit.setPixel(cx - 5, ty + 5, P.peltHi);
    outfit.setPixel(cx - 1, ty + 5, P.peltMid);
    outfit.setPixel(cx + 3, ty + 5, P.peltShadow);

    // Rough leg wraps at feet
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.wrapMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wrapMid);

  } else if (dir === 0) {
    outfit.fillRect(cx - 7, ty - 7, 5, 4, P.peltMid);
    outfit.fillRect(cx - 6, ty - 1, 12, 6, P.peltMid);
    outfit.setPixel(cx - 3, ty + 1, P.spots);
    outfit.setPixel(cx + 2, ty + 2, P.spots);

    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.wrapMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wrapMid);

  } else if (dir === 1) {
    outfit.fillRect(cx - 4, ty - 7, 4, 4, P.peltMid);
    outfit.fillRect(cx - 4, ty - 1, 8, 6, P.peltMid);
    outfit.setPixel(cx, ty + 1, P.spots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wrapMid);

  } else if (dir === 3) {
    outfit.fillRect(cx, ty - 7, 4, 4, P.peltMid);
    outfit.fillRect(cx - 4, ty - 1, 8, 6, P.peltMid);
    outfit.setPixel(cx - 2, ty + 1, P.spots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wrapMid);
  }

  return outfit;
}

// 5. Healer (White robe with green trim, white coif, white shoes)
function renderHealerOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitHealer;

  if (dir === 2) {
    // Coif / cowl on head
    outfit.fillEllipse(cx, hy - 4, 7, 4, P.robeMid);
    outfit.fillRect(cx - 5, hy - 7, 5, 3, P.robeHi);
    outfit.fillRect(cx - 6, hy - 2, 12, 2, P.trimMid); // green brow trim

    // White robe over torso down past knees
    outfit.fillRect(cx - 6, ty - 6, 12, 14, P.robeMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 12, P.robeHi);
    outfit.fillRect(cx + 3, ty - 6, 3, 14, P.robeShadow);

    // Green central stole and cross emblem
    outfit.fillRect(cx - 2, ty - 6, 4, 14, P.trimMid);
    outfit.fillRect(cx - 2, ty - 6, 2, 12, P.trimHi);
    outfit.fillRect(cx - 4, ty - 3, 8, 2, P.trimMid); // cross bar

    // Green belt
    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.belt);

    // Clean white shoes
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.shoes);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);

  } else if (dir === 0) {
    outfit.fillEllipse(cx, hy - 4, 7, 4, P.robeMid);
    outfit.fillRect(cx - 6, ty - 6, 12, 14, P.robeMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 12, P.robeHi);
    outfit.fillRect(cx - 6, ty + 6, 12, 2, P.trimMid); // green hem trim

    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.shoes);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);

  } else if (dir === 1) {
    outfit.fillEllipse(cx, hy - 4, 6, 4, P.robeMid);
    outfit.fillRect(cx - 4, ty - 6, 9, 14, P.robeMid);
    outfit.fillRect(cx - 4, ty - 6, 3, 12, P.robeHi);
    outfit.fillRect(cx + 2, ty - 6, 3, 14, P.trimMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);

  } else if (dir === 3) {
    outfit.fillEllipse(cx, hy - 4, 6, 4, P.robeMid);
    outfit.fillRect(cx - 5, ty - 6, 9, 14, P.robeMid);
    outfit.fillRect(cx - 5, ty - 6, 3, 12, P.robeHi);
    outfit.fillRect(cx - 5, ty - 6, 3, 14, P.trimMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);
  }

  return outfit;
}

// 6. Knight (Full plate armor, visored greathelm with red plume, steel greaves)
function renderKnightOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitKnight;

  if (dir === 2) {
    // Steel greathelm with red plume
    outfit.fillEllipse(cx, hy - 5, 7, 5, P.plateMid);
    outfit.fillRect(cx - 5, hy - 8, 5, 4, P.plateHi);
    outfit.fillRect(cx + 1, hy - 8, 4, 4, P.plateShadow);

    // Visor eye-slit
    outfit.fillRect(cx - 5, hy - 2, 10, 2, OUTLINE);
    outfit.setPixel(cx - 3, hy - 2, P.goldHi);
    outfit.setPixel(cx + 2, hy - 2, P.goldHi);

    // Red plume on crown
    outfit.fillRect(cx - 2, hy - 11, 4, 4, P.plume);

    // Pauldrons
    outfit.fillRect(cx - 9, ty - 7, 4, 4, P.plateMid);
    outfit.fillRect(cx - 9, ty - 7, 2, 3, P.plateHi);
    outfit.fillRect(cx + 5, ty - 7, 4, 4, P.plateShadow);

    // Solid steel cuirass
    outfit.fillRect(cx - 6, ty - 6, 12, 11, P.plateMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 9, P.plateHi);
    outfit.fillRect(cx + 2, ty - 6, 4, 11, P.plateShadow);

    // Golden waist trim
    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.goldMid);

    // Articulated greaves
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.plateMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 2, 4, P.plateHi);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.plateShadow);

  } else if (dir === 0) {
    outfit.fillEllipse(cx, hy - 5, 7, 5, P.plateMid);
    outfit.fillRect(cx - 2, hy - 11, 4, 4, P.plume);
    outfit.fillRect(cx - 9, ty - 7, 4, 4, P.plateMid);
    outfit.fillRect(cx + 5, ty - 7, 4, 4, P.plateShadow);
    outfit.fillRect(cx - 6, ty - 6, 12, 11, P.plateMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.plateMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.plateShadow);

  } else if (dir === 1) {
    outfit.fillEllipse(cx, hy - 5, 6, 5, P.plateMid);
    outfit.fillRect(cx - 3, hy - 11, 4, 4, P.plume);
    outfit.fillRect(cx + 2, hy - 2, 4, 2, OUTLINE);
    outfit.fillRect(cx - 4, ty - 6, 9, 11, P.plateMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.plateMid);

  } else if (dir === 3) {
    outfit.fillEllipse(cx, hy - 5, 6, 5, P.plateMid);
    outfit.fillRect(cx - 1, hy - 11, 4, 4, P.plume);
    outfit.fillRect(cx - 6, hy - 2, 4, 2, OUTLINE);
    outfit.fillRect(cx - 5, ty - 6, 9, 11, P.plateMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.plateMid);
  }

  return outfit;
}

// 7. Monk (White/cream martial gi, black belt, red headband, foot wraps)
function renderMonkOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitMonk;

  if (dir === 2) {
    // Red headband around forehead
    outfit.fillRect(cx - 6, hy - 3, 12, 2, P.headband);
    outfit.fillRect(cx - 8, hy - 2, 2, 4, P.headband); // trailing ribbon

    // White crossed gi top
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.giMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 8, P.giHi);
    outfit.drawLine(cx - 5, ty - 6, cx + 2, ty, P.giShadow); // lapel cross

    // Tied black obi belt with dangling ends
    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.beltMid);
    outfit.fillRect(cx - 1, ty + 2, 3, 4, P.beltMid); // knot & ties

    // Hand wraps
    outfit.fillRect(cx - 9, ty + 1, 3, 2, P.wraps);
    outfit.fillRect(cx + 6, ty + 1, 3, 2, P.wraps);

    // Foot wraps
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.wraps);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wraps);

  } else if (dir === 0) {
    outfit.fillRect(cx - 6, hy - 3, 12, 2, P.headband);
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.giMid);
    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.beltMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.wraps);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wraps);

  } else if (dir === 1) {
    outfit.fillRect(cx - 5, hy - 3, 10, 2, P.headband);
    outfit.fillRect(cx - 4, ty - 6, 9, 10, P.giMid);
    outfit.fillRect(cx - 4, ty + 1, 9, 2, P.beltMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wraps);

  } else if (dir === 3) {
    outfit.fillRect(cx - 5, hy - 3, 10, 2, P.headband);
    outfit.fillRect(cx - 5, ty - 6, 9, 10, P.giMid);
    outfit.fillRect(cx - 5, ty + 1, 9, 2, P.beltMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.wraps);
  }

  return outfit;
}

// 8. Priest (Royal purple vestments, golden solar stole/cross)
function renderPriestOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitPriest;

  if (dir === 2) {
    // Mitre / liturgical headpiece
    outfit.fillEllipse(cx, hy - 5, 6, 5, P.mitre);
    outfit.fillRect(cx - 2, hy - 9, 4, 4, P.mitre);
    outfit.setPixel(cx, hy - 9, P.goldHi);

    // Purple vestment robe
    outfit.fillRect(cx - 6, ty - 6, 12, 14, P.robeMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 12, P.robeHi);
    outfit.fillRect(cx + 3, ty - 6, 3, 14, P.robeShadow);

    // Golden holy stole down chest
    outfit.fillRect(cx - 2, ty - 6, 4, 12, P.goldMid);
    outfit.fillRect(cx - 2, ty - 6, 2, 10, P.goldHi);
    // Solar disk symbol
    outfit.fillCircle(cx, ty - 2, 2, P.goldHi);

    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.robeShadow);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.robeShadow);

  } else if (dir === 0) {
    outfit.fillEllipse(cx, hy - 5, 6, 5, P.mitre);
    outfit.fillRect(cx - 2, hy - 9, 4, 4, P.mitre);
    outfit.fillRect(cx - 6, ty - 6, 12, 14, P.robeMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.robeShadow);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.robeShadow);

  } else if (dir === 1) {
    outfit.fillEllipse(cx, hy - 5, 5, 5, P.mitre);
    outfit.fillRect(cx - 4, ty - 6, 9, 14, P.robeMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.robeShadow);

  } else if (dir === 3) {
    outfit.fillEllipse(cx, hy - 5, 5, 5, P.mitre);
    outfit.fillRect(cx - 5, ty - 6, 9, 14, P.robeMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.robeShadow);
  }

  return outfit;
}

// 9. Ranger (Green hooded cowl, brown leather armor, quiver strap, boots)
function renderRangerOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitRanger;

  if (dir === 2) {
    // Green hood pulled up over crown
    outfit.fillEllipse(cx, hy - 4, 7, 5, P.hoodMid);
    outfit.fillRect(cx - 6, hy - 7, 6, 4, P.hoodHi);
    outfit.fillRect(cx - 6, hy - 4, 12, 2, P.hoodMid);

    // Brown leather tunic
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.tunicMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 8, P.tunicHi);

    // Diagonal quiver strap
    outfit.drawLine(cx - 5, ty - 6, cx + 4, ty + 1, P.strap);
    outfit.setPixel(cx, ty - 2, P.buckle);

    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.tunicShadow);

    // Soft tracking boots
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 0) {
    outfit.fillEllipse(cx, hy - 4, 7, 5, P.hoodMid);
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.tunicMid);
    // Quiver visible on back
    outfit.fillRect(cx + 3, ty - 7, 3, 8, P.strap);
    outfit.setPixel(cx + 4, ty - 8, Palettes.weapon.bladeWhite); // arrow fletching

    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 1) {
    outfit.fillEllipse(cx, hy - 4, 6, 5, P.hoodMid);
    outfit.fillRect(cx - 4, ty - 6, 9, 10, P.tunicMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 3) {
    outfit.fillEllipse(cx, hy - 4, 6, 5, P.hoodMid);
    outfit.fillRect(cx - 5, ty - 6, 9, 10, P.tunicMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);
  }

  return outfit;
}

// 10. Rogue (Dark midnight leather, face mask covering lower face)
function renderRogueOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitRogue;

  if (dir === 2) {
    // Dark cowl covering head
    outfit.fillEllipse(cx, hy - 4, 7, 5, P.leatherMid);
    outfit.fillRect(cx - 5, hy - 7, 5, 4, P.leatherHi);

    // Face mask covering lower face (from hy + 2 down to chin)
    outfit.fillRect(cx - 5, hy + 2, 10, 5, P.maskMid);
    outfit.fillRect(cx - 4, hy + 2, 4, 3, P.maskHi);

    // Dark leather cuirass
    outfit.fillRect(cx - 6, ty - 6, 12, 11, P.leatherMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 9, P.leatherHi);
    outfit.fillRect(cx + 2, ty - 6, 4, 11, P.leatherShadow);

    // Buckle
    outfit.setPixel(cx, ty + 1, P.buckle);

    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 0) {
    outfit.fillEllipse(cx, hy - 4, 7, 5, P.leatherMid);
    outfit.fillRect(cx - 6, ty - 6, 12, 11, P.leatherMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 1) {
    outfit.fillEllipse(cx, hy - 4, 6, 5, P.leatherMid);
    outfit.fillRect(cx + 2, hy + 2, 4, 4, P.maskMid);
    outfit.fillRect(cx - 4, ty - 6, 9, 11, P.leatherMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);

  } else if (dir === 3) {
    outfit.fillEllipse(cx, hy - 4, 6, 5, P.leatherMid);
    outfit.fillRect(cx - 6, hy + 2, 4, 4, P.maskMid);
    outfit.fillRect(cx - 5, ty - 6, 9, 11, P.leatherMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.boots);
  }

  return outfit;
}

// 11. Samurai (Kabuto helmet with golden horns, red/black lamellar armor, suneate)
function renderSamuraiOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitSamurai;

  if (dir === 2) {
    // Kabuto bowl
    outfit.fillEllipse(cx, hy - 5, 7, 4, P.armorMid);
    outfit.fillRect(cx - 5, hy - 8, 5, 4, P.armorHi);

    // Golden kuwagata horns
    outfit.drawLine(cx - 1, hy - 6, cx - 6, hy - 11, P.goldMid);
    outfit.drawLine(cx + 1, hy - 6, cx + 6, hy - 11, P.goldMid);
    outfit.setPixel(cx - 6, hy - 11, P.goldHi);
    outfit.setPixel(cx + 6, hy - 11, P.goldHi);

    // Sode shoulder guards
    outfit.fillRect(cx - 10, ty - 7, 4, 5, P.armorMid);
    outfit.fillRect(cx + 6, ty - 7, 4, 5, P.armorShadow);

    // Red lamellar chestplate (do) with black lacing
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.armorMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 8, P.armorHi);
    outfit.drawLine(cx - 5, ty - 3, cx + 4, ty - 3, P.lace);
    outfit.drawLine(cx - 5, ty, cx + 4, ty, P.lace);

    // Red suneate greaves
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.suneate);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.suneate);

  } else if (dir === 0) {
    outfit.fillEllipse(cx, hy - 5, 7, 4, P.armorMid);
    outfit.fillRect(cx - 10, ty - 7, 4, 5, P.armorMid);
    outfit.fillRect(cx + 6, ty - 7, 4, 5, P.armorShadow);
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.armorMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 4, 4, 5, P.suneate);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.suneate);

  } else if (dir === 1) {
    outfit.fillEllipse(cx, hy - 5, 6, 4, P.armorMid);
    outfit.drawLine(cx, hy - 6, cx + 5, hy - 11, P.goldMid);
    outfit.fillRect(cx - 4, ty - 6, 9, 10, P.armorMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.suneate);

  } else if (dir === 3) {
    outfit.fillEllipse(cx, hy - 5, 6, 4, P.armorMid);
    outfit.drawLine(cx, hy - 6, cx - 5, hy - 11, P.goldMid);
    outfit.fillRect(cx - 5, ty - 6, 9, 10, P.armorMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 4, 4, 5, P.suneate);
  }

  return outfit;
}

// 12. Tourist (Safari sun hat, loud Hawaiian shirt, Bermuda shorts, sneakers)
function renderTouristOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitTourist;

  if (dir === 2) {
    // Safari sun hat with wide brim
    outfit.fillRect(cx - 8, hy - 4, 16, 2, P.hatMid);
    outfit.fillRect(cx - 6, hy - 7, 12, 4, P.hatMid);
    outfit.fillRect(cx - 5, hy - 7, 5, 3, P.hatHi);
    outfit.fillRect(cx - 6, hy - 5, 12, 1, P.hatShadow);

    // Loud Hawaiian tropical shirt (pink with bright floral patterns)
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.shirtBase);
    outfit.setPixel(cx - 4, ty - 4, P.shirtPattern1);
    outfit.setPixel(cx - 3, ty - 4, P.shirtPattern2);
    outfit.setPixel(cx + 2, ty - 2, P.shirtPattern1);
    outfit.setPixel(cx + 3, ty - 2, P.shirtPattern2);
    outfit.setPixel(cx - 2, ty + 1, P.shirtPattern1);

    // Khaki Bermuda shorts
    outfit.fillRect(cx - 6, ty + 2, 12, 3, P.shortsMid);
    outfit.fillRect(cx - 6, ty + 2, 4, 3, P.shortsHi);

    // White sneakers
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.shoes);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);

  } else if (dir === 0) {
    outfit.fillRect(cx - 8, hy - 4, 16, 2, P.hatMid);
    outfit.fillRect(cx - 6, hy - 7, 12, 4, P.hatMid);
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.shirtBase);
    outfit.setPixel(cx - 2, ty - 4, P.shirtPattern1);
    outfit.setPixel(cx + 2, ty - 1, P.shirtPattern2);
    outfit.fillRect(cx - 6, ty + 2, 12, 3, P.shortsMid);
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.shoes);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);

  } else if (dir === 1) {
    outfit.fillRect(cx - 7, hy - 4, 15, 2, P.hatMid);
    outfit.fillRect(cx - 5, hy - 7, 10, 4, P.hatMid);
    outfit.fillRect(cx - 4, ty - 6, 9, 10, P.shirtBase);
    outfit.setPixel(cx, ty - 3, P.shirtPattern1);
    outfit.fillRect(cx - 4, ty + 2, 9, 3, P.shortsMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);

  } else if (dir === 3) {
    outfit.fillRect(cx - 8, hy - 4, 15, 2, P.hatMid);
    outfit.fillRect(cx - 5, hy - 7, 10, 4, P.hatMid);
    outfit.fillRect(cx - 5, ty - 6, 9, 10, P.shirtBase);
    outfit.setPixel(cx - 2, ty - 3, P.shirtPattern1);
    outfit.fillRect(cx - 5, ty + 2, 9, 3, P.shortsMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.shoes);
  }

  return outfit;
}

// 13. Wizard (Robe and pointed hat with golden star)
function renderWizardOutfit(dir, frame, cx, hy, ty, feet) {
  const outfit = new Canvas(48, 48);
  const P = Palettes.outfitWizard;

  if (dir === 2) {
    // Tall conical pointed wizard hat
    outfit.fillRect(cx - 9, hy - 3, 18, 2, P.robeMid); // wide brim
    outfit.fillRect(cx - 6, hy - 6, 12, 3, P.robeMid);
    outfit.fillRect(cx - 4, hy - 8, 8, 2, P.robeHi);
    outfit.fillRect(cx - 2, hy - 10, 4, 2, P.robeHi);
    outfit.setPixel(cx, hy - 11, P.goldHi); // golden tip / star
    outfit.fillRect(cx - 6, hy - 4, 12, 1, P.goldMid); // golden hat band

    // Midnight blue mystical robe
    outfit.fillRect(cx - 6, ty - 6, 12, 14, P.robeMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 12, P.robeHi);
    outfit.fillRect(cx + 3, ty - 6, 3, 14, P.robeShadow);

    // Golden star emblems
    outfit.setPixel(cx - 3, ty - 2, P.star);
    outfit.setPixel(cx + 2, ty + 3, P.star);

    // Belt
    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.belt);

    // Magical shoes
    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.boots);

  } else if (dir === 0) {
    outfit.fillRect(cx - 9, hy - 3, 18, 2, P.robeMid);
    outfit.fillRect(cx - 6, hy - 6, 12, 3, P.robeMid);
    outfit.fillRect(cx - 4, hy - 8, 8, 2, P.robeHi);
    outfit.fillRect(cx - 2, hy - 10, 4, 2, P.robeHi);
    outfit.setPixel(cx, hy - 11, P.goldHi);

    outfit.fillRect(cx - 6, ty - 6, 12, 14, P.robeMid);
    outfit.setPixel(cx - 1, ty - 1, P.star);

    outfit.fillRect(feet.lFootX, feet.lFootY - 3, 4, 4, P.boots);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.boots);

  } else if (dir === 1) {
    outfit.fillRect(cx - 7, hy - 3, 15, 2, P.robeMid);
    outfit.fillRect(cx - 5, hy - 6, 9, 3, P.robeMid);
    outfit.fillRect(cx - 4, hy - 8, 6, 2, P.robeHi);
    outfit.fillRect(cx - 3, hy - 10, 4, 2, P.robeHi);
    outfit.setPixel(cx - 2, hy - 11, P.goldHi);

    outfit.fillRect(cx - 4, ty - 6, 9, 14, P.robeMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.boots);

  } else if (dir === 3) {
    outfit.fillRect(cx - 8, hy - 3, 15, 2, P.robeMid);
    outfit.fillRect(cx - 4, hy - 6, 9, 3, P.robeMid);
    outfit.fillRect(cx - 2, hy - 8, 6, 2, P.robeHi);
    outfit.fillRect(cx - 1, hy - 10, 4, 2, P.robeHi);
    outfit.setPixel(cx + 2, hy - 11, P.goldHi);

    outfit.fillRect(cx - 5, ty - 6, 9, 14, P.robeMid);
    outfit.fillRect(feet.rFootX, feet.rFootY - 3, 4, 4, P.boots);
  }

  return outfit;
}

module.exports = { ROLES, createOutfitSheet };
