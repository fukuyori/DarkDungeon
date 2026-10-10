// Distributed under the NetHack General Public License.
// Generator for Hero Hair layers (hair_female and hair_male)

const Canvas = require('../canvas');
const { OUTLINE, Palettes } = require('../palette');

function createHairSheet(gender) {
  const sheet = new Canvas(192, 192);

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const cellX = frame * 48;
      const cellY = dir * 48;
      const cell = (gender === 'male') ? renderHairMale(dir, frame) : renderHairFemale(dir, frame);
      sheet.blit(cell, cellX, cellY);
    }
  }

  sheet.addOutline(OUTLINE);
  return sheet;
}

function getHeroKinematics(dir, frame) {
  let yBob = 0;
  let xShift = 0;

  if (frame === 0) {
    yBob = 0;
  } else if (frame === 1) {
    yBob = -1;
  } else if (frame === 2) {
    yBob = 1;
    if (dir === 1) xShift = -1;
    if (dir === 3) xShift = 1;
  } else if (frame === 3) {
    yBob = 1;
    if (dir === 1) xShift = 3;
    else if (dir === 3) xShift = -3;
    else if (dir === 2) yBob = 2;
    else if (dir === 0) yBob = -1;
  }

  const cx = 24 + xShift;
  const hy = 14 + yBob;
  return { cx, hy, yBob, xShift };
}

function renderHairFemale(dir, frame) {
  const hair = new Canvas(48, 48);
  const P = Palettes;
  const { cx, hy } = getHeroKinematics(dir, frame);

  if (dir === 2) {
    hair.fillEllipse(cx, hy - 4, 7, 5, P.hair.mid);
    hair.fillRect(cx - 6, hy - 7, 6, 5, P.hair.highlight);
    hair.fillRect(cx + 2, hy - 7, 5, 5, P.hair.shadow);

    hair.fillRect(cx - 5, hy - 4, 10, 2, P.hair.mid);
    hair.fillRect(cx - 5, hy - 4, 5, 1, P.hair.highlight);

    const hSway = (frame === 0) ? -1 : (frame === 1 ? 1 : 0);
    hair.fillRect(cx - 8 + hSway, hy - 2, 3, 14, P.hair.mid);
    hair.fillRect(cx - 8 + hSway, hy - 2, 2, 12, P.hair.highlight);

    hair.fillRect(cx + 6 + hSway, hy - 2, 3, 14, P.hair.shadow);
    hair.fillRect(cx + 6 + hSway, hy - 2, 2, 12, P.hair.mid);

  } else if (dir === 0) {
    hair.fillEllipse(cx, hy - 1, 8, 8, P.hair.mid);
    hair.fillRect(cx - 7, hy - 6, 6, 8, P.hair.highlight);
    hair.fillRect(cx + 2, hy - 5, 6, 8, P.hair.shadow);

    const hSway = (frame === 0) ? -2 : (frame === 1 ? 2 : 0);
    hair.fillRect(cx - 7 + hSway, hy + 2, 14, 12, P.hair.mid);
    hair.fillRect(cx - 7 + hSway, hy + 2, 5, 10, P.hair.highlight);
    hair.fillRect(cx + 3 + hSway, hy + 2, 4, 12, P.hair.shadow);

  } else if (dir === 1) {
    hair.fillEllipse(cx - 1, hy - 2, 6, 6, P.hair.mid);
    hair.fillRect(cx - 5, hy - 6, 5, 5, P.hair.highlight);

    const hSway = (frame === 0) ? -1 : (frame === 1 ? 1 : (frame === 3 ? -3 : 0));
    hair.fillRect(cx - 9 + hSway, hy - 2, 6, 14, P.hair.mid);
    hair.fillRect(cx - 8 + hSway, hy - 1, 3, 10, P.hair.highlight);
    hair.fillRect(cx - 5 + hSway, hy + 4, 3, 8, P.hair.shadow);

  } else if (dir === 3) {
    hair.fillEllipse(cx + 1, hy - 2, 6, 6, P.hair.mid);
    hair.fillRect(cx - 1, hy - 6, 5, 5, P.hair.highlight);

    const hSway = (frame === 0) ? 1 : (frame === 1 ? -1 : (frame === 3 ? 3 : 0));
    hair.fillRect(cx + 3 + hSway, hy - 2, 6, 14, P.hair.mid);
    hair.fillRect(cx + 4 + hSway, hy - 1, 3, 10, P.hair.shadow);
  }

  return hair;
}

function renderHairMale(dir, frame) {
  const hair = new Canvas(48, 48);
  const P = Palettes;
  const { cx, hy } = getHeroKinematics(dir, frame);
  const hSway = (frame === 0) ? -1 : (frame === 1 ? 1 : (frame === 3 ? -2 : 0));

  if (dir === 2) {
    // Facing Down: neat heroic crop, parted left, bangs high above eyes
    hair.fillEllipse(cx, hy - 4, 7, 5, P.hair.mid);
    hair.fillRect(cx - 6, hy - 7, 6, 5, P.hair.highlight);
    hair.fillRect(cx + 2, hy - 7, 5, 5, P.hair.shadow);

    // Parted fringe at brow
    hair.fillRect(cx - 5, hy - 4, 10, 2, P.hair.mid);
    hair.fillRect(cx - 5, hy - 4, 5, 1, P.hair.highlight);
    hair.setPixel(cx - 6, hy - 3, P.hair.highlight);

    // Neat sideburns ending at hy + 1
    hair.fillRect(cx - 7, hy - 3, 2, 4, P.hair.mid);
    hair.fillRect(cx + 5, hy - 3, 2, 4, P.hair.shadow);

    // Swaying tuft on strike / walk
    hair.fillRect(cx - 2 + hSway, hy - 8, 4, 2, P.hair.highlight);

  } else if (dir === 0) {
    // Facing Up: full cropped back of head down to nape (hy + 3)
    hair.fillEllipse(cx, hy - 2, 8, 7, P.hair.mid);
    hair.fillRect(cx - 6, hy - 6, 6, 6, P.hair.highlight);
    hair.fillRect(cx + 1, hy - 5, 6, 6, P.hair.shadow);

    hair.fillRect(cx - 6 + hSway, hy + 1, 12, 4, P.hair.mid);
    hair.fillRect(cx - 6 + hSway, hy + 1, 5, 3, P.hair.highlight);
    hair.fillRect(cx + 2 + hSway, hy + 1, 4, 4, P.hair.shadow);

  } else if (dir === 1) {
    // Facing Right: cropped profile
    hair.fillEllipse(cx - 1, hy - 3, 6, 6, P.hair.mid);
    hair.fillRect(cx - 5, hy - 6, 5, 5, P.hair.highlight);

    hair.fillRect(cx - 7 + hSway, hy - 2, 5, 6, P.hair.mid);
    hair.fillRect(cx - 6 + hSway, hy - 1, 3, 4, P.hair.highlight);
    hair.fillRect(cx - 4 + hSway, hy + 2, 3, 3, P.hair.shadow);

  } else if (dir === 3) {
    // Facing Left: cropped profile
    hair.fillEllipse(cx + 1, hy - 3, 6, 6, P.hair.mid);
    hair.fillRect(cx - 1, hy - 6, 5, 5, P.hair.highlight);

    hair.fillRect(cx + 2 - hSway, hy - 2, 5, 6, P.hair.mid);
    hair.fillRect(cx + 3 - hSway, hy - 1, 3, 4, P.hair.shadow);
    hair.fillRect(cx + 1 - hSway, hy + 2, 3, 3, P.hair.highlight);
  }

  return hair;
}

module.exports = { createHairSheet, getHeroKinematics };
