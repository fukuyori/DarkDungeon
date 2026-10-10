// Distributed under the NetHack General Public License.
// Generator for Hero Valkyrie layers:
// 1. body_human_female
// 2. hair_female
// 3. outfit_valkyrie
// 4. cape
// 5. weapon_longsword
// 6. shield_round

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');

function createHeroLayers() {
  const sheets = {
    body: new Canvas(192, 192),
    hair: new Canvas(192, 192),
    outfit: new Canvas(192, 192),
    cape: new Canvas(192, 192),
    weapon: new Canvas(192, 192),
    shield: new Canvas(192, 192),
  };

  // 4 rows = directions (0: Up, 1: Right, 2: Down, 3: Left)
  // 4 cols = frames (0: Walk A, 1: Walk B, 2: Wind-up, 3: Strike)
  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;

      const cellLayers = renderHeroCell(dir, frame);

      sheets.body.blit(cellLayers.body, cellX, cellY);
      sheets.hair.blit(cellLayers.hair, cellX, cellY);
      sheets.outfit.blit(cellLayers.outfit, cellX, cellY);
      sheets.cape.blit(cellLayers.cape, cellX, cellY);
      sheets.weapon.blit(cellLayers.weapon, cellX, cellY);
      sheets.shield.blit(cellLayers.shield, cellX, cellY);
    }
  }

  // Ensure consistent dark arcade outline on each layer sheet
  for (const key of Object.keys(sheets)) {
    sheets[key].addOutline(OUTLINE);
  }

  return sheets;
}

function renderHeroCell(dir, frame) {
  const body = new Canvas(48, 48);
  const hair = new Canvas(48, 48);
  const outfit = new Canvas(48, 48);
  const cape = new Canvas(48, 48);
  const weapon = new Canvas(48, 48);
  const shield = new Canvas(48, 48);

  // Animation kinematic parameters
  let yBob = 0;
  let xShift = 0;

  if (frame === 0) {
    // Walk A
    yBob = 0;
  } else if (frame === 1) {
    // Walk B: bob up 1px
    yBob = -1;
  } else if (frame === 2) {
    // Wind-up: crouch down 1px
    yBob = 1;
    if (dir === 1) xShift = -1;
    if (dir === 3) xShift = 1;
  } else if (frame === 3) {
    // Strike: lunge forward
    yBob = 1;
    if (dir === 1) xShift = 3;
    else if (dir === 3) xShift = -3;
    else if (dir === 2) yBob = 2; // lunge down towards viewer
    else if (dir === 0) yBob = -1; // lunge up away from viewer
  }

  // Base anchors
  const cx = 24 + xShift;
  const hy = 14 + yBob; // Head center Y
  const ty = 26 + yBob; // Torso center Y
  const py = 37 + yBob; // Pelvis/Legs top Y

  const P = Palettes;

  // -------------------------------------------------------------
  // 1. BODY LAYER (Skin, face, plain undergarment, limbs)
  // -------------------------------------------------------------
  if (dir === 2) {
    // === FACING DOWN ===
    // Real alternating legs and stride
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 43 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 42 : 42));

    // Left leg
    body.fillRect(cx - 6, py - 3, 4, lFootY - py + 4, P.skin.mid);
    body.fillRect(cx - 6, py - 3, 2, lFootY - py + 3, P.skin.highlight);
    body.fillRect(cx - 3, py + 2, 1, lFootY - py - 1, P.skin.shadow);

    // Right leg
    body.fillRect(cx + 2, py - 3, 4, rFootY - py + 4, P.skin.mid);
    body.fillRect(cx + 2, py - 3, 2, rFootY - py + 3, P.skin.highlight);
    body.fillRect(cx + 5, py + 2, 1, rFootY - py - 1, P.skin.shadow);

    // Torso / Undergarment
    body.fillRect(cx - 6, ty - 6, 12, 11, P.undergarment.mid);
    body.fillRect(cx - 6, ty - 6, 4, 10, P.undergarment.highlight);
    body.fillRect(cx + 3, ty - 6, 3, 11, P.undergarment.shadow);
    body.fillRect(cx - 5, ty + 2, 10, 2, P.undergarment.shadow);

    // Neck
    body.fillRect(cx - 3, hy + 6, 6, 4, P.skin.shadow);
    body.fillRect(cx - 2, hy + 6, 4, 3, P.skin.mid);

    // Head / Open Face (Defect 3 fix: fully visible)
    body.fillEllipse(cx, hy, 7, 7, P.skin.mid);
    body.fillRect(cx - 5, hy - 4, 6, 7, P.skin.highlight);
    body.fillRect(cx + 3, hy - 2, 3, 6, P.skin.shadow);
    body.fillRect(cx - 2, hy + 5, 4, 2, P.skin.shadow); // chin

    // Eyes: large, bold, clearly visible
    body.fillRect(cx - 4, hy + 1, 2, 2, OUTLINE);
    body.setPixel(cx - 4, hy, [255, 255, 255, 255]); // white glint
    body.fillRect(cx + 3, hy + 1, 2, 2, OUTLINE);
    body.setPixel(cx + 3, hy, [255, 255, 255, 255]);

    // Cheeks & nose
    body.setPixel(cx - 4, hy + 3, P.skin.highlight);
    body.setPixel(cx + 3, hy + 3, P.skin.highlight);
    body.setPixel(cx, hy + 3, P.skin.shadow);

    // Mouth
    if (frame === 3) {
      body.fillRect(cx - 1, hy + 5, 3, 2, [200, 40, 40, 255]);
    } else {
      body.fillRect(cx - 1, hy + 5, 3, 1, P.skin.deep);
    }

    // Bare Arms alternating
    // Left arm (holds weapon)
    if (frame === 2) {
      // Wind-up: arm pulled back & up
      body.fillRect(cx - 10, ty - 8, 4, 8, P.skin.mid);
      body.fillRect(cx - 11, ty - 10, 4, 4, P.skin.mid);
    } else if (frame === 3) {
      // Strike: arm thrusting down-forward
      body.fillRect(cx - 9, ty - 4, 5, 10, P.skin.mid);
      body.fillRect(cx - 7, ty + 4, 4, 4, P.skin.highlight);
    } else if (frame === 0) {
      // Walk A: arm forward
      body.fillRect(cx - 9, ty - 6, 3, 9, P.skin.mid);
      body.fillRect(cx - 9, ty + 2, 3, 3, P.skin.mid);
    } else {
      // Walk B: arm back
      body.fillRect(cx - 9, ty - 3, 3, 9, P.skin.mid);
      body.fillRect(cx - 9, ty + 5, 3, 3, P.skin.mid);
    }

    // Right arm (holds shield)
    if (frame === 2) {
      body.fillRect(cx + 6, ty - 4, 4, 8, P.skin.mid);
    } else if (frame === 3) {
      body.fillRect(cx + 6, ty - 2, 4, 8, P.skin.mid);
    } else if (frame === 0) {
      // Walk A: shield arm back
      body.fillRect(cx + 6, ty - 3, 3, 9, P.skin.mid);
    } else {
      // Walk B: shield arm forward
      body.fillRect(cx + 6, ty - 6, 3, 9, P.skin.mid);
    }

  } else if (dir === 0) {
    // === FACING UP ===
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 42 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 43 : 42));

    body.fillRect(cx - 6, py - 3, 4, lFootY - py + 4, P.skin.mid);
    body.fillRect(cx - 6, py - 3, 2, lFootY - py + 3, P.skin.highlight);
    body.fillRect(cx - 3, py + 2, 1, lFootY - py - 1, P.skin.shadow);

    body.fillRect(cx + 2, py - 3, 4, rFootY - py + 4, P.skin.mid);
    body.fillRect(cx + 2, py - 3, 2, rFootY - py + 3, P.skin.highlight);
    body.fillRect(cx + 5, py + 2, 1, rFootY - py - 1, P.skin.shadow);

    // Torso back
    body.fillRect(cx - 6, ty - 6, 12, 11, P.undergarment.mid);
    body.fillRect(cx - 6, ty - 6, 4, 10, P.undergarment.highlight);
    body.fillRect(cx + 2, ty - 6, 4, 11, P.undergarment.shadow);

    // Neck
    body.fillRect(cx - 3, hy + 6, 6, 4, P.skin.shadow);

    // Head back
    body.fillEllipse(cx, hy, 7, 7, P.skin.shadow);
    body.fillRect(cx - 5, hy - 4, 6, 7, P.skin.mid);

    // Arms alternating
    if (frame === 2) {
      body.fillRect(cx - 9, ty - 5, 3, 9, P.skin.mid);
      body.fillRect(cx + 6, ty - 8, 4, 8, P.skin.mid);
    } else if (frame === 3) {
      body.fillRect(cx - 9, ty - 5, 3, 9, P.skin.mid);
      body.fillRect(cx + 6, ty - 10, 4, 10, P.skin.mid);
    } else if (frame === 0) {
      // Walk A: left arm back, right arm forward
      body.fillRect(cx - 9, ty - 3, 3, 9, P.skin.mid);
      body.fillRect(cx + 6, ty - 6, 3, 9, P.skin.mid);
    } else {
      // Walk B: left arm forward, right arm back
      body.fillRect(cx - 9, ty - 6, 3, 9, P.skin.mid);
      body.fillRect(cx + 6, ty - 3, 3, 9, P.skin.mid);
    }

  } else if (dir === 1) {
    // === FACING RIGHT ===
    let lLegX = cx - 2, lFootY = 42;
    let rLegX = cx + 2, rFootY = 42;
    if (frame === 0) {
      // Walk A
      lLegX = cx - 4; lFootY = 40;
      rLegX = cx + 3; rFootY = 43;
    } else if (frame === 1) {
      // Walk B
      lLegX = cx + 1; lFootY = 42;
      rLegX = cx - 2; rFootY = 40;
    } else if (frame === 3) {
      lLegX = cx - 3; lFootY = 41;
      rLegX = cx + 5; rFootY = 43;
    }

    body.fillRect(lLegX - 2, py - 3, 4, lFootY - py + 4, P.skin.shadow);
    body.fillRect(rLegX - 2, py - 3, 4, rFootY - py + 4, P.skin.mid);
    body.fillRect(rLegX - 2, py - 3, 2, rFootY - py + 3, P.skin.highlight);

    body.fillRect(cx - 4, ty - 6, 9, 11, P.undergarment.mid);
    body.fillRect(cx - 4, ty - 6, 3, 10, P.undergarment.highlight);
    body.fillRect(cx + 2, ty - 6, 3, 11, P.undergarment.shadow);

    body.fillRect(cx - 1, hy + 6, 4, 4, P.skin.mid);

    body.fillEllipse(cx, hy, 6, 7, P.skin.mid);
    body.fillRect(cx - 4, hy - 4, 5, 7, P.skin.highlight);
    body.fillRect(cx + 4, hy + 1, 3, 3, P.skin.mid);
    body.setPixel(cx + 6, hy + 2, P.skin.highlight);

    body.setPixel(cx + 3, hy + 1, OUTLINE);
    body.setPixel(cx + 3, hy, [255, 255, 255, 255]);

    // Arms
    if (frame === 2) {
      body.fillRect(cx - 7, ty - 4, 4, 7, P.skin.shadow);
      body.fillRect(cx - 8, ty - 6, 3, 3, P.skin.mid);
    } else if (frame === 3) {
      body.fillRect(cx + 2, ty - 4, 8, 4, P.skin.mid);
      body.fillRect(cx + 9, ty - 5, 3, 4, P.skin.highlight);
    } else if (frame === 0) {
      body.fillRect(cx + 1, ty - 4, 4, 8, P.skin.mid);
      body.fillRect(cx + 3, ty + 2, 3, 3, P.skin.mid);
    } else {
      body.fillRect(cx - 3, ty - 4, 4, 8, P.skin.mid);
      body.fillRect(cx - 1, ty + 3, 3, 3, P.skin.mid);
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

    body.fillRect(lLegX - 2, py - 3, 4, lFootY - py + 4, P.skin.shadow);
    body.fillRect(rLegX - 2, py - 3, 4, rFootY - py + 4, P.skin.mid);
    body.fillRect(rLegX - 2, py - 3, 2, rFootY - py + 3, P.skin.highlight);

    body.fillRect(cx - 5, ty - 6, 9, 11, P.undergarment.mid);
    body.fillRect(cx - 5, ty - 6, 3, 10, P.undergarment.highlight);
    body.fillRect(cx + 1, ty - 6, 3, 11, P.undergarment.shadow);

    body.fillRect(cx - 3, hy + 6, 4, 4, P.skin.mid);

    body.fillEllipse(cx, hy, 6, 7, P.skin.mid);
    body.fillRect(cx - 5, hy - 4, 5, 7, P.skin.highlight);
    body.fillRect(cx - 7, hy + 1, 3, 3, P.skin.mid);
    body.setPixel(cx - 7, hy + 2, P.skin.highlight);

    body.setPixel(cx - 4, hy + 1, OUTLINE);
    body.setPixel(cx - 4, hy, [255, 255, 255, 255]);

    // Arms
    if (frame === 2) {
      body.fillRect(cx + 3, ty - 4, 4, 7, P.skin.shadow);
      body.fillRect(cx + 5, ty - 6, 3, 3, P.skin.mid);
    } else if (frame === 3) {
      body.fillRect(cx - 10, ty - 4, 8, 4, P.skin.mid);
      body.fillRect(cx - 12, ty - 5, 3, 4, P.skin.highlight);
    } else if (frame === 0) {
      body.fillRect(cx - 5, ty - 4, 4, 8, P.skin.mid);
      body.fillRect(cx - 6, ty + 2, 3, 3, P.skin.mid);
    } else {
      body.fillRect(cx - 1, ty - 4, 4, 8, P.skin.mid);
      body.fillRect(cx - 2, ty + 3, 3, 3, P.skin.mid);
    }
  }

  // -------------------------------------------------------------
  // 2. HAIR LAYER (Golden blonde flowing hair)
  // -------------------------------------------------------------
  if (dir === 2) {
    // Facing Down: Bangs stay above hy - 2! Sides frame cheeks outside cx - 5 .. cx + 4
    hair.fillEllipse(cx, hy - 4, 7, 5, P.hair.mid);
    hair.fillRect(cx - 6, hy - 7, 6, 5, P.hair.highlight);
    hair.fillRect(cx + 2, hy - 7, 5, 5, P.hair.shadow);

    // Short bangs above brow (ends at hy - 3)
    hair.fillRect(cx - 5, hy - 4, 10, 2, P.hair.mid);
    hair.fillRect(cx - 5, hy - 4, 5, 1, P.hair.highlight);

    // Left locks tumbling down
    const hSway = (frame === 0) ? -1 : (frame === 1 ? 1 : 0);
    hair.fillRect(cx - 8 + hSway, hy - 2, 3, 14, P.hair.mid);
    hair.fillRect(cx - 8 + hSway, hy - 2, 2, 12, P.hair.highlight);

    // Right locks tumbling down
    hair.fillRect(cx + 6 + hSway, hy - 2, 3, 14, P.hair.shadow);
    hair.fillRect(cx + 6 + hSway, hy - 2, 2, 12, P.hair.mid);

  } else if (dir === 0) {
    // Facing Up: full flowing mane down back
    hair.fillEllipse(cx, hy - 1, 8, 8, P.hair.mid);
    hair.fillRect(cx - 7, hy - 6, 6, 8, P.hair.highlight);
    hair.fillRect(cx + 2, hy - 5, 6, 8, P.hair.shadow);

    const hSway = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
    hair.fillRect(cx - 7 + hSway, hy + 2, 14, 12, P.hair.mid);
    hair.fillRect(cx - 7 + hSway, hy + 2, 5, 10, P.hair.highlight);
    hair.fillRect(cx + 3 + hSway, hy + 2, 4, 12, P.hair.shadow);

  } else if (dir === 1) {
    // Facing Right
    hair.fillEllipse(cx - 1, hy - 2, 6, 6, P.hair.mid);
    hair.fillRect(cx - 5, hy - 6, 5, 5, P.hair.highlight);

    const hSway = (frame === 0) ? -1 : (frame === 1 ? 1 : (frame === 3 ? -3 : 0));
    hair.fillRect(cx - 9 + hSway, hy - 2, 6, 14, P.hair.mid);
    hair.fillRect(cx - 8 + hSway, hy - 1, 3, 10, P.hair.highlight);
    hair.fillRect(cx - 5 + hSway, hy + 4, 3, 8, P.hair.shadow);

  } else if (dir === 3) {
    // Facing Left
    hair.fillEllipse(cx + 1, hy - 2, 6, 6, P.hair.mid);
    hair.fillRect(cx - 1, hy - 6, 5, 5, P.hair.highlight);

    const hSway = (frame === 0) ? 1 : (frame === 1 ? -1 : (frame === 3 ? 3 : 0));
    hair.fillRect(cx + 3 + hSway, hy - 2, 6, 14, P.hair.mid);
    hair.fillRect(cx + 4 + hSway, hy - 1, 3, 10, P.hair.shadow);
  }

  // -------------------------------------------------------------
  // 3. OUTFIT LAYER (Valkyrie: Horned Helmet, Chainmail, Greaves)
  // -------------------------------------------------------------
  if (dir === 2) {
    // Facing Down: Helmet crown + outward curved horns (Defect 3 fix: no nose guard)
    // Steel skullcap
    outfit.fillEllipse(cx, hy - 5, 7, 4, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 5, hy - 8, 5, 4, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx + 1, hy - 8, 4, 4, P.valkyrieArmor.steelShadow);

    // Brow band with brass trim
    outfit.fillRect(cx - 6, hy - 3, 12, 2, P.valkyrieArmor.brassMid);
    outfit.fillRect(cx - 6, hy - 3, 4, 1, P.valkyrieArmor.brassHi);
    outfit.fillRect(cx + 2, hy - 3, 4, 1, P.valkyrieArmor.brassShadow);

    // Ivory horns curving outward
    outfit.fillRect(cx - 9, hy - 5, 3, 3, P.valkyrieArmor.hornMid);
    outfit.fillRect(cx - 12, hy - 8, 3, 3, P.valkyrieArmor.hornHi);
    outfit.fillRect(cx - 13, hy - 11, 2, 4, P.valkyrieArmor.hornHi);
    outfit.setPixel(cx - 13, hy - 12, P.valkyrieArmor.hornHi);

    outfit.fillRect(cx + 7, hy - 5, 3, 3, P.valkyrieArmor.hornShadow);
    outfit.fillRect(cx + 10, hy - 8, 3, 3, P.valkyrieArmor.hornMid);
    outfit.fillRect(cx + 12, hy - 11, 2, 4, P.valkyrieArmor.hornMid);
    outfit.setPixel(cx + 13, hy - 12, P.valkyrieArmor.hornMid);

    // Pauldrons
    outfit.fillRect(cx - 9, ty - 7, 4, 4, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 9, ty - 7, 2, 3, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx + 5, ty - 7, 4, 4, P.valkyrieArmor.steelShadow);

    // Chainmail hauberk
    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 8, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx + 2, ty - 6, 4, 10, P.valkyrieArmor.steelShadow);

    // Belt with ruby
    outfit.fillRect(cx - 6, ty + 1, 12, 2, P.valkyrieArmor.brassMid);
    outfit.setPixel(cx - 1, ty + 1, P.valkyrieArmor.ruby);
    outfit.setPixel(cx, ty + 1, P.valkyrieArmor.ruby);

    // Greaves
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 43 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 42 : 42));
    outfit.fillRect(cx - 6, lFootY - 4, 4, 5, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 6, lFootY - 4, 2, 4, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx + 2, rFootY - 4, 4, 5, P.valkyrieArmor.steelShadow);
    outfit.fillRect(cx + 2, rFootY - 4, 2, 4, P.valkyrieArmor.steelMid);

  } else if (dir === 0) {
    // Facing Up
    outfit.fillEllipse(cx, hy - 5, 7, 4, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 5, hy - 8, 5, 4, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx + 1, hy - 8, 4, 4, P.valkyrieArmor.steelShadow);

    outfit.fillRect(cx - 9, hy - 5, 3, 3, P.valkyrieArmor.hornMid);
    outfit.fillRect(cx - 12, hy - 8, 3, 3, P.valkyrieArmor.hornHi);
    outfit.fillRect(cx - 13, hy - 11, 2, 4, P.valkyrieArmor.hornHi);
    outfit.setPixel(cx - 13, hy - 12, P.valkyrieArmor.hornHi);

    outfit.fillRect(cx + 7, hy - 5, 3, 3, P.valkyrieArmor.hornShadow);
    outfit.fillRect(cx + 10, hy - 8, 3, 3, P.valkyrieArmor.hornMid);
    outfit.fillRect(cx + 12, hy - 11, 2, 4, P.valkyrieArmor.hornMid);
    outfit.setPixel(cx + 13, hy - 12, P.valkyrieArmor.hornMid);

    outfit.fillRect(cx - 9, ty - 7, 4, 4, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx + 5, ty - 7, 4, 4, P.valkyrieArmor.steelShadow);

    outfit.fillRect(cx - 6, ty - 6, 12, 10, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 6, ty - 6, 4, 8, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx + 2, ty - 6, 4, 10, P.valkyrieArmor.steelShadow);

    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 42 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 39 : (frame === 3 ? 43 : 42));
    outfit.fillRect(cx - 6, lFootY - 4, 4, 5, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx + 2, rFootY - 4, 4, 5, P.valkyrieArmor.steelShadow);

  } else if (dir === 1) {
    // Facing Right
    outfit.fillEllipse(cx, hy - 5, 6, 4, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 4, hy - 8, 4, 4, P.valkyrieArmor.steelHi);

    outfit.fillRect(cx - 2, hy - 7, 3, 3, P.valkyrieArmor.hornMid);
    outfit.fillRect(cx - 4, hy - 10, 3, 3, P.valkyrieArmor.hornHi);
    outfit.setPixel(cx - 4, hy - 11, P.valkyrieArmor.hornHi);

    outfit.fillRect(cx + 2, hy - 6, 3, 3, P.valkyrieArmor.hornMid);
    outfit.fillRect(cx + 4, hy - 9, 3, 3, P.valkyrieArmor.hornHi);
    outfit.setPixel(cx + 5, hy - 11, P.valkyrieArmor.hornHi);

    outfit.fillRect(cx - 4, ty - 6, 9, 10, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 4, ty - 6, 3, 8, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx - 3, ty - 7, 5, 4, P.valkyrieArmor.steelHi);

    let rLegX = cx + 2, rFootY = 42;
    if (frame === 0) { rLegX = cx + 3; rFootY = 43; }
    else if (frame === 1) { rLegX = cx - 2; rFootY = 40; }
    else if (frame === 3) { rLegX = cx + 5; rFootY = 43; }
    outfit.fillRect(rLegX - 2, rFootY - 4, 4, 5, P.valkyrieArmor.steelMid);

  } else if (dir === 3) {
    // Facing Left
    outfit.fillEllipse(cx, hy - 5, 6, 4, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 1, hy - 8, 4, 4, P.valkyrieArmor.steelHi);

    outfit.fillRect(cx - 5, hy - 6, 3, 3, P.valkyrieArmor.hornMid);
    outfit.fillRect(cx - 7, hy - 9, 3, 3, P.valkyrieArmor.hornHi);
    outfit.setPixel(cx - 8, hy - 11, P.valkyrieArmor.hornHi);

    outfit.fillRect(cx - 5, ty - 6, 9, 10, P.valkyrieArmor.steelMid);
    outfit.fillRect(cx - 5, ty - 6, 3, 8, P.valkyrieArmor.steelHi);
    outfit.fillRect(cx - 2, ty - 7, 5, 4, P.valkyrieArmor.steelHi);

    let rLegX = cx - 2, rFootY = 42;
    if (frame === 0) { rLegX = cx - 3; rFootY = 43; }
    else if (frame === 1) { rLegX = cx + 2; rFootY = 40; }
    else if (frame === 3) { rLegX = cx - 5; rFootY = 43; }
    outfit.fillRect(rLegX - 2, rFootY - 4, 4, 5, P.valkyrieArmor.steelMid);
  }

  // -------------------------------------------------------------
  // 4. CAPE LAYER (Pure neutral grays with dark outline for #808080 floor)
  // -------------------------------------------------------------
  const G = P.capeGray;

  if (dir === 2) {
    // Facing Down: clasps & billowing side folds with dark outline
    cape.fillRect(cx - 8, ty - 6, 3, 2, G.hi);
    cape.fillRect(cx + 5, ty - 6, 3, 2, G.mid);

    // Side folds swing with walking stride
    let lW = (frame === 0) ? 4 : 2;
    let rW = (frame === 1) ? 4 : 2;
    let cLen = 14;

    if (frame === 2) {
      // Wind-up: pulled in tight
      cape.fillRect(cx - 8, ty - 3, 2, 14, G.mid);
      cape.fillRect(cx + 6, ty - 3, 2, 14, G.shadow);
    } else if (frame === 3) {
      // Strike: flares outward!
      cape.fillRect(cx - 12, ty - 4, 4, 11, G.mid);
      cape.fillRect(cx - 12, ty - 4, 1, 9, G.hi);
      cape.fillRect(cx - 9, ty - 4, 1, 11, OUTLINE);

      cape.fillRect(cx + 8, ty - 4, 4, 11, G.shadow);
      cape.fillRect(cx + 8, ty - 4, 1, 11, OUTLINE);
      cape.fillRect(cx + 11, ty - 4, 1, 11, G.deep);
    } else {
      cape.fillRect(cx - 11, ty - 4, lW, cLen, G.mid);
      cape.fillRect(cx - 11, ty - 4, 1, cLen - 2, G.hi);
      cape.fillRect(cx - 11 + lW - 1, ty - 4, 1, cLen, OUTLINE);

      cape.fillRect(cx + 7, ty - 4, rW, cLen, G.shadow);
      cape.fillRect(cx + 7, ty - 4, 1, cLen, OUTLINE);
      cape.fillRect(cx + 7 + rW - 1, ty - 4, 1, cLen, G.deep);
    }

  } else if (dir === 0) {
    // Facing Up: Full cape covering back down to calves
    const capeFlutterX = (frame === 0) ? -3 : (frame === 1 ? 3 : (frame === 3 ? -2 : 0));
    const capeBottom = (frame === 3) ? 36 : 39;

    cape.fillPolygon([
      { x: cx - 8, y: ty - 6 },
      { x: cx + 8, y: ty - 6 },
      { x: cx + 11 + capeFlutterX, y: capeBottom },
      { x: cx - 11 + capeFlutterX, y: capeBottom }
    ], G.mid);

    cape.fillRect(cx - 8, ty - 5, 4, capeBottom - ty, G.hi);
    cape.fillRect(cx + 3, ty - 5, 5, capeBottom - ty + 1, G.shadow);
    cape.fillRect(cx + 7, ty - 3, 3, capeBottom - ty - 1, G.deep);

    cape.drawLine(cx - 2, ty - 4, cx - 4 + capeFlutterX, capeBottom, OUTLINE);
    cape.drawLine(cx + 2, ty - 4, cx + 1 + capeFlutterX, capeBottom, OUTLINE);

  } else if (dir === 1) {
    // Facing Right: billowing left
    const flutter = (frame === 0) ? -2 : (frame === 1 ? 2 : (frame === 3 ? -4 : 0));
    cape.fillPolygon([
      { x: cx - 4, y: ty - 6 },
      { x: cx - 1, y: ty - 6 },
      { x: cx - 3 + flutter, y: 38 },
      { x: cx - 11 + flutter, y: 38 }
    ], G.mid);
    cape.fillRect(cx - 9 + flutter, ty - 2, 3, 36 - ty, G.hi);
    cape.fillRect(cx - 5 + flutter, ty, 3, 38 - ty, G.shadow);

  } else if (dir === 3) {
    // Facing Left: billowing right
    const flutter = (frame === 0) ? 2 : (frame === 1 ? -2 : (frame === 3 ? 4 : 0));
    cape.fillPolygon([
      { x: cx + 1, y: ty - 6 },
      { x: cx + 4, y: ty - 6 },
      { x: cx + 11 + flutter, y: 38 },
      { x: cx + 3 + flutter, y: 38 }
    ], G.mid);
    cape.fillRect(cx + 3 + flutter, ty - 2, 3, 36 - ty, G.hi);
    cape.fillRect(cx + 6 + flutter, ty, 4, 38 - ty, G.shadow);
  }

  // -------------------------------------------------------------
  // 5. WEAPON LAYER (Longsword swinging across all directions)
  // -------------------------------------------------------------
  const W = Palettes.weapon;

  if (dir === 2) {
    // Facing Down
    if (frame === 0) {
      // Walk A: sword held forward/up at hip
      const hx = cx - 9;
      const hyW = ty + 1;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.setPixel(hx - 1, hyW - 1, W.goldHi);
      weapon.drawLine(hx - 3, hyW + 1, hx + 1, hyW - 1, W.goldMid);
      weapon.drawLine(hx - 1, hyW + 2, hx - 5, hyW + 13, W.bladeMid);
      weapon.drawLine(hx - 2, hyW + 2, hx - 6, hyW + 13, W.bladeHi);
      weapon.setPixel(hx - 6, hyW + 14, W.bladeWhite);
    } else if (frame === 1) {
      // Walk B: sword swung back/down
      const hx = cx - 9;
      const hyW = ty + 3;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 3, hyW + 1, hx + 1, hyW - 1, W.goldMid);
      weapon.drawLine(hx - 1, hyW + 2, hx - 2, hyW + 12, W.bladeMid);
      weapon.drawLine(hx - 2, hyW + 2, hx - 3, hyW + 12, W.bladeHi);
      weapon.setPixel(hx - 3, hyW + 13, W.bladeWhite);
    } else if (frame === 2) {
      // Wind-up: sword held high over shoulder
      const hx = cx - 11;
      const hyW = ty - 10;
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW - 1, hx + 2, hyW + 1, W.goldMid);
      weapon.drawLine(hx - 1, hyW - 2, hx - 6, hyW - 13, W.bladeHi);
      weapon.drawLine(hx, hyW - 2, hx - 5, hyW - 13, W.bladeWhite);
      weapon.setPixel(hx - 6, hyW - 14, W.bladeWhite);
    } else if (frame === 3) {
      // Strike: dramatic diagonal slash down across body with slash arc!
      const hx = cx - 6;
      const hyW = ty + 5;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW, hx, hyW - 2, W.goldMid);
      weapon.drawLine(hx + 1, hyW + 1, hx + 15, hyW + 7, W.bladeWhite);
      weapon.drawLine(hx + 1, hyW, hx + 14, hyW + 6, W.bladeHi);
      weapon.setPixel(hx + 16, hyW + 7, W.bladeWhite);
      // Arc of slash
      weapon.drawLine(hx - 8, hyW - 12, hx + 12, hyW - 2, W.slashGlow);
      weapon.drawLine(hx - 4, hyW - 6, hx + 17, hyW + 6, W.bladeWhite);
      weapon.drawLine(hx + 8, hyW + 3, hx + 18, hyW + 8, W.slashGlow);
    }

  } else if (dir === 0) {
    // Facing Up
    if (frame === 0) {
      // Walk A: sword held high
      const hx = cx + 8;
      const hyW = ty - 1;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW - 2, hx + 4, hyW - 13, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 2, hx + 5, hyW - 13, W.bladeWhite);
    } else if (frame === 1) {
      // Walk B: sword held lower
      const hx = cx + 8;
      const hyW = ty + 4;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW - 2, hx + 3, hyW - 12, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 2, hx + 4, hyW - 12, W.bladeWhite);
    } else if (frame === 2) {
      // Wind-up: sword held back low
      const hx = cx + 8;
      const hyW = ty - 4;
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW + 2, hx + 4, hyW + 12, W.bladeMid);
    } else if (frame === 3) {
      // Strike: sword thrust high upward!
      const hx = cx + 7;
      const hyW = ty - 10;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx, hyW - 2, hx, hyW - 16, W.bladeWhite);
      weapon.drawLine(hx - 1, hyW - 2, hx - 1, hyW - 15, W.bladeHi);
      weapon.setPixel(hx, hyW - 17, W.bladeWhite);
      weapon.drawLine(hx - 4, hyW - 14, hx + 4, hyW - 14, W.slashGlow);
    }

  } else if (dir === 1) {
    // Facing Right
    if (frame === 0) {
      // Walk A: thrust forward
      const hx = cx + 4;
      const hyW = ty + 1;
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx + 2, hyW, hx + 14, hyW + 4, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 1, hx + 13, hyW + 3, W.bladeWhite);
    } else if (frame === 1) {
      // Walk B: pulled back
      const hx = cx - 1;
      const hyW = ty + 4;
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx + 2, hyW, hx + 11, hyW + 3, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 1, hx + 10, hyW + 2, W.bladeWhite);
    } else if (frame === 2) {
      // Wind-up: sword pulled far back
      const hx = cx - 8;
      const hyW = ty - 6;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW - 2, hx - 12, hyW - 8, W.bladeHi);
      weapon.drawLine(hx - 2, hyW - 1, hx - 11, hyW - 7, W.bladeWhite);
    } else if (frame === 3) {
      // Strike: thrust full extension right!
      const hx = cx + 11;
      const hyW = ty - 4;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW, hx + 16, hyW, W.bladeWhite);
      weapon.drawLine(hx + 1, hyW - 1, hx + 15, hyW - 1, W.bladeHi);
      weapon.setPixel(hx + 17, hyW, W.bladeWhite);
      weapon.drawLine(hx + 12, hyW - 6, hx + 18, hyW, W.slashGlow);
    }

  } else if (dir === 3) {
    // Facing Left
    if (frame === 0) {
      // Walk A: thrust forward
      const hx = cx - 6;
      const hyW = ty + 1;
      weapon.fillRect(hx - 2, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW, hx - 14, hyW + 4, W.bladeHi);
      weapon.drawLine(hx - 2, hyW - 1, hx - 13, hyW + 3, W.bladeWhite);
    } else if (frame === 1) {
      // Walk B: pulled back
      const hx = cx + 1;
      const hyW = ty + 4;
      weapon.fillRect(hx - 2, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW, hx - 11, hyW + 3, W.bladeHi);
      weapon.drawLine(hx - 2, hyW - 1, hx - 10, hyW + 2, W.bladeWhite);
    } else if (frame === 2) {
      // Wind-up: pulled far back right
      const hx = cx + 6;
      const hyW = ty - 6;
      weapon.fillRect(hx, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 2, hyW - 2, hx + 12, hyW - 8, W.bladeHi);
    } else if (frame === 3) {
      // Strike: thrust full extension left!
      const hx = cx - 11;
      const hyW = ty - 4;
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 1, hyW, hx - 16, hyW, W.bladeWhite);
      weapon.drawLine(hx - 1, hyW - 1, hx - 15, hyW - 1, W.bladeHi);
      weapon.setPixel(hx - 17, hyW, W.bladeWhite);
      weapon.drawLine(hx - 12, hyW - 6, hx - 18, hyW, W.slashGlow);
    }
  }

  // -------------------------------------------------------------
  // 6. SHIELD LAYER (Round shield on off-hand arm)
  // -------------------------------------------------------------
  const S = Palettes.shield;

  if (dir === 2) {
    // Facing Down: off-hand arm
    let sx = cx + 9, sy = ty - 2;
    if (frame === 0) {
      sx = cx + 9; sy = ty - 2; // Walk A
    } else if (frame === 1) {
      sx = cx + 8; sy = ty + 3; // Walk B
    } else if (frame === 2) {
      sx = cx + 4; sy = ty - 5; // Wind-up: guard high across chest
    } else if (frame === 3) {
      sx = cx + 9; sy = ty + 1; // Strike
    }

    const r = 6;
    shield.fillCircle(sx, sy, r, S.rimMid);
    shield.fillCircle(sx, sy, r - 1, S.faceMid);
    shield.fillRect(sx - r + 1, sy - r + 2, 3, 3, S.rimHi);
    shield.fillRect(sx - 3, sy - 3, 3, 3, S.faceHi);
    shield.fillRect(sx + 2, sy + 2, 3, 3, S.faceShadow);

    shield.fillCircle(sx, sy, 2, S.bossMid);
    shield.setPixel(sx - 1, sy - 1, S.bossHi);
    shield.setPixel(sx, sy, S.bossHi);

  } else if (dir === 0) {
    // Facing Up: off-hand arm (back of shield)
    let sx = cx - 9, sy = ty - 2;
    if (frame === 0) {
      sx = cx - 9; sy = ty - 2;
    } else if (frame === 1) {
      sx = cx - 8; sy = ty + 3;
    } else if (frame === 2) {
      sx = cx - 4; sy = ty - 5; // Wind-up: raised high
    } else if (frame === 3) {
      sx = cx - 9; sy = ty + 1;
    }

    shield.fillCircle(sx, sy, 5, S.rimShadow);
    shield.fillCircle(sx, sy, 4, S.strap);
    shield.drawLine(sx - 2, sy - 3, sx + 2, sy + 3, [60, 36, 16, 255]);

  } else if (dir === 1) {
    // Facing Right: side profile of shield
    let sx = cx - 4, sy = ty;
    if (frame === 0) {
      sx = cx - 3; sy = ty - 2;
    } else if (frame === 1) {
      sx = cx - 5; sy = ty + 2;
    } else if (frame === 2) {
      sx = cx - 5; sy = ty - 3;
    } else if (frame === 3) {
      sx = cx - 2; sy = ty;
    }

    shield.fillEllipse(sx, sy, 3, 7, S.rimMid);
    shield.fillRect(sx - 1, sy - 4, 2, 3, S.rimHi);
    shield.fillRect(sx, sy - 1, 2, 3, S.bossMid);

  } else if (dir === 3) {
    // Facing Left: full round shield proudly forward
    let sx = cx - 7, sy = ty - 2;
    if (frame === 0) {
      sx = cx - 8; sy = ty - 3;
    } else if (frame === 1) {
      sx = cx - 6; sy = ty + 2;
    } else if (frame === 2) {
      sx = cx - 8; sy = ty - 4;
    } else if (frame === 3) {
      sx = cx - 7; sy = ty;
    }

    const r = 6;
    shield.fillCircle(sx, sy, r, S.rimMid);
    shield.fillCircle(sx, sy, r - 1, S.faceMid);
    shield.fillRect(sx - r + 1, sy - r + 2, 3, 3, S.rimHi);
    shield.fillRect(sx - 3, sy - 3, 3, 3, S.faceHi);
    shield.fillRect(sx + 2, sy + 2, 3, 3, S.faceShadow);

    shield.fillCircle(sx, sy, 2, S.bossMid);
    shield.setPixel(sx - 1, sy - 1, S.bossHi);
  }

  return { body, hair, outfit, cape, weapon, shield };
}

module.exports = { createHeroLayers };
