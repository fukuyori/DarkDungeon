// Distributed under the NetHack General Public License.
// Master generator script for 1980s arcade fantasy maze game style sprites
// Generates all 101 sheets:
// - 40 Hero layer sheets in out/hero/
// - 61 Monster sheets (4 species + 57 classes) in out/monster/
// - Deliverable previews: out/hero/preview.png, out/preview_all.png, out/preview_walk.gif

const fs = require('fs');
const path = require('path');
const Canvas = require('./canvas');
const { encodePNG } = require('./png');
const { encodeGIF, quantizeRGBA } = require('./gif');
const { OUTLINE, Palettes } = require('./palette');
const {
  RACES,
  GENDERS,
  ROLES,
  createBodySheet,
  createHairSheet,
  createOutfitSheet,
  createCapeSheet,
  createWeaponSheet,
  createShieldSheet,
  compositeHeroLayers,
} = require('./sprites/hero');
const { createDogSheet } = require('./sprites/dog');
const { createNewtSheet } = require('./sprites/newt');
const { createJackalSheet } = require('./sprites/jackal');
const { createGnomeSheet } = require('./sprites/gnome');
const { CLASS_NAMES, createClassSheet } = require('./sprites/monsters/index');

const OUT_DIR = path.resolve(__dirname, '..');
const HERO_DIR = path.join(OUT_DIR, 'hero');
const MONSTER_DIR = path.join(OUT_DIR, 'monster');

// Ensure directories exist
fs.mkdirSync(HERO_DIR, { recursive: true });
fs.mkdirSync(MONSTER_DIR, { recursive: true });

// Remove obsolete pilot filenames if present
const obsoleteFiles = [
  path.join(HERO_DIR, 'weapon_longsword.png'),
  path.join(HERO_DIR, 'shield_round.png'),
];
for (const of of obsoleteFiles) {
  if (fs.existsSync(of)) {
    fs.unlinkSync(of);
    console.log(`Removed obsolete file: ${path.basename(of)}`);
  }
}

console.log('====================================================');
console.log('   GENERATING COMPLETE SPRITE SET (ROUND 3)');
console.log('====================================================\n');

const allGeneratedSheets = []; // { key, category, label, canvas, filePath }

// ------------------------------------------------------------------
// 1. GENERATE HERO LAYERS (40 SHEETS)
// ------------------------------------------------------------------
console.log('1. Generating 40 Hero Layer sheets...');

// 1.1 Bodies (10: 5 races x 2 genders)
const cachedBodies = {};
for (const race of RACES) {
  for (const gender of GENDERS) {
    const filename = `body_${race}_${gender}.png`;
    const filePath = path.join(HERO_DIR, filename);
    const canvas = createBodySheet(race, gender);
    fs.writeFileSync(filePath, encodePNG(192, 192, canvas.data));
    cachedBodies[`${race}_${gender}`] = canvas;
    allGeneratedSheets.push({
      key: `hero/${filename}`,
      category: 'HERO BODY',
      label: `body_${race}_${gender}`,
      canvas,
      filePath,
    });
  }
}
console.log('  -> 10 Bodies generated');

// 1.2 Hair (2: male, female)
const cachedHair = {};
for (const gender of GENDERS) {
  const filename = `hair_${gender}.png`;
  const filePath = path.join(HERO_DIR, filename);
  const canvas = createHairSheet(gender);
  fs.writeFileSync(filePath, encodePNG(192, 192, canvas.data));
  cachedHair[gender] = canvas;
  allGeneratedSheets.push({
    key: `hero/${filename}`,
    category: 'HERO HAIR',
    label: `hair_${gender}`,
    canvas,
    filePath,
  });
}
console.log('  -> 2 Hair sheets generated');

// 1.3 Outfits (13 roles)
const cachedOutfits = {};
for (const role of ROLES) {
  const filename = `outfit_${role}.png`;
  const filePath = path.join(HERO_DIR, filename);
  const canvas = createOutfitSheet(role);
  fs.writeFileSync(filePath, encodePNG(192, 192, canvas.data));
  cachedOutfits[role] = canvas;
  allGeneratedSheets.push({
    key: `hero/${filename}`,
    category: 'HERO OUTFIT',
    label: `outfit_${role}`,
    canvas,
    filePath,
  });
}
console.log('  -> 13 Outfits generated');

// 1.4 Cape (1)
const capeCanvas = createCapeSheet();
const capePath = path.join(HERO_DIR, 'cape.png');
fs.writeFileSync(capePath, encodePNG(192, 192, capeCanvas.data));
allGeneratedSheets.push({
  key: 'hero/cape.png',
  category: 'HERO CAPE',
  label: 'cape',
  canvas: capeCanvas,
  filePath: capePath,
});
console.log('  -> 1 Cape generated');

// 1.5 Weapons (13 roles)
const cachedWeapons = {};
for (const role of ROLES) {
  const filename = `weapon_${role}.png`;
  const filePath = path.join(HERO_DIR, filename);
  const canvas = createWeaponSheet(role);
  fs.writeFileSync(filePath, encodePNG(192, 192, canvas.data));
  cachedWeapons[role] = canvas;
  allGeneratedSheets.push({
    key: `hero/${filename}`,
    category: 'HERO WEAPON',
    label: `weapon_${role}`,
    canvas,
    filePath,
  });
}
console.log('  -> 13 Weapons generated');

// 1.6 Shield (1: shield_valkyrie.png)
const shieldCanvas = createShieldSheet();
const shieldPath = path.join(HERO_DIR, 'shield_valkyrie.png');
fs.writeFileSync(shieldPath, encodePNG(192, 192, shieldCanvas.data));
allGeneratedSheets.push({
  key: 'hero/shield_valkyrie.png',
  category: 'HERO SHIELD',
  label: 'shield_valkyrie',
  canvas: shieldCanvas,
  filePath: shieldPath,
});
console.log('  -> 1 Shield generated');
console.log(`Total Hero sheets generated: 40\n`);

// ------------------------------------------------------------------
// 2. GENERATE MONSTER SHEETS (61 SHEETS)
// ------------------------------------------------------------------
console.log('2. Generating 61 Monster sheets...');

// 2.1 Species-specific sheets (4)
const speciesMonsters = [
  { name: 'dog', gen: createDogSheet, label: 'dog (species)' },
  { name: 'jackal', gen: createJackalSheet, label: 'jackal (species)' },
  { name: 'newt', gen: createNewtSheet, label: 'newt (species)' },
  { name: 'gnome', gen: createGnomeSheet, label: 'gnome (species)' },
];

for (const sm of speciesMonsters) {
  const filename = `${sm.name}.png`;
  const filePath = path.join(MONSTER_DIR, filename);
  const canvas = sm.gen();
  fs.writeFileSync(filePath, encodePNG(192, 192, canvas.data));
  allGeneratedSheets.push({
    key: `monster/${filename}`,
    category: 'SPECIES',
    label: sm.label,
    canvas,
    filePath,
  });
}
console.log('  -> 4 Species sheets generated');

// 2.2 Monster Class sheets (57 classes)
for (const cName of CLASS_NAMES) {
  const filename = `class_${cName}.png`;
  const filePath = path.join(MONSTER_DIR, filename);
  const canvas = createClassSheet(cName);
  fs.writeFileSync(filePath, encodePNG(192, 192, canvas.data));
  allGeneratedSheets.push({
    key: `monster/${filename}`,
    category: 'CLASS',
    label: `class_${cName}`,
    canvas,
    filePath,
  });
}
console.log(`  -> 57 Class sheets generated`);
console.log(`Total Monster sheets generated: 61`);
console.log(`Total Sprite sheets generated: ${allGeneratedSheets.length} (expected 101)\n`);

// ------------------------------------------------------------------
// 3. GENERATE HERO PREVIEW (out/hero/preview.png)
// Showing all 13 roles on Human Male & Human Female
// ------------------------------------------------------------------
console.log('3. Generating out/hero/preview.png (every role on Human Male and Female)...');
{
  const scale = 2;
  const sheetScaled = 192 * scale; // 384 px
  const pad = 24;
  const headerH = 24;
  const cols = 4; // 2 pairs of (Male, Female) per row
  const rows = Math.ceil(ROLES.length / 2); // 7 rows (14 slots, 13 roles)

  const totalW = pad + cols * (sheetScaled + pad); // 24 + 4*(384+24) = 1656 px
  const totalH = pad + rows * (headerH + sheetScaled + pad); // 24 + 7*(24+384+24) = 3048 px

  const heroPreview = new Canvas(totalW, totalH);
  heroPreview.fillRect(0, 0, totalW, totalH, [0x22, 0x22, 0x28, 255]);

  const humanMaleBody = cachedBodies['human_male'];
  const humanFemaleBody = cachedBodies['human_female'];
  const hairMale = cachedHair['male'];
  const hairFemale = cachedHair['female'];

  let slotIdx = 0;
  for (const role of ROLES) {
    const outfit = cachedOutfits[role];
    const weapon = cachedWeapons[role];
    const shield = (role === 'valkyrie') ? shieldCanvas : null;

    const maleComp = compositeHeroLayers(humanMaleBody, hairMale, outfit, capeCanvas, weapon, shield);
    const femaleComp = compositeHeroLayers(humanFemaleBody, hairFemale, outfit, capeCanvas, weapon, shield);

    const pairs = [
      { label: `${role.toUpperCase()} (HUMAN MALE)`, canvas: maleComp },
      { label: `${role.toUpperCase()} (HUMAN FEMALE)`, canvas: femaleComp },
    ];

    for (const p of pairs) {
      const col = slotIdx % cols;
      const row = Math.floor(slotIdx / cols);
      const x = pad + col * (sheetScaled + pad);
      const y = pad + row * (headerH + sheetScaled + pad);

      heroPreview.drawText(p.label, x + 4, y + 4, [240, 240, 240, 255], 2, [0, 0, 0, 255]);
      heroPreview.fillRect(x - 2, y + headerH - 2, sheetScaled + 4, sheetScaled + 4, [0x33, 0x33, 0x40, 255]);
      heroPreview.fillRect(x, y + headerH, sheetScaled, sheetScaled, [0x18, 0x18, 0x20, 255]);

      const scaled = p.canvas.scaleNearest(scale);
      heroPreview.blit(scaled, x, y + headerH);

      slotIdx++;
    }
  }

  const heroPreviewPath = path.join(HERO_DIR, 'preview.png');
  fs.writeFileSync(heroPreviewPath, encodePNG(totalW, totalH, heroPreview.data));
  console.log(`  -> Saved ${heroPreviewPath} (${totalW}x${totalH})\n`);
}

// ------------------------------------------------------------------
// 4. GENERATE COMPLETE PREVIEW (out/preview_all.png)
// Showing all 101 sheets labeled side by side on #808080 background
// ------------------------------------------------------------------
console.log('4. Generating out/preview_all.png (all 101 sheets)...');
{
  const scale = 1;
  const sheetScaled = 192 * scale; // 192 px
  const pad = 16;
  const labelH = 20;
  const cols = 10;
  const rows = Math.ceil(allGeneratedSheets.length / cols); // 11 rows

  const totalW = pad + cols * (sheetScaled + pad); // 16 + 10*(192+16) = 2096 px
  const totalH = pad + rows * (labelH + sheetScaled + pad); // 16 + 11*(20+192+16) = 2524 px

  const canvasAll = new Canvas(totalW, totalH);
  canvasAll.fillRect(0, 0, totalW, totalH, [0x80, 0x80, 0x80, 255]); // #808080 background

  for (let i = 0; i < allGeneratedSheets.length; i++) {
    const item = allGeneratedSheets[i];
    const c = i % cols;
    const r = Math.floor(i / cols);

    const x = pad + c * (sheetScaled + pad);
    const y = pad + r * (labelH + sheetScaled + pad);

    // Label text
    canvasAll.drawText(item.label, x + 2, y + 4, [255, 255, 255, 255], 1, [20, 20, 20, 255]);

    // Border frame & checkerboard
    canvasAll.fillRect(x - 1, y + labelH - 1, sheetScaled + 2, sheetScaled + 2, [0x50, 0x50, 0x50, 255]);
    for (let by = 0; by < sheetScaled; by += 24) {
      for (let bx = 0; bx < sheetScaled; bx += 24) {
        const isDark = ((bx / 24 + by / 24) % 2 === 0);
        const col = isDark ? [0x70, 0x70, 0x70, 255] : [0x90, 0x90, 0x90, 255];
        canvasAll.fillRect(x + bx, y + labelH + by, 24, 24, col);
      }
    }

    // Blit sheet
    canvasAll.blit(item.canvas, x, y + labelH);
  }

  const allPath = path.join(OUT_DIR, 'preview_all.png');
  fs.writeFileSync(allPath, encodePNG(totalW, totalH, canvasAll.data));
  console.log(`  -> Saved ${allPath} (${totalW}x${totalH})\n`);
}

// ------------------------------------------------------------------
// 5. GENERATE ANIMATED WALK PREVIEW (out/preview_walk.gif)
// ------------------------------------------------------------------
console.log('5. Generating out/preview_walk.gif...');
{
  const scale = 3;
  const cellSize = 48;
  const scaledCell = cellSize * scale; // 144 px

  function getCellCanvas(sheetCanvas, dir, frame) {
    const c = new Canvas(cellSize, cellSize);
    for (let y = 0; y < cellSize; y++) {
      for (let x = 0; x < cellSize; x++) {
        c.setPixel(x, y, sheetCanvas.getPixel(frame * 48 + x, dir * 48 + y));
      }
    }
    return c;
  }

  const valkComp = compositeHeroLayers(
    cachedBodies['human_female'],
    cachedHair['female'],
    cachedOutfits['valkyrie'],
    capeCanvas,
    cachedWeapons['valkyrie'],
    shieldCanvas
  );
  const wizComp = compositeHeroLayers(
    cachedBodies['human_male'],
    cachedHair['male'],
    cachedOutfits['wizard'],
    capeCanvas,
    cachedWeapons['wizard'],
    null
  );
  const dragonSheet = createClassSheet('dragon');
  const lichSheet = createClassSheet('lich');
  const dogSheet = createDogSheet();

  const characters = [
    { name: 'VALKYRIE', getCell: (frame) => getCellCanvas(valkComp, 2, frame) },
    { name: 'WIZARD', getCell: (frame) => getCellCanvas(wizComp, 2, frame) },
    { name: 'PET DOG', getCell: (frame) => getCellCanvas(dogSheet, 2, frame) },
    { name: 'DRAGON', getCell: (frame) => getCellCanvas(dragonSheet, 2, frame) },
    { name: 'LICH', getCell: (frame) => getCellCanvas(lichSheet, 2, frame) },
  ];

  const pad = 20;
  const topBarH = 24;
  const labelH = 22;
  const totalW = pad + characters.length * (scaledCell + pad);
  const totalH = pad + topBarH + labelH + scaledCell + pad;

  const frameIndices = [0, 1, 2, 3];
  const gifFrames = [];
  const { getTextWidth } = require('./font');

  for (const fIdx of frameIndices) {
    const frameCanvas = new Canvas(totalW, totalH);
    frameCanvas.fillRect(0, 0, totalW, totalH, [0x28, 0x28, 0x30, 255]);

    frameCanvas.drawText('NETHACK COMPLETE SPRITE SET (3X)', pad, pad, [180, 190, 210, 255], 2, [0, 0, 0, 255]);

    const actionNames = ['WALK A', 'WALK B', 'WIND-UP', 'STRIKE!'];
    const actText = `[ ${actionNames[fIdx]} ]`;
    frameCanvas.drawText(actText, totalW - 140, pad, [255, 220, 40, 255], 2, [0, 0, 0, 255]);

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const x = pad + i * (scaledCell + pad);
      const y = pad + topBarH + labelH;

      const nameW = getTextWidth(char.name, 2);
      const nameX = x + Math.round((scaledCell - nameW) / 2);
      frameCanvas.drawText(char.name, nameX, pad + topBarH + 2, [240, 240, 240, 255], 2, [20, 20, 20, 255]);

      for (let sx = 0; sx < scaledCell; sx += 3) {
        frameCanvas.fillRect(x + sx, y + scaledCell - 9, 3, 6, [0x1c, 0x1c, 0x22, 255]);
      }

      const rawCell = char.getCell(fIdx);
      const scaled = rawCell.scaleNearest(scale);
      frameCanvas.blit(scaled, x, y);
    }

    const qFrame = quantizeRGBA(totalW, totalH, frameCanvas.data);
    gifFrames.push(qFrame);
  }

  const gifData = encodeGIF(totalW, totalH, gifFrames, 16);
  const gifPath = path.join(OUT_DIR, 'preview_walk.gif');
  fs.writeFileSync(gifPath, gifData);
  console.log(`  -> Saved ${gifPath}\n`);
}

console.log('====================================================');
console.log('ALL ASSETS AND PREVIEWS GENERATED SUCCESSFULLY!');
console.log('====================================================\n');
