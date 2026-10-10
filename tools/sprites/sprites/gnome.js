// Distributed under the NetHack General Public License.
// Generator for Gnome monster sprite sheet (class: gnomes, wielding a gnomish pickaxe)

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');

function createGnomeSheet() {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderGnomeCell(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function renderGnomeCell(dir, frame) {
  const c = new Canvas(48, 48);
  const P = Palettes.gnome;

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
    if (dir === 1) xShift = -2;
    if (dir === 3) xShift = 2;
  } else if (frame === 3) {
    // Strike: slam down forward!
    yBob = (dir === 2) ? 2 : (dir === 0 ? -1 : 1);
    if (dir === 1) xShift = 4;
    if (dir === 3) xShift = -4;
  }

  const cx = 24 + xShift;
  const hy = 16 + yBob; // Gnome head center
  const ty = 28 + yBob; // Gnome stout torso center
  const by = 38 + yBob; // Boots level

  if (dir === 2) {
    // === FACING DOWN ===
    // Boots
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 43 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 40 : (frame === 3 ? 42 : 42));
    c.fillRect(cx - 7, lFootY - 4, 5, 5, P.leather);
    c.fillRect(cx + 2, rFootY - 4, 5, 5, P.leather);

    // Tunic (stout moss-green torso)
    c.fillRect(cx - 7, ty - 6, 14, 11, P.tunicMid);
    c.fillRect(cx + 3, ty - 6, 4, 11, P.tunicShadow);

    // Belt with buckle
    c.fillRect(cx - 7, ty + 1, 14, 2, P.leather);
    c.fillRect(cx - 1, ty + 1, 3, 2, P.gold);

    // Face & big round nose
    c.fillCircle(cx, hy, 6, P.skin);
    c.fillRect(cx - 2, hy, 4, 3, P.skinShadow); // big round nose

    // Eyes
    c.fillRect(cx - 4, hy - 2, 2, 2, OUTLINE);
    c.fillRect(cx + 2, hy - 2, 2, 2, OUTLINE);

    // Bushy silver/white beard
    const beardSway = (frame === 0) ? -1 : (frame === 1 ? 1 : 0);
    c.fillPolygon([
      { x: cx - 6 + beardSway, y: hy + 2 },
      { x: cx + 6 + beardSway, y: hy + 2 },
      { x: cx + 4 + beardSway, y: ty + 3 },
      { x: cx + beardSway, y: ty + 6 },
      { x: cx - 4 + beardSway, y: ty + 3 }
    ], P.beardHi);
    c.fillRect(cx + 1 + beardSway, hy + 2, 4, 7, P.beardShadow);

    // Pointy conical cap
    c.fillPolygon([
      { x: cx - 7, y: hy - 3 },
      { x: cx + 7, y: hy - 3 },
      { x: cx - 2 + beardSway, y: hy - 14 }
    ], P.capMid);
    c.fillRect(cx + 2, hy - 7, 3, 5, P.capShadow);
    c.fillRect(cx - 4 + beardSway, hy - 15, 3, 2, P.capMid);

    // Arms & Pickaxe
    if (frame === 2) {
      // Wind-up: pickaxe raised high overhead!
      const wx = cx - 4;
      const wy = hy - 13;
      c.fillRect(cx - 3, hy - 7, 6, 4, P.skin);
      c.drawLine(wx + 3, wy + 8, wx + 6, wy, P.leather);
      c.drawLine(wx + 2, wy - 2, wx + 11, wy + 2, P.weaponHead);
      c.fillRect(wx + 5, wy - 2, 3, 3, P.weaponHead);
    } else if (frame === 3) {
      // Strike: slam pickaxe down in front!
      const wx = cx - 10;
      const wy = ty + 2;
      c.fillRect(cx - 8, ty - 2, 5, 4, P.skin);
      c.drawLine(cx - 5, ty, wx + 3, wy + 5, P.leather);
      c.drawLine(wx, wy + 4, wx + 7, wy + 7, P.weaponHead);
      c.fillRect(wx + 2, wy + 4, 3, 3, P.weaponHead);
      // Impact sparks
      c.setPixel(wx - 2, wy + 5, P.beardHi);
      c.setPixel(wx - 1, wy + 3, P.gold);
      c.setPixel(wx - 1, wy + 7, P.gold);
    } else {
      // Walk A / B: pickaxe swings with stride
      const wx = cx - 9;
      const wy = (frame === 0) ? ty - 2 : ty + 3;
      c.fillRect(cx - 8, wy, 4, 4, P.skin);
      c.drawLine(wx + 2, wy - 3, wx + 2, wy + 7, P.leather);
      c.fillRect(wx, wy - 4, 5, 2, P.weaponHead);
    }

  } else if (dir === 0) {
    // === FACING UP ===
    const lFootY = (frame === 0) ? 43 : (frame === 1 ? 39 : (frame === 3 ? 42 : 42));
    const rFootY = (frame === 1) ? 42 : (frame === 0 ? 40 : (frame === 3 ? 43 : 42));
    c.fillRect(cx - 7, lFootY - 4, 5, 5, P.leather);
    c.fillRect(cx + 2, rFootY - 4, 5, 5, P.leather);

    // Tunic back
    c.fillRect(cx - 7, ty - 6, 14, 11, P.tunicMid);
    c.fillRect(cx + 3, ty - 6, 4, 11, P.tunicShadow);

    // Cap back
    const capSway = (frame === 0) ? -1 : (frame === 1 ? 1 : 0);
    c.fillPolygon([
      { x: cx - 7, y: hy - 3 },
      { x: cx + 7, y: hy - 3 },
      { x: cx - 2 + capSway, y: hy - 14 }
    ], P.capMid);
    c.fillRect(cx + 2, hy - 7, 3, 5, P.capShadow);

    // Pickaxe
    if (frame === 2) {
      // Wind-up: held high
      c.drawLine(cx + 4, ty - 4, cx + 8, ty - 14, P.leather);
      c.fillRect(cx + 5, ty - 15, 6, 3, P.weaponHead);
    } else if (frame === 3) {
      // Strike: slammed down
      c.drawLine(cx + 4, ty, cx + 10, ty + 8, P.leather);
      c.fillRect(cx + 8, ty + 7, 5, 3, P.weaponHead);
    } else {
      // Walk swing
      const pY = (frame === 0) ? ty - 4 : ty + 2;
      c.drawLine(cx + 6, pY, cx + 6, pY + 9, P.leather);
      c.fillRect(cx + 4, pY - 2, 5, 2, P.weaponHead);
    }

  } else if (dir === 1) {
    // === FACING RIGHT ===
    // Real steps!
    // Stride boots: Walk A: front foot forward (cx+4), back foot back (cx-5)
    // Walk B: front foot back (cx-2), back foot forward (cx+3)
    let b1X = cx - 4, b1Y = 42;
    let b2X = cx + 2, b2Y = 42;
    if (frame === 0) {
      b1X = cx - 5; b1Y = 41; // rear
      b2X = cx + 4; b2Y = 43; // front
    } else if (frame === 1) {
      b1X = cx - 2; b1Y = 42;
      b2X = cx + 1; b2Y = 40;
    } else if (frame === 3) {
      b1X = cx - 4; b1Y = 42;
      b2X = cx + 5; b2Y = 43;
    }

    c.fillRect(b1X, b1Y - 4, 5, 5, P.leather);
    c.fillRect(b2X, b2Y - 4, 5, 5, P.leather);

    // Tunic
    c.fillRect(cx - 5, ty - 6, 10, 11, P.tunicMid);
    c.fillRect(cx + 2, ty - 6, 3, 11, P.tunicShadow);

    // Belt
    c.fillRect(cx - 5, ty + 1, 10, 2, P.leather);

    // Beard profile
    const bSway = (frame === 0) ? 2 : (frame === 1 ? -1 : 0);
    c.fillPolygon([
      { x: cx, y: hy + 2 },
      { x: cx + 6 + bSway, y: hy + 4 },
      { x: cx + 4 + bSway, y: ty + 4 },
      { x: cx - 1, y: ty + 2 }
    ], P.beardHi);
    c.fillRect(cx + 2 + bSway, hy + 3, 3, 3, P.beardShadow);

    // Head profile & big round nose
    c.fillCircle(cx + 1, hy, 5, P.skin);
    c.fillRect(cx + 4, hy - 1, 3, 3, P.skinShadow); // big nose

    // Eye
    c.fillRect(cx + 2, hy - 2, 2, 2, OUTLINE);

    // Cap tilting back
    c.fillPolygon([
      { x: cx - 5, y: hy - 3 },
      { x: cx + 5, y: hy - 3 },
      { x: cx - 4 + bSway, y: hy - 14 }
    ], P.capMid);
    c.fillRect(cx - 2, hy - 7, 3, 5, P.capShadow);

    // Pickaxe
    if (frame === 2) {
      // Wind-up: pulled far back
      c.drawLine(cx - 4, hy - 2, cx - 12, hy - 10, P.leather);
      c.fillRect(cx - 14, hy - 12, 5, 3, P.weaponHead);
    } else if (frame === 3) {
      // Strike: slam right!
      c.drawLine(cx + 4, ty, cx + 14, ty + 4, P.leather);
      c.fillRect(cx + 13, ty + 2, 4, 5, P.weaponHead);
      c.setPixel(cx + 17, ty + 5, P.gold); // spark
    } else if (frame === 0) {
      // Walk A: pickaxe swung forward
      c.drawLine(cx + 2, ty - 2, cx + 10, ty + 4, P.leather);
      c.fillRect(cx + 9, ty + 3, 4, 3, P.weaponHead);
    } else {
      // Walk B: pickaxe swung back
      c.drawLine(cx - 2, ty - 2, cx - 6, ty + 5, P.leather);
      c.fillRect(cx - 8, ty + 4, 4, 3, P.weaponHead);
    }

  } else if (dir === 3) {
    // === FACING LEFT ===
    // Real steps!
    let b1X = cx + 1, b1Y = 42;
    let b2X = cx - 5, b2Y = 42;
    if (frame === 0) {
      b1X = cx + 2; b1Y = 41; // rear
      b2X = cx - 7; b2Y = 43; // front
    } else if (frame === 1) {
      b1X = cx - 1; b1Y = 42;
      b2X = cx - 4; b2Y = 40;
    } else if (frame === 3) {
      b1X = cx + 1; b1Y = 42;
      b2X = cx - 8; b2Y = 43;
    }

    c.fillRect(b1X, b1Y - 4, 5, 5, P.leather);
    c.fillRect(b2X, b2Y - 4, 5, 5, P.leather);

    // Tunic
    c.fillRect(cx - 5, ty - 6, 10, 11, P.tunicMid);
    c.fillRect(cx - 5, ty - 6, 3, 11, P.tunicShadow);

    // Belt
    c.fillRect(cx - 5, ty + 1, 10, 2, P.leather);

    // Beard profile billowing left
    const bSway = (frame === 0) ? -2 : (frame === 1 ? 1 : 0);
    c.fillPolygon([
      { x: cx, y: hy + 2 },
      { x: cx - 6 + bSway, y: hy + 4 },
      { x: cx - 4 + bSway, y: ty + 4 },
      { x: cx + 1, y: ty + 2 }
    ], P.beardHi);
    c.fillRect(cx - 5 + bSway, hy + 3, 3, 3, P.beardShadow);

    // Head profile & nose
    c.fillCircle(cx - 1, hy, 5, P.skin);
    c.fillRect(cx - 7, hy - 1, 3, 3, P.skinShadow);

    // Eye
    c.fillRect(cx - 4, hy - 2, 2, 2, OUTLINE);

    // Cap
    c.fillPolygon([
      { x: cx - 5, y: hy - 3 },
      { x: cx + 5, y: hy - 3 },
      { x: cx + 4 + bSway, y: hy - 14 }
    ], P.capMid);
    c.fillRect(cx - 1, hy - 7, 3, 5, P.capShadow);

    // Pickaxe
    if (frame === 2) {
      c.drawLine(cx + 4, hy - 2, cx + 12, hy - 10, P.leather);
      c.fillRect(cx + 10, hy - 12, 5, 3, P.weaponHead);
    } else if (frame === 3) {
      c.drawLine(cx - 4, ty, cx - 14, ty + 4, P.leather);
      c.fillRect(cx - 17, ty + 2, 4, 5, P.weaponHead);
      c.setPixel(cx - 18, ty + 5, P.gold);
    } else if (frame === 0) {
      // Walk A: swung forward (left)
      c.drawLine(cx - 2, ty - 2, cx - 10, ty + 4, P.leather);
      c.fillRect(cx - 13, ty + 3, 4, 3, P.weaponHead);
    } else {
      // Walk B: swung back (right)
      c.drawLine(cx + 2, ty - 2, cx + 6, ty + 5, P.leather);
      c.fillRect(cx + 5, ty + 4, 4, 3, P.weaponHead);
    }
  }

  return c;
}

module.exports = { createGnomeSheet };
