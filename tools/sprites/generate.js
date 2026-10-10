// Distributed under the NetHack General Public License.
// Master generator script for 1980s arcade fantasy maze game style sprites

const fs = require('fs');
const path = require('path');
const Canvas = require('./canvas');
const { encodePNG } = require('./png');
const { encodeGIF, quantizeRGBA } = require('./gif');
const { OUTLINE, Palettes } = require('./palette');
const { createHeroLayers } = require('./sprites/hero');
const { createDogSheet } = require('./sprites/dog');
const { createNewtSheet } = require('./sprites/newt');
const { createJackalSheet } = require('./sprites/jackal');
const { createGnomeSheet } = require('./sprites/gnome');

const OUT_DIR = path.resolve(__dirname, '..');
const HERO_DIR = path.join(OUT_DIR, 'hero');
const MONSTER_DIR = path.join(OUT_DIR, 'monster');

// Ensure directories exist
fs.mkdirSync(HERO_DIR, { recursive: true });
fs.mkdirSync(MONSTER_DIR, { recursive: true });

console.log('Generating sprite sheets...');

// 1. Generate Hero Layers
console.log('1. Generating Hero Valkyrie layers...');
const heroLayers = createHeroLayers();

const layerFiles = {
  body: 'body_human_female.png',
  hair: 'hair_female.png',
  outfit: 'outfit_valkyrie.png',
  cape: 'cape.png',
  weapon: 'weapon_longsword.png',
  shield: 'shield_round.png',
};

for (const [key, filename] of Object.entries(layerFiles)) {
  const filePath = path.join(HERO_DIR, filename);
  const pngData = encodePNG(192, 192, heroLayers[key].data);
  fs.writeFileSync(filePath, pngData);
  console.log(`  -> Saved ${filePath}`);
}

// 2. Composite Hero Layers
console.log('2. Compositing Hero layers & alignments...');
function compositeHero(capeCanvas) {
  const comp = new Canvas(192, 192);
  // Layer order: body -> hair -> outfit -> cape -> weapon -> shield
  comp.blit(heroLayers.body);
  comp.blit(heroLayers.hair);
  comp.blit(heroLayers.outfit);
  comp.blit(capeCanvas);
  comp.blit(heroLayers.weapon);
  comp.blit(heroLayers.shield);
  return comp;
}

const heroDefault = compositeHero(heroLayers.cape);
const heroLawful = compositeHero(heroLayers.cape.tintGrays(Palettes.capeLawfulBlue));
const heroNeutral = compositeHero(heroLayers.cape.tintGrays(Palettes.capeNeutralGreen));
const heroChaotic = compositeHero(heroLayers.cape.tintGrays(Palettes.capeChaoticRed));

// 3. Hero Preview (2x2 grid, scaled 4x)
console.log('3. Generating Hero preview (preview.png)...');
{
  const scale = 4;
  const sheetScaled = 192 * scale; // 768 px
  const pad = 32;
  const headerH = 28;
  const totalW = pad + sheetScaled + pad + sheetScaled + pad; // 1632 px
  const totalH = pad + (headerH + sheetScaled) + pad + (headerH + sheetScaled) + pad; // 1720 px

  const preview = new Canvas(totalW, totalH);
  // Fill dark background
  preview.fillRect(0, 0, totalW, totalH, [0x22, 0x22, 0x28, 255]);

  const panels = [
    { title: 'LAWFUL ALIGNMENT (BLUE CAPE)', canvas: heroLawful, col: 0, row: 0 },
    { title: 'NEUTRAL ALIGNMENT (GREEN CAPE)', canvas: heroNeutral, col: 1, row: 0 },
    { title: 'CHAOTIC ALIGNMENT (RED CAPE)', canvas: heroChaotic, col: 0, row: 1 },
    { title: 'BASE NEUTRAL-GRAY CAPE (TINT SOURCE)', canvas: heroDefault, col: 1, row: 1 },
  ];

  for (const p of panels) {
    const x = pad + p.col * (sheetScaled + pad);
    const y = pad + p.row * (headerH + sheetScaled + pad);

    // Label
    preview.drawText(p.title, x + 8, y + 6, [240, 240, 240, 255], 2, [0, 0, 0, 255]);

    // Box border & inner fill
    preview.fillRect(x - 2, y + headerH - 2, sheetScaled + 4, sheetScaled + 4, [0x33, 0x33, 0x40, 255]);
    preview.fillRect(x, y + headerH, sheetScaled, sheetScaled, [0x18, 0x18, 0x20, 255]);

    // Scaled sheet
    const scaled = p.canvas.scaleNearest(scale);
    preview.blit(scaled, x, y + headerH);
  }

  const previewPath = path.join(HERO_DIR, 'preview.png');
  fs.writeFileSync(previewPath, encodePNG(totalW, totalH, preview.data));
  console.log(`  -> Saved ${previewPath}`);
}

// 4. Generate Pet & Monsters
console.log('4. Generating Pet and Monsters...');
const dogSheet = createDogSheet();
fs.writeFileSync(path.join(MONSTER_DIR, 'dog.png'), encodePNG(192, 192, dogSheet.data));
console.log(`  -> Saved ${path.join(MONSTER_DIR, 'dog.png')}`);

const newtSheet = createNewtSheet();
fs.writeFileSync(path.join(MONSTER_DIR, 'newt.png'), encodePNG(192, 192, newtSheet.data));
console.log(`  -> Saved ${path.join(MONSTER_DIR, 'newt.png')}`);

const jackalSheet = createJackalSheet();
fs.writeFileSync(path.join(MONSTER_DIR, 'jackal.png'), encodePNG(192, 192, jackalSheet.data));
console.log(`  -> Saved ${path.join(MONSTER_DIR, 'jackal.png')}`);

const gnomeSheet = createGnomeSheet();
fs.writeFileSync(path.join(MONSTER_DIR, 'gnome.png'), encodePNG(192, 192, gnomeSheet.data));
console.log(`  -> Saved ${path.join(MONSTER_DIR, 'gnome.png')}`);

// 5. Generate preview_all.png (every sheet side by side, scaled 3x, #808080 background, labeled)
console.log('5. Generating preview_all.png...');
{
  const scale = 3;
  const scaledSize = 192 * scale; // 576 px
  const pad = 24;
  const labelH = 26;

  const sheetsToPreview = [
    { label: 'HERO: BODY (SKIN/UNDERGARMENT)', canvas: heroLayers.body },
    { label: 'HERO: HAIR', canvas: heroLayers.hair },
    { label: 'HERO: OUTFIT (VALKYRIE)', canvas: heroLayers.outfit },
    { label: 'HERO: CAPE (GRAY)', canvas: heroLayers.cape },
    { label: 'HERO: WEAPON (LONGSWORD)', canvas: heroLayers.weapon },
    { label: 'HERO: SHIELD (ROUND)', canvas: heroLayers.shield },
    { label: 'HERO: ALL LAYERS COMPOSITED', canvas: heroDefault },
    { label: 'PET: DOG', canvas: dogSheet },
    { label: 'MONSTER: NEWT (LIZARDS)', canvas: newtSheet },
    { label: 'MONSTER: JACKAL (CANINES)', canvas: jackalSheet },
    { label: 'MONSTER: GNOME (GNOMES)', canvas: gnomeSheet },
  ];

  // Arrange in 2 neat rows: Hero row (7 sheets), Monsters/Pet row (4 sheets)
  const cols = 6;
  const numSheets = sheetsToPreview.length;
  // Let's do 2 rows: row 0 has 6 sheets, row 1 has 5 sheets
  const rowCount = 2;
  const colCount = 6;

  const totalW = pad + colCount * (scaledSize + pad); // 24 + 6*(576+24) = 3624 px
  const totalH = pad + rowCount * (labelH + scaledSize + pad); // 24 + 2*(26+576+24) = 1276 px

  const canvasAll = new Canvas(totalW, totalH);
  // Fill mid-gray (#808080)
  canvasAll.fillRect(0, 0, totalW, totalH, [0x80, 0x80, 0x80, 255]);

  for (let i = 0; i < numSheets; i++) {
    const item = sheetsToPreview[i];
    const r = Math.floor(i / colCount);
    const c = i % colCount;

    const x = pad + c * (scaledSize + pad);
    const y = pad + r * (labelH + scaledSize + pad);

    // Label text
    canvasAll.drawText(item.label, x + 4, y + 6, [255, 255, 255, 255], 2, [30, 30, 30, 255]);

    // Subtle dark frame for contrast against #808080
    canvasAll.fillRect(x - 2, y + labelH - 2, scaledSize + 4, scaledSize + 4, [0x50, 0x50, 0x50, 255]);
    // Checkerboard or transparent backing
    for (let by = 0; by < scaledSize; by += 24) {
      for (let bx = 0; bx < scaledSize; bx += 24) {
        const isDark = ((bx / 24 + by / 24) % 2 === 0);
        const col = isDark ? [0x70, 0x70, 0x70, 255] : [0x90, 0x90, 0x90, 255];
        canvasAll.fillRect(x + bx, y + labelH + by, 24, 24, col);
      }
    }

    // Blit scaled sprite sheet
    const scaled = item.canvas.scaleNearest(scale);
    canvasAll.blit(scaled, x, y + labelH);
  }

  const allPath = path.join(OUT_DIR, 'preview_all.png');
  fs.writeFileSync(allPath, encodePNG(totalW, totalH, canvasAll.data));
  console.log(`  -> Saved ${allPath}`);
}

// 6. Generate preview_walk.gif (~6 fps, walk A/B then attack frames, composited hero and each monster facing down, scaled 3x)
console.log('6. Generating preview_walk.gif...');
{
  const scale = 3;
  const cellSize = 48;
  const scaledCell = cellSize * scale; // 144 px
  const characters = [
    { name: 'HERO', getCell: (frame) => getCellCanvas(heroDefault, 2, frame) },
    { name: 'PET DOG', getCell: (frame) => getCellCanvas(dogSheet, 2, frame) },
    { name: 'NEWT', getCell: (frame) => getCellCanvas(newtSheet, 2, frame) },
    { name: 'JACKAL', getCell: (frame) => getCellCanvas(jackalSheet, 2, frame) },
    { name: 'GNOME', getCell: (frame) => getCellCanvas(gnomeSheet, 2, frame) },
  ];

  function getCellCanvas(sheetCanvas, dir, frame) {
    const c = new Canvas(cellSize, cellSize);
    for (let y = 0; y < cellSize; y++) {
      for (let x = 0; x < cellSize; x++) {
        c.setPixel(x, y, sheetCanvas.getPixel(frame * 48 + x, dir * 48 + y));
      }
    }
    return c;
  }

  const pad = 20;
  const topBarH = 24;
  const labelH = 22;
  const totalW = pad + characters.length * (scaledCell + pad); // 20 + 5*(144+20) = 840 px
  const totalH = pad + topBarH + labelH + scaledCell + pad; // 230 px

  // Frames sequence: Walk A (0), Walk B (1), Attack Wind-Up (2), Attack Strike (3)
  const frameIndices = [0, 1, 2, 3];
  const gifFrames = [];
  const { getTextWidth } = require('./font');

  for (const fIdx of frameIndices) {
    const frameCanvas = new Canvas(totalW, totalH);
    // Background: arcade dungeon slate #282830
    frameCanvas.fillRect(0, 0, totalW, totalH, [0x28, 0x28, 0x30, 255]);

    // Top status bar
    frameCanvas.drawText('PILOT SPRITES (FACING DOWN, 3X)', pad, pad, [180, 190, 210, 255], 2, [0, 0, 0, 255]);

    // Action indicator in top-right
    const actionNames = ['WALK A', 'WALK B', 'WIND-UP', 'STRIKE!'];
    const actText = `[ ${actionNames[fIdx]} ]`;
    frameCanvas.drawText(actText, totalW - 140, pad, [255, 220, 40, 255], 2, [0, 0, 0, 255]);

    // Draw characters
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const x = pad + i * (scaledCell + pad);
      const y = pad + topBarH + labelH;

      // Character name label centered over sprite
      const nameW = getTextWidth(char.name, 2);
      const nameX = x + Math.round((scaledCell - nameW) / 2);
      frameCanvas.drawText(char.name, nameX, pad + topBarH + 2, [240, 240, 240, 255], 2, [20, 20, 20, 255]);

      // Ground platform shadow
      for (let sx = 0; sx < scaledCell; sx += 3) {
        frameCanvas.fillRect(x + sx, y + scaledCell - 9, 3, 6, [0x1c, 0x1c, 0x22, 255]);
      }

      // Character cell scaled 3x
      const rawCell = char.getCell(fIdx);
      const scaled = rawCell.scaleNearest(scale);
      frameCanvas.blit(scaled, x, y);
    }

    // Quantize frame for GIF
    const qFrame = quantizeRGBA(totalW, totalH, frameCanvas.data);
    gifFrames.push(qFrame);
  }

  // 6 fps corresponds to ~16.6 centiseconds (delay = 16)
  const gifData = encodeGIF(totalW, totalH, gifFrames, 16);
  const gifPath = path.join(OUT_DIR, 'preview_walk.gif');
  fs.writeFileSync(gifPath, gifData);
  console.log(`  -> Saved ${gifPath}`);
}

console.log('All sprite assets generated successfully!');
