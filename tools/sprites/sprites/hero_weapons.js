// Distributed under the NetHack General Public License.
// Generator for Hero Weapon layers (13 roles)
// Each weapon clearly swings across walk frames, winds up, and strikes with >= 60 px diff per row.

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');
const { getHeroKinematics } = require('./hero_hair');

function createWeaponSheet(role) {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = renderWeaponCell(role, dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function getWeaponHandAnchor(dir, frame, cx, ty) {
  if (dir === 2) {
    if (frame === 0) return { hx: cx - 9, hyW: ty + 1 };
    if (frame === 1) return { hx: cx - 9, hyW: ty + 3 };
    if (frame === 2) return { hx: cx - 11, hyW: ty - 10 };
    return { hx: cx - 6, hyW: ty + 4 };
  } else if (dir === 0) {
    if (frame === 0) return { hx: cx + 8, hyW: ty - 1 };
    if (frame === 1) return { hx: cx + 8, hyW: ty + 4 };
    if (frame === 2) return { hx: cx + 8, hyW: ty - 4 };
    return { hx: cx + 7, hyW: ty - 8 };
  } else if (dir === 1) {
    if (frame === 0) return { hx: cx + 4, hyW: ty + 1 };
    if (frame === 1) return { hx: cx - 1, hyW: ty + 4 };
    if (frame === 2) return { hx: cx - 8, hyW: ty - 6 };
    return { hx: cx + 11, hyW: ty - 3 };
  } else {
    if (frame === 0) return { hx: cx - 6, hyW: ty + 1 };
    if (frame === 1) return { hx: cx + 1, hyW: ty + 4 };
    if (frame === 2) return { hx: cx + 6, hyW: ty - 6 };
    return { hx: cx - 11, hyW: ty - 3 };
  }
}

function renderWeaponCell(role, dir, frame) {
  const { cx, yBob } = getHeroKinematics(dir, frame);
  const ty = 26 + yBob;
  const { hx, hyW } = getWeaponHandAnchor(dir, frame, cx, ty);

  if (role === 'valkyrie' || role === 'knight') {
    return renderLongsword(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'barbarian') {
    return renderGreatsword(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'archeologist') {
    return renderPickaxe(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'caveman') {
    return renderClub(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'healer') {
    return renderScalpel(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'monk') {
    return renderMonkFists(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'priest') {
    return renderMace(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'ranger') {
    return renderBow(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'rogue') {
    return renderShortsword(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'samurai') {
    return renderKatana(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'tourist') {
    return renderDarts(dir, frame, cx, ty, hx, hyW);
  } else if (role === 'wizard') {
    return renderQuarterstaff(dir, frame, cx, ty, hx, hyW);
  }

  return new Canvas(48, 48);
}

// 1. Longsword (Valkyrie approved pilot & Knight)
function renderLongsword(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.setPixel(hx - 1, hyW - 1, W.goldHi);
      weapon.drawLine(hx - 3, hyW + 1, hx + 1, hyW - 1, W.goldMid);
      weapon.drawLine(hx - 1, hyW + 2, hx - 5, hyW + 13, W.bladeMid);
      weapon.drawLine(hx - 2, hyW + 2, hx - 6, hyW + 13, W.bladeHi);
      weapon.setPixel(hx - 6, hyW + 13, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 3, hyW + 1, hx + 1, hyW - 1, W.goldMid);
      weapon.drawLine(hx - 1, hyW + 2, hx - 2, hyW + 11, W.bladeMid);
      weapon.drawLine(hx - 2, hyW + 2, hx - 3, hyW + 11, W.bladeHi);
      weapon.setPixel(hx - 3, hyW + 11, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW - 1, hx + 2, hyW + 1, W.goldMid);
      weapon.drawLine(hx - 1, hyW - 2, hx - 6, hyW - 13, W.bladeHi);
      weapon.drawLine(hx, hyW - 2, hx - 5, hyW - 13, W.bladeWhite);
      weapon.setPixel(hx - 6, hyW - 13, W.bladeWhite);
    } else if (frame === 3) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW, hx, hyW - 2, W.goldMid);
      weapon.drawLine(hx + 1, hyW + 1, hx + 15, hyW + 6, W.bladeWhite);
      weapon.drawLine(hx + 1, hyW, hx + 14, hyW + 5, W.bladeHi);
      weapon.setPixel(hx + 16, hyW + 6, W.bladeWhite);
      weapon.drawLine(hx - 8, hyW - 10, hx + 12, hyW - 2, W.slashGlow);
      weapon.drawLine(hx - 4, hyW - 5, hx + 17, hyW + 5, W.bladeWhite);
      weapon.drawLine(hx + 8, hyW + 2, hx + 18, hyW + 6, W.slashGlow);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW - 2, hx + 4, hyW - 13, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 2, hx + 5, hyW - 13, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW - 2, hx + 3, hyW - 11, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 2, hx + 4, hyW - 11, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW + 2, hx + 4, hyW + 12, W.bladeMid);
    } else if (frame === 3) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx, hyW - 2, hx, hyW - 15, W.bladeWhite);
      weapon.drawLine(hx - 1, hyW - 2, hx - 1, hyW - 14, W.bladeHi);
      weapon.setPixel(hx, hyW - 15, W.bladeWhite);
      weapon.drawLine(hx - 4, hyW - 13, hx + 4, hyW - 13, W.slashGlow);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx + 2, hyW, hx + 14, hyW + 4, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 1, hx + 13, hyW + 3, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx + 2, hyW, hx + 11, hyW + 3, W.bladeHi);
      weapon.drawLine(hx + 2, hyW - 1, hx + 10, hyW + 2, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW - 2, hx - 12, hyW - 8, W.bladeHi);
      weapon.drawLine(hx - 2, hyW - 1, hx - 11, hyW - 7, W.bladeWhite);
    } else if (frame === 3) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 1, hyW, hx + 16, hyW, W.bladeWhite);
      weapon.drawLine(hx + 1, hyW - 1, hx + 15, hyW - 1, W.bladeHi);
      weapon.setPixel(hx + 17, hyW, W.bladeWhite);
      weapon.drawLine(hx + 12, hyW - 6, hx + 18, hyW, W.slashGlow);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.fillRect(hx - 2, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW, hx - 14, hyW + 4, W.bladeHi);
      weapon.drawLine(hx - 2, hyW - 1, hx - 13, hyW + 3, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx - 2, hyW, 3, 3, W.goldMid);
      weapon.drawLine(hx - 2, hyW, hx - 11, hyW + 3, W.bladeHi);
      weapon.drawLine(hx - 2, hyW - 1, hx - 10, hyW + 2, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx + 2, hyW - 2, hx + 12, hyW - 8, W.bladeHi);
    } else if (frame === 3) {
      weapon.fillRect(hx - 1, hyW - 1, 3, 3, W.goldMid);
      weapon.drawLine(hx - 1, hyW, hx - 16, hyW, W.bladeWhite);
      weapon.drawLine(hx - 1, hyW - 1, hx - 15, hyW - 1, W.bladeHi);
      weapon.setPixel(hx - 17, hyW, W.bladeWhite);
      weapon.drawLine(hx - 12, hyW - 6, hx - 18, hyW, W.slashGlow);
    }
  }

  return weapon;
}

// 2. Barbarian Greatsword (massive broad two-handed cleaver)
function renderGreatsword(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.fillRect(hx - 2, hyW - 1, 4, 3, W.goldMid);
      weapon.fillRect(hx - 4, hyW + 2, 5, 13, W.bladeMid);
      weapon.fillRect(hx - 4, hyW + 2, 2, 12, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx - 2, hyW - 1, 4, 3, W.goldMid);
      weapon.fillRect(hx - 2, hyW + 2, 5, 11, W.bladeMid);
      weapon.fillRect(hx - 2, hyW + 2, 2, 10, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx - 1, hyW, 4, 3, W.goldMid);
      weapon.fillRect(hx - 3, hyW - 14, 6, 14, W.bladeWhite);
      weapon.fillRect(hx, hyW - 14, 3, 14, W.bladeMid);
    } else if (frame === 3) {
      weapon.fillRect(hx - 1, hyW, 4, 3, W.goldMid);
      weapon.fillRect(hx + 2, hyW + 1, 15, 6, W.bladeWhite);
      weapon.drawLine(hx - 6, hyW - 8, hx + 18, hyW + 5, W.slashGlow);
      weapon.drawLine(hx - 4, hyW - 4, hx + 19, hyW + 6, W.bladeWhite);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.fillRect(hx, hyW - 1, 4, 3, W.goldMid);
      weapon.fillRect(hx + 1, hyW - 14, 5, 13, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx, hyW + 2, 4, 3, W.goldMid);
      weapon.fillRect(hx + 1, hyW - 11, 5, 13, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx, hyW - 2, 4, 3, W.goldMid);
      weapon.fillRect(hx + 1, hyW + 2, 5, 12, W.bladeMid);
    } else if (frame === 3) {
      weapon.fillRect(hx, hyW - 4, 4, 3, W.goldMid);
      weapon.fillRect(hx, hyW - 16, 5, 12, W.bladeWhite);
      weapon.drawLine(hx - 5, hyW - 14, hx + 7, hyW - 14, W.slashGlow);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.fillRect(hx + 3, hyW - 1, 14, 5, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx, hyW, 3, 3, W.goldMid);
      weapon.fillRect(hx + 3, hyW + 1, 11, 5, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx - 2, hyW - 2, 4, 3, W.goldMid);
      weapon.fillRect(hx - 14, hyW - 10, 13, 5, W.bladeWhite);
    } else if (frame === 3) {
      weapon.fillRect(hx, hyW - 2, 4, 3, W.goldMid);
      weapon.fillRect(hx + 3, hyW - 3, 17, 6, W.bladeWhite);
      weapon.drawLine(hx + 14, hyW - 6, hx + 20, hyW, W.slashGlow);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.fillRect(hx - 2, hyW, 3, 3, W.goldMid);
      weapon.fillRect(hx - 16, hyW - 1, 14, 5, W.bladeWhite);
    } else if (frame === 1) {
      weapon.fillRect(hx - 2, hyW, 3, 3, W.goldMid);
      weapon.fillRect(hx - 13, hyW + 1, 11, 5, W.bladeWhite);
    } else if (frame === 2) {
      weapon.fillRect(hx, hyW - 2, 4, 3, W.goldMid);
      weapon.fillRect(hx + 2, hyW - 10, 13, 5, W.bladeWhite);
    } else if (frame === 3) {
      weapon.fillRect(hx - 3, hyW - 2, 4, 3, W.goldMid);
      weapon.fillRect(hx - 19, hyW - 3, 17, 6, W.bladeWhite);
      weapon.drawLine(hx - 14, hyW - 6, hx - 20, hyW, W.slashGlow);
    }
  }

  return weapon;
}

// 3. Archeologist Pickaxe
function renderPickaxe(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      // Swung forward-left
      weapon.drawLine(hx - 1, hyW, hx - 6, hyW + 11, W.woodMid);
      weapon.drawLine(hx - 10, hyW + 11, hx - 2, hyW + 11, W.bladeWhite);
      weapon.fillRect(hx - 7, hyW + 10, 3, 3, W.bladeMid);
    } else if (frame === 1) {
      // Swung back-right
      weapon.drawLine(hx + 1, hyW, hx + 5, hyW + 10, W.woodMid);
      weapon.drawLine(hx + 1, hyW + 10, hx + 9, hyW + 10, W.bladeWhite);
      weapon.fillRect(hx + 4, hyW + 9, 3, 3, W.bladeMid);
    } else if (frame === 2) {
      // Wind-up: pick held high back
      weapon.drawLine(hx, hyW, hx - 4, hyW - 11, W.woodMid);
      weapon.drawLine(hx - 9, hyW - 12, hx + 1, hyW - 10, W.bladeWhite);
      weapon.fillRect(hx - 5, hyW - 12, 3, 3, W.bladeMid);
    } else if (frame === 3) {
      // Strike: pick slammed down with impact spark!
      weapon.drawLine(hx, hyW, hx + 6, hyW + 7, W.woodMid);
      weapon.drawLine(hx + 2, hyW + 9, hx + 10, hyW + 5, W.bladeWhite);
      weapon.setPixel(hx + 10, hyW + 8, W.goldHi);
      weapon.setPixel(hx + 12, hyW + 6, W.goldHi);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 5, hyW - 11, W.woodMid);
      weapon.drawLine(hx + 1, hyW - 11, hx + 9, hyW - 11, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 5, hyW - 10, W.woodMid);
      weapon.drawLine(hx - 9, hyW - 10, hx - 1, hyW - 10, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 4, hyW + 9, W.woodMid);
      weapon.drawLine(hx, hyW + 9, hx + 8, hyW + 9, W.bladeMid);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx, hyW - 14, W.woodMid);
      weapon.drawLine(hx - 5, hyW - 14, hx + 5, hyW - 14, W.bladeWhite);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 11, hyW + 3, W.woodMid);
      weapon.drawLine(hx + 11, hyW - 2, hx + 11, hyW + 8, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 7, hyW - 5, W.woodMid);
      weapon.drawLine(hx + 4, hyW - 7, hx + 10, hyW - 3, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 10, hyW - 7, W.woodMid);
      weapon.drawLine(hx - 10, hyW - 11, hx - 10, hyW - 3, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 14, hyW, W.woodMid);
      weapon.drawLine(hx + 14, hyW - 5, hx + 14, hyW + 5, W.bladeWhite);
      weapon.setPixel(hx + 16, hyW, W.goldHi);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 11, hyW + 3, W.woodMid);
      weapon.drawLine(hx - 11, hyW - 2, hx - 11, hyW + 8, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 7, hyW - 5, W.woodMid);
      weapon.drawLine(hx - 10, hyW - 7, hx - 4, hyW - 3, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 10, hyW - 7, W.woodMid);
      weapon.drawLine(hx + 10, hyW - 11, hx + 10, hyW - 3, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx - 14, hyW, W.woodMid);
      weapon.drawLine(hx - 14, hyW - 5, hx - 14, hyW + 5, W.bladeWhite);
      weapon.setPixel(hx - 16, hyW, W.goldHi);
    }
  }

  return weapon;
}

// 4. Caveman Club (heavy knotted wooden war club)
function renderClub(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 5, hyW + 11, W.woodMid);
      weapon.fillCircle(hx - 5, hyW + 11, 3, W.woodMid);
      weapon.fillRect(hx - 6, hyW + 10, 2, 2, W.woodHi);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 5, hyW + 9, W.woodMid);
      weapon.fillCircle(hx + 5, hyW + 9, 3, W.woodMid);
      weapon.fillRect(hx + 4, hyW + 8, 2, 2, W.woodHi);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 4, hyW - 11, W.woodMid);
      weapon.fillCircle(hx - 4, hyW - 11, 4, W.woodHi);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 8, hyW + 5, W.woodMid);
      weapon.fillCircle(hx + 8, hyW + 5, 4, W.woodMid);
      weapon.setPixel(hx + 12, hyW + 5, W.goldHi);
      weapon.setPixel(hx + 8, hyW + 8, W.goldHi);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 4, hyW - 11, W.woodMid);
      weapon.fillCircle(hx + 4, hyW - 11, 3, W.woodHi);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 4, hyW - 10, W.woodMid);
      weapon.fillCircle(hx - 4, hyW - 10, 3, W.woodHi);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 3, hyW + 9, W.woodMid);
      weapon.fillCircle(hx + 3, hyW + 9, 3, W.woodMid);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx, hyW - 14, W.woodMid);
      weapon.fillCircle(hx, hyW - 14, 4, W.woodHi);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 11, hyW + 2, W.woodMid);
      weapon.fillCircle(hx + 11, hyW + 2, 3, W.woodHi);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 6, hyW - 5, W.woodMid);
      weapon.fillCircle(hx + 6, hyW - 5, 3, W.woodHi);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 10, hyW - 7, W.woodMid);
      weapon.fillCircle(hx - 10, hyW - 7, 4, W.woodHi);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 14, hyW, W.woodMid);
      weapon.fillCircle(hx + 14, hyW, 4, W.woodHi);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 11, hyW + 2, W.woodMid);
      weapon.fillCircle(hx - 11, hyW + 2, 3, W.woodHi);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 6, hyW - 5, W.woodMid);
      weapon.fillCircle(hx - 6, hyW - 5, 3, W.woodHi);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 10, hyW - 7, W.woodMid);
      weapon.fillCircle(hx + 10, hyW - 7, 4, W.woodHi);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx - 14, hyW, W.woodMid);
      weapon.fillCircle(hx - 14, hyW, 4, W.woodHi);
    }
  }

  return weapon;
}

// 5. Healer Scalpel (surgical instrument with gleaming blade and ring handle)
function renderScalpel(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.drawLine(hx - 1, hyW, hx - 6, hyW + 10, W.bladeWhite);
      weapon.drawLine(hx, hyW, hx - 5, hyW + 10, W.bladeHi);
      weapon.fillRect(hx - 2, hyW - 2, 4, 3, W.bladeMid);
    } else if (frame === 1) {
      weapon.drawLine(hx + 1, hyW, hx + 6, hyW - 8, W.bladeWhite);
      weapon.drawLine(hx + 2, hyW, hx + 7, hyW - 8, W.bladeHi);
      weapon.fillRect(hx - 1, hyW + 1, 4, 3, W.bladeMid);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 6, hyW - 12, W.bladeWhite);
      weapon.fillRect(hx - 8, hyW - 14, 5, 5, W.slashGlow);
    } else if (frame === 3) {
      weapon.drawLine(hx - 2, hyW + 4, hx + 13, hyW + 4, W.bladeWhite);
      weapon.drawLine(hx - 2, hyW + 3, hx + 12, hyW + 3, W.bladeHi);
      weapon.drawLine(hx + 6, hyW + 2, hx + 16, hyW + 5, W.slashGlow);
      weapon.drawLine(hx + 8, hyW - 2, hx + 14, hyW + 7, W.slashGlow);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 5, hyW - 10, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW + 1, 3, 3, W.bladeMid);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 5, hyW - 8, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW + 1, 3, 3, W.bladeMid);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 4, hyW + 8, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx, hyW - 13, W.bladeWhite);
      weapon.fillRect(hx - 2, hyW - 15, 5, 4, W.slashGlow);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 11, hyW + 3, W.bladeWhite);
      weapon.fillRect(hx - 2, hyW - 1, 3, 3, W.bladeMid);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 6, hyW - 7, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW + 1, 3, 3, W.bladeMid);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 9, hyW - 7, W.bladeWhite);
      weapon.fillRect(hx - 11, hyW - 9, 4, 4, W.slashGlow);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 15, hyW, W.bladeWhite);
      weapon.drawLine(hx + 10, hyW - 4, hx + 16, hyW + 4, W.slashGlow);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 11, hyW + 3, W.bladeWhite);
      weapon.fillRect(hx, hyW - 1, 3, 3, W.bladeMid);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 6, hyW - 7, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW + 1, 3, 3, W.bladeMid);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 9, hyW - 7, W.bladeWhite);
      weapon.fillRect(hx + 8, hyW - 9, 4, 4, W.slashGlow);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx - 15, hyW, W.bladeWhite);
      weapon.drawLine(hx - 10, hyW - 4, hx - 16, hyW + 4, W.slashGlow);
    }
  }

  return weapon;
}

// 6. Monk Bare Fists (wrapped fighting fists with guard shift & chi strike)
function renderMonkFists(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;
  const wrap = Palettes.outfitMonk.wraps;

  if (dir === 2) {
    if (frame === 0) {
      // Left fist forward, right fist at hip
      weapon.fillRect(hx - 2, hyW + 1, 4, 4, wrap);
      weapon.fillRect(cx + 6, ty - 2, 4, 4, wrap);
    } else if (frame === 1) {
      // Left fist at hip, right fist forward
      weapon.fillRect(hx - 2, ty - 2, 4, 4, wrap);
      weapon.fillRect(cx + 6, hyW + 1, 4, 4, wrap);
    } else if (frame === 2) {
      // Wind-up: both fists coiled tight at hips with golden chi spark
      weapon.fillRect(cx - 8, ty - 1, 4, 4, wrap);
      weapon.fillRect(cx + 5, ty - 1, 4, 4, wrap);
      weapon.setPixel(cx - 1, ty - 2, W.goldHi);
      weapon.setPixel(cx + 1, ty - 2, W.goldHi);
    } else if (frame === 3) {
      // Strike: straight punch extended with kinetic shockwave!
      weapon.fillRect(hx + 4, hyW + 1, 7, 5, wrap);
      weapon.fillRect(hx + 5, hyW + 2, 5, 3, Palettes.skin.mid);
      weapon.drawLine(hx + 12, hyW - 1, hx + 12, hyW + 7, W.bladeWhite);
      weapon.drawLine(hx + 14, hyW - 3, hx + 14, hyW + 7, W.slashGlow);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.fillRect(hx - 1, hyW - 4, 5, 5, wrap);
      weapon.fillRect(cx - 10, ty - 2, 5, 5, wrap);
    } else if (frame === 1) {
      weapon.fillRect(hx - 1, ty - 2, 5, 5, wrap);
      weapon.fillRect(cx - 10, hyW - 4, 5, 5, wrap);
    } else if (frame === 2) {
      weapon.fillRect(cx - 9, ty - 4, 5, 5, wrap);
      weapon.fillRect(cx + 4, ty - 4, 5, 5, wrap);
    } else if (frame === 3) {
      weapon.fillRect(hx - 1, hyW - 10, 7, 6, wrap);
      weapon.drawLine(hx - 3, hyW - 12, hx + 8, hyW - 12, W.slashGlow);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.fillRect(hx + 2, hyW, 4, 4, wrap);
      weapon.fillRect(cx - 4, ty + 1, 4, 4, wrap);
    } else if (frame === 1) {
      weapon.fillRect(hx - 1, hyW + 2, 4, 4, wrap);
      weapon.fillRect(cx + 1, ty - 2, 4, 4, wrap);
    } else if (frame === 2) {
      weapon.fillRect(hx - 4, hyW - 3, 5, 5, wrap);
      weapon.setPixel(hx - 5, hyW - 4, W.goldHi);
    } else if (frame === 3) {
      weapon.fillRect(hx + 5, hyW - 2, 7, 5, wrap);
      weapon.drawLine(hx + 13, hyW - 4, hx + 13, hyW + 6, W.slashGlow);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.fillRect(hx - 4, hyW, 4, 4, wrap);
      weapon.fillRect(cx + 1, ty + 1, 4, 4, wrap);
    } else if (frame === 1) {
      weapon.fillRect(hx + 1, hyW + 2, 4, 4, wrap);
      weapon.fillRect(cx - 4, ty - 2, 4, 4, wrap);
    } else if (frame === 2) {
      weapon.fillRect(hx + 2, hyW - 3, 5, 5, wrap);
      weapon.setPixel(hx + 4, hyW - 4, W.goldHi);
    } else if (frame === 3) {
      weapon.fillRect(hx - 11, hyW - 2, 7, 5, wrap);
      weapon.drawLine(hx - 13, hyW - 4, hx - 13, hyW + 6, W.slashGlow);
    }
  }

  return weapon;
}

// 7. Priest Mace (heavy iron flanged mace)
function renderMace(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.drawLine(hx - 1, hyW, hx - 5, hyW + 11, W.woodMid);
      weapon.fillCircle(hx - 5, hyW + 11, 3, W.bladeMid);
      weapon.setPixel(hx - 5, hyW + 11, W.goldHi);
    } else if (frame === 1) {
      weapon.drawLine(hx + 1, hyW, hx + 5, hyW + 10, W.woodMid);
      weapon.fillCircle(hx + 5, hyW + 10, 3, W.bladeMid);
      weapon.setPixel(hx + 5, hyW + 10, W.goldHi);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 4, hyW - 11, W.woodMid);
      weapon.fillCircle(hx - 4, hyW - 11, 4, W.bladeWhite);
      weapon.setPixel(hx - 4, hyW - 11, W.goldHi);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 8, hyW + 5, W.woodMid);
      weapon.fillCircle(hx + 8, hyW + 5, 4, W.bladeWhite);
      weapon.drawLine(hx + 5, hyW + 7, hx + 11, hyW + 7, W.goldHi);
      weapon.drawLine(hx + 12, hyW + 3, hx + 12, hyW + 7, W.goldHi);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 4, hyW - 11, W.woodMid);
      weapon.fillCircle(hx + 4, hyW - 11, 3, W.bladeMid);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 4, hyW - 10, W.woodMid);
      weapon.fillCircle(hx - 4, hyW - 10, 3, W.bladeMid);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 3, hyW + 9, W.woodMid);
      weapon.fillCircle(hx + 3, hyW + 9, 3, W.bladeMid);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx, hyW - 14, W.woodMid);
      weapon.fillCircle(hx, hyW - 14, 4, W.bladeWhite);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 11, hyW + 2, W.woodMid);
      weapon.fillCircle(hx + 11, hyW + 2, 3, W.bladeMid);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 7, hyW - 5, W.woodMid);
      weapon.fillCircle(hx + 7, hyW - 5, 3, W.bladeMid);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 10, hyW - 7, W.woodMid);
      weapon.fillCircle(hx - 10, hyW - 7, 4, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 14, hyW, W.woodMid);
      weapon.fillCircle(hx + 14, hyW, 4, W.bladeWhite);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 11, hyW + 2, W.woodMid);
      weapon.fillCircle(hx - 11, hyW + 2, 3, W.bladeMid);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 7, hyW - 5, W.woodMid);
      weapon.fillCircle(hx - 7, hyW - 5, 3, W.bladeMid);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 10, hyW - 7, W.woodMid);
      weapon.fillCircle(hx + 10, hyW - 7, 4, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx - 14, hyW, W.woodMid);
      weapon.fillCircle(hx - 14, hyW, 4, W.bladeWhite);
    }
  }

  return weapon;
}

// 8. Ranger Bow (recurve bow, attack draws and releases arrow)
function renderBow(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      // Bow held vertically at side
      weapon.drawLine(hx - 2, hyW - 8, hx - 5, hyW, W.woodMid);
      weapon.drawLine(hx - 5, hyW, hx - 2, hyW + 8, W.woodMid);
      weapon.drawLine(hx - 2, hyW - 8, hx - 2, hyW + 8, W.bladeWhite);
    } else if (frame === 1) {
      // Bow held slanted across chest
      weapon.drawLine(hx - 8, hyW - 2, hx, hyW + 2, W.woodMid);
      weapon.drawLine(hx, hyW + 2, hx + 6, hyW + 6, W.woodMid);
      weapon.drawLine(hx - 8, hyW - 2, hx + 6, hyW + 6, W.bladeWhite);
    } else if (frame === 2) {
      // Wind-up: bow raised horizontally, arrow nocked & drawn taut!
      weapon.drawLine(hx - 8, hyW - 5, hx + 4, hyW - 5, W.woodMid);
      weapon.drawLine(hx - 8, hyW - 5, hx - 2, hyW + 1, W.bladeWhite);
      weapon.drawLine(hx + 4, hyW - 5, hx - 2, hyW + 1, W.bladeWhite);
      weapon.drawLine(hx - 2, hyW + 1, hx - 2, hyW - 7, W.featherRed);
    } else if (frame === 3) {
      // Strike: string released, arrow loosed flying forward!
      weapon.drawLine(hx - 6, hyW - 4, hx + 6, hyW - 4, W.woodMid);
      weapon.drawLine(hx - 6, hyW - 4, hx + 6, hyW - 4, W.bladeWhite);
      weapon.drawLine(hx, hyW + 1, hx, hyW + 7, W.woodMid);
      weapon.setPixel(hx, hyW + 8, W.bladeWhite);
      weapon.drawLine(hx - 1, hyW, hx + 1, hyW, W.featherRed);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx + 2, hyW - 8, hx + 5, hyW, W.woodMid);
      weapon.drawLine(hx + 5, hyW, hx + 2, hyW + 8, W.woodMid);
      weapon.drawLine(hx + 2, hyW - 8, hx + 2, hyW + 8, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx - 5, hyW - 1, hx + 1, hyW + 3, W.woodMid);
      weapon.drawLine(hx + 1, hyW + 3, hx + 7, hyW + 7, W.woodMid);
      weapon.drawLine(hx - 5, hyW - 1, hx + 7, hyW + 7, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx - 4, hyW - 2, hx + 6, hyW - 2, W.woodMid);
      weapon.drawLine(hx - 4, hyW - 2, hx + 1, hyW + 3, W.bladeWhite);
      weapon.drawLine(hx + 6, hyW - 2, hx + 1, hyW + 3, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx - 4, hyW - 2, hx + 6, hyW - 2, W.woodMid);
      weapon.drawLine(hx + 1, hyW - 4, hx + 1, hyW - 14, W.woodMid);
      weapon.setPixel(hx + 1, hyW - 15, W.bladeWhite);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx + 2, hyW - 8, hx + 6, hyW, W.woodMid);
      weapon.drawLine(hx + 6, hyW, hx + 2, hyW + 8, W.woodMid);
      weapon.drawLine(hx + 2, hyW - 8, hx + 2, hyW + 8, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx - 3, hyW - 6, hx + 5, hyW - 2, W.woodMid);
      weapon.drawLine(hx + 5, hyW - 2, hx + 8, hyW + 6, W.woodMid);
      weapon.drawLine(hx - 3, hyW - 6, hx + 8, hyW + 6, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx - 2, hyW - 7, hx - 2, hyW + 7, W.woodMid);
      weapon.drawLine(hx - 2, hyW - 7, hx - 7, hyW, W.bladeWhite);
      weapon.drawLine(hx - 2, hyW + 7, hx - 7, hyW, W.bladeWhite);
      weapon.drawLine(hx - 7, hyW, hx + 3, hyW, W.featherRed);
    } else if (frame === 3) {
      weapon.drawLine(hx - 2, hyW - 7, hx - 2, hyW + 7, W.woodMid);
      weapon.drawLine(hx - 2, hyW - 7, hx - 2, hyW + 7, W.bladeWhite);
      weapon.drawLine(hx + 4, hyW, hx + 16, hyW, W.woodMid);
      weapon.setPixel(hx + 17, hyW, W.bladeWhite);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx - 2, hyW - 8, hx - 6, hyW, W.woodMid);
      weapon.drawLine(hx - 6, hyW, hx - 2, hyW + 8, W.woodMid);
      weapon.drawLine(hx - 2, hyW - 8, hx - 2, hyW + 8, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx + 3, hyW - 6, hx - 5, hyW - 2, W.woodMid);
      weapon.drawLine(hx - 5, hyW - 2, hx - 8, hyW + 6, W.woodMid);
      weapon.drawLine(hx + 3, hyW - 6, hx - 8, hyW + 6, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx + 2, hyW - 7, hx + 2, hyW + 7, W.woodMid);
      weapon.drawLine(hx + 2, hyW - 7, hx + 7, hyW, W.bladeWhite);
      weapon.drawLine(hx + 2, hyW + 7, hx + 7, hyW, W.bladeWhite);
      weapon.drawLine(hx + 7, hyW, hx - 3, hyW, W.featherRed);
    } else if (frame === 3) {
      weapon.drawLine(hx + 2, hyW - 7, hx + 2, hyW + 7, W.woodMid);
      weapon.drawLine(hx + 2, hyW - 7, hx + 2, hyW + 7, W.bladeWhite);
      weapon.drawLine(hx - 4, hyW, hx - 16, hyW, W.woodMid);
      weapon.setPixel(hx - 17, hyW, W.bladeWhite);
    }
  }

  return weapon;
}

// 9. Rogue Shortsword (compact sharp blade)
function renderShortsword(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.drawLine(hx - 1, hyW, hx - 6, hyW + 11, W.bladeWhite);
      weapon.drawLine(hx, hyW, hx - 5, hyW + 11, W.bladeMid);
      weapon.fillRect(hx - 2, hyW - 1, 3, 3, W.bladeShadow);
    } else if (frame === 1) {
      weapon.drawLine(hx + 1, hyW, hx + 5, hyW - 8, W.bladeWhite);
      weapon.drawLine(hx + 2, hyW, hx + 6, hyW - 8, W.bladeMid);
      weapon.fillRect(hx - 1, hyW + 1, 3, 3, W.bladeShadow);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 6, hyW - 10, W.bladeWhite);
      weapon.fillRect(hx - 8, hyW - 12, 4, 4, W.slashGlow);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW + 3, hx + 14, hyW + 3, W.bladeWhite);
      weapon.drawLine(hx + 6, hyW + 1, hx + 15, hyW + 5, W.slashGlow);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 5, hyW - 10, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW + 1, 3, 3, W.bladeShadow);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 5, hyW - 8, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW + 1, 3, 3, W.bladeShadow);
    } else if (frame === 2) {
      weapon.drawLine(hx - 1, hyW, hx - 2, hyW + 9, W.bladeMid);
      weapon.fillRect(hx - 3, hyW, 5, 2, W.bladeShadow);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx, hyW - 14, W.bladeWhite);
      weapon.fillRect(hx - 2, hyW - 15, 5, 4, W.slashGlow);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 12, hyW + 3, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW, 3, 3, W.bladeShadow);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 7, hyW - 6, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW, 3, 3, W.bladeShadow);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 9, hyW - 7, W.bladeWhite);
      weapon.fillRect(hx - 11, hyW - 9, 4, 4, W.slashGlow);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 15, hyW, W.bladeWhite);
      weapon.drawLine(hx + 10, hyW - 3, hx + 16, hyW + 3, W.slashGlow);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 12, hyW + 3, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW, 3, 3, W.bladeShadow);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 7, hyW - 6, W.bladeWhite);
      weapon.fillRect(hx - 1, hyW, 3, 3, W.bladeShadow);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 9, hyW - 7, W.bladeWhite);
      weapon.fillRect(hx + 8, hyW - 9, 4, 4, W.slashGlow);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx - 15, hyW, W.bladeWhite);
      weapon.drawLine(hx - 10, hyW - 3, hx - 16, hyW + 3, W.slashGlow);
    }
  }

  return weapon;
}

// 10. Samurai Katana (curved blade, golden tsuba, crescent slash arc)
function renderKatana(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.setPixel(hx, hyW, W.goldHi);
      weapon.drawLine(hx - 1, hyW + 1, hx - 6, hyW + 13, W.bladeWhite);
      weapon.setPixel(hx - 7, hyW + 13, W.bladeHi);
    } else if (frame === 1) {
      weapon.setPixel(hx, hyW, W.goldHi);
      weapon.drawLine(hx + 1, hyW + 1, hx + 4, hyW + 10, W.bladeWhite);
      weapon.setPixel(hx + 5, hyW + 10, W.bladeHi);
    } else if (frame === 2) {
      weapon.setPixel(hx, hyW, W.goldHi);
      weapon.drawLine(hx, hyW - 1, hx - 7, hyW - 13, W.bladeWhite);
    } else if (frame === 3) {
      weapon.setPixel(hx, hyW, W.goldHi);
      weapon.drawLine(hx + 1, hyW + 1, hx + 15, hyW + 5, W.bladeWhite);
      weapon.drawLine(hx - 6, hyW - 10, hx + 14, hyW - 1, W.slashGlow);
      weapon.drawLine(hx - 2, hyW - 4, hx + 18, hyW + 4, W.bladeWhite);
      weapon.drawLine(hx + 10, hyW + 1, hx + 19, hyW + 6, W.slashGlow);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 6, hyW - 13, W.bladeWhite);
      weapon.setPixel(hx, hyW, W.goldHi);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 4, hyW - 11, W.bladeWhite);
      weapon.setPixel(hx, hyW, W.goldHi);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 4, hyW + 10, W.bladeMid);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx, hyW - 16, W.bladeWhite);
      weapon.drawLine(hx - 5, hyW - 14, hx + 5, hyW - 14, W.slashGlow);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 13, hyW + 3, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 8, hyW - 5, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 11, hyW - 8, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx + 17, hyW - 1, W.bladeWhite);
      weapon.drawLine(hx + 13, hyW - 6, hx + 19, hyW, W.slashGlow);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 13, hyW + 3, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 8, hyW - 5, W.bladeWhite);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 11, hyW - 8, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW, hx - 17, hyW - 1, W.bladeWhite);
      weapon.drawLine(hx - 13, hyW - 6, hx - 19, hyW, W.slashGlow);
    }
  }

  return weapon;
}

// 11. Tourist Darts (attack throws darts in mid-air with trail)
function renderDarts(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      // Fan of 3 darts held angled up-forward
      weapon.drawLine(hx - 3, hyW - 4, hx - 1, hyW + 2, W.featherRed);
      weapon.drawLine(hx, hyW - 5, hx, hyW + 2, W.featherRed);
      weapon.drawLine(hx + 3, hyW - 4, hx + 1, hyW + 2, W.featherRed);
      weapon.setPixel(hx - 3, hyW - 5, W.bladeWhite);
      weapon.setPixel(hx, hyW - 6, W.bladeWhite);
      weapon.setPixel(hx + 3, hyW - 5, W.bladeWhite);
    } else if (frame === 1) {
      // Darts swung down at side
      weapon.drawLine(hx - 2, hyW + 1, hx - 4, hyW + 8, W.featherRed);
      weapon.drawLine(hx, hyW + 1, hx - 1, hyW + 8, W.featherRed);
      weapon.setPixel(hx - 4, hyW + 9, W.bladeWhite);
      weapon.setPixel(hx - 1, hyW + 9, W.bladeWhite);
    } else if (frame === 2) {
      // Hand raised high back ready to throw
      weapon.drawLine(hx - 2, hyW - 2, hx - 6, hyW - 10, W.featherRed);
      weapon.setPixel(hx - 7, hyW - 11, W.bladeWhite);
      weapon.fillRect(hx - 8, hyW - 12, 3, 3, W.goldHi);
    } else if (frame === 3) {
      // Dart flying through air forward!
      weapon.drawLine(hx + 2, hyW + 1, hx + 12, hyW + 5, W.woodMid);
      weapon.drawLine(hx + 8, hyW + 3, hx + 14, hyW + 6, W.bladeWhite);
      weapon.setPixel(hx + 15, hyW + 7, W.bladeMid);
      weapon.setPixel(hx + 7, hyW + 2, W.featherRed);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW - 1, hx + 4, hyW - 8, W.featherRed);
      weapon.drawLine(hx - 1, hyW, hx + 2, hyW - 8, W.featherRed);
      weapon.setPixel(hx + 4, hyW - 9, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW + 1, hx - 4, hyW + 7, W.featherRed);
      weapon.drawLine(hx + 1, hyW + 1, hx - 2, hyW + 7, W.featherRed);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW - 1, hx + 3, hyW + 7, W.featherRed);
      weapon.fillRect(hx + 2, hyW + 6, 3, 3, W.goldHi);
    } else if (frame === 3) {
      weapon.drawLine(hx, hyW - 3, hx, hyW - 13, W.bladeWhite);
      weapon.setPixel(hx, hyW - 14, W.bladeMid);
      weapon.setPixel(hx, hyW - 2, W.featherRed);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx + 8, hyW + 4, W.featherRed);
      weapon.drawLine(hx + 1, hyW - 1, hx + 9, hyW + 2, W.featherRed);
      weapon.setPixel(hx + 9, hyW + 5, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx + 4, hyW - 6, W.featherRed);
      weapon.drawLine(hx - 1, hyW, hx + 3, hyW - 6, W.featherRed);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx - 8, hyW - 6, W.featherRed);
      weapon.fillRect(hx - 9, hyW - 7, 3, 3, W.goldHi);
    } else if (frame === 3) {
      weapon.drawLine(hx + 3, hyW, hx + 16, hyW, W.bladeWhite);
      weapon.setPixel(hx + 17, hyW, W.bladeMid);
      weapon.setPixel(hx + 2, hyW, W.featherRed);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx, hyW, hx - 8, hyW + 4, W.featherRed);
      weapon.drawLine(hx - 1, hyW - 1, hx - 9, hyW + 2, W.featherRed);
      weapon.setPixel(hx - 9, hyW + 5, W.bladeWhite);
    } else if (frame === 1) {
      weapon.drawLine(hx, hyW, hx - 4, hyW - 6, W.featherRed);
      weapon.drawLine(hx + 1, hyW, hx - 3, hyW - 6, W.featherRed);
    } else if (frame === 2) {
      weapon.drawLine(hx, hyW, hx + 8, hyW - 6, W.featherRed);
      weapon.fillRect(hx + 7, hyW - 7, 3, 3, W.goldHi);
    } else if (frame === 3) {
      weapon.drawLine(hx - 3, hyW, hx - 16, hyW, W.bladeWhite);
      weapon.setPixel(hx - 17, hyW, W.bladeMid);
      weapon.setPixel(hx - 2, hyW, W.featherRed);
    }
  }

  return weapon;
}

// 12. Wizard Quarterstaff (hardwood staff topped with glowing crystal orb)
function renderQuarterstaff(dir, frame, cx, ty, hx, hyW) {
  const weapon = new Canvas(48, 48);
  const W = Palettes.weapon;

  if (dir === 2) {
    if (frame === 0) {
      weapon.drawLine(hx - 1, hyW - 8, hx - 5, hyW + 10, W.woodMid);
      weapon.fillCircle(hx - 1, hyW - 8, 3, W.magicBlueMid);
      weapon.setPixel(hx - 1, hyW - 8, W.magicBlueHi);
    } else if (frame === 1) {
      weapon.drawLine(hx - 1, hyW - 6, hx - 4, hyW + 9, W.woodMid);
      weapon.fillCircle(hx - 1, hyW - 6, 3, W.magicBlueMid);
      weapon.setPixel(hx - 1, hyW - 6, W.magicBlueHi);
    } else if (frame === 2) {
      weapon.drawLine(hx - 1, hyW, hx - 5, hyW - 10, W.woodMid);
      weapon.fillCircle(hx - 5, hyW - 10, 3, W.magicBlueMid);
      weapon.setPixel(hx - 5, hyW - 10, W.bladeWhite);
    } else if (frame === 3) {
      weapon.drawLine(hx - 1, hyW - 2, hx + 7, hyW + 6, W.woodMid);
      weapon.fillCircle(hx + 7, hyW + 6, 3, W.magicBlueMid);
      weapon.setPixel(hx + 7, hyW + 6, W.bladeWhite);
      weapon.drawLine(hx + 4, hyW + 4, hx + 10, hyW + 8, W.magicBlueHi);
      weapon.setPixel(hx + 11, hyW + 7, W.slashGlow);
    }
  } else if (dir === 0) {
    if (frame === 0) {
      weapon.drawLine(hx + 2, hyW + 6, hx + 5, hyW - 12, W.woodMid);
      weapon.fillCircle(hx + 5, hyW - 12, 3, W.magicBlueMid);
    } else if (frame === 1) {
      weapon.drawLine(hx + 2, hyW + 7, hx + 4, hyW - 10, W.woodMid);
      weapon.fillCircle(hx + 4, hyW - 10, 3, W.magicBlueMid);
    } else if (frame === 2) {
      weapon.drawLine(hx + 2, hyW - 4, hx + 5, hyW + 10, W.woodMid);
      weapon.fillCircle(hx + 5, hyW + 10, 3, W.magicBlueMid);
    } else if (frame === 3) {
      weapon.drawLine(hx + 1, hyW + 4, hx + 1, hyW - 13, W.woodMid);
      weapon.fillCircle(hx + 1, hyW - 13, 3, W.magicBlueMid);
      weapon.setPixel(hx + 1, hyW - 13, W.bladeWhite);
    }
  } else if (dir === 1) {
    if (frame === 0) {
      weapon.drawLine(hx - 3, hyW + 6, hx + 12, hyW - 4, W.woodMid);
      weapon.fillCircle(hx + 12, hyW - 4, 3, W.magicBlueMid);
    } else if (frame === 1) {
      weapon.drawLine(hx - 3, hyW + 7, hx + 9, hyW - 3, W.woodMid);
      weapon.fillCircle(hx + 9, hyW - 3, 3, W.magicBlueMid);
    } else if (frame === 2) {
      weapon.drawLine(hx + 2, hyW + 4, hx - 10, hyW - 8, W.woodMid);
      weapon.fillCircle(hx - 10, hyW - 8, 3, W.magicBlueMid);
    } else if (frame === 3) {
      weapon.drawLine(hx - 2, hyW - 2, hx + 15, hyW + 2, W.woodMid);
      weapon.fillCircle(hx + 15, hyW + 2, 4, W.magicBlueMid);
      weapon.setPixel(hx + 15, hyW + 2, W.bladeWhite);
    }
  } else if (dir === 3) {
    if (frame === 0) {
      weapon.drawLine(hx + 3, hyW + 6, hx - 12, hyW - 4, W.woodMid);
      weapon.fillCircle(hx - 12, hyW - 4, 3, W.magicBlueMid);
    } else if (frame === 1) {
      weapon.drawLine(hx + 3, hyW + 7, hx - 9, hyW - 3, W.woodMid);
      weapon.fillCircle(hx - 9, hyW - 3, 3, W.magicBlueMid);
    } else if (frame === 2) {
      weapon.drawLine(hx - 2, hyW + 4, hx + 10, hyW - 8, W.woodMid);
      weapon.fillCircle(hx + 10, hyW - 8, 3, W.magicBlueMid);
    } else if (frame === 3) {
      weapon.drawLine(hx + 2, hyW - 2, hx - 15, hyW + 2, W.woodMid);
      weapon.fillCircle(hx - 15, hyW + 2, 4, W.magicBlueMid);
      weapon.setPixel(hx - 15, hyW + 2, W.bladeWhite);
    }
  }

  return weapon;
}

module.exports = { createWeaponSheet };
