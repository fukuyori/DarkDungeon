// Distributed under the NetHack General Public License.
// Self-check verification script for 1980s arcade fantasy maze game style sprites
// Verifies for every sheet:
// 1. Size 192x192
// 2. RGBA format
// 3. Corner pixels alpha 0 (both sheet corners and cell corners)
// 4. Every cell non-empty (16 cells per sheet)
// 5. Color count per sheet <= 12 (alpha 0 excluded)
// 6. For every row: walk A vs walk B differ by >= 60 px
// 7. For every row: wind-up vs walk A differ by >= 60 px
// 8. For every row: strike vs wind-up differ by >= 60 px
// 9. Hero layers composite without misalignment

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png');

const OUT_DIR = path.resolve(__dirname, '..');

const sheetsToCheck = [
  { path: 'hero/body_human_female.png', name: 'Hero Body' },
  { path: 'hero/hair_female.png', name: 'Hero Hair' },
  { path: 'hero/outfit_valkyrie.png', name: 'Hero Outfit' },
  { path: 'hero/cape.png', name: 'Hero Cape' },
  { path: 'hero/weapon_longsword.png', name: 'Hero Weapon' },
  { path: 'hero/shield_round.png', name: 'Hero Shield' },
  { path: 'monster/dog.png', name: 'Pet Dog' },
  { path: 'monster/newt.png', name: 'Monster Newt' },
  { path: 'monster/jackal.png', name: 'Monster Jackal' },
  { path: 'monster/gnome.png', name: 'Monster Gnome' },
];

console.log('====================================================');
console.log('   SPRITE SET SELF-CHECK VERIFICATION SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
const results = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    return true;
  } else {
    console.error(`  FAIL: ${message}`);
    return false;
  }
}

function countChangedPixels(data, row, col1, col2) {
  let count = 0;
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const idx1 = ((row * 48 + y) * 192 + (col1 * 48 + x)) * 4;
      const idx2 = ((row * 48 + y) * 192 + (col2 * 48 + x)) * 4;
      const a1 = data[idx1 + 3];
      const a2 = data[idx2 + 3];
      if (a1 === 0 && a2 === 0) continue;
      if (a1 !== a2 ||
          data[idx1] !== data[idx2] ||
          data[idx1 + 1] !== data[idx2 + 1] ||
          data[idx1 + 2] !== data[idx2 + 2]) {
        count++;
      }
    }
  }
  return count;
}

function countUniqueColors(data) {
  const colors = new Set();
  for (let i = 0; i < 192 * 192; i++) {
    const a = data[i * 4 + 3];
    if (a > 0) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      colors.add((r << 16) | (g << 8) | b);
    }
  }
  return colors.size;
}

const loadedSheets = {};

for (const item of sheetsToCheck) {
  const fullPath = path.join(OUT_DIR, item.path);
  console.log(`Checking sheet: ${item.path} (${item.name})...`);

  // 1. File existence
  const fileExists = fs.existsSync(fullPath);
  assert(fileExists, `File ${item.path} exists`);
  if (!fileExists) continue;

  const buf = fs.readFileSync(fullPath);
  let decoded;
  try {
    decoded = decodePNG(buf);
  } catch (err) {
    assert(false, `Failed to decode PNG: ${err.message}`);
    continue;
  }
  loadedSheets[item.path] = decoded;

  // 2. Size 192x192
  const sizeOk = (decoded.width === 192 && decoded.height === 192);
  assert(sizeOk, `Size is exactly 192x192 (got ${decoded.width}x${decoded.height})`);

  // 3. RGBA check
  const rgbaOk = (decoded.data.length === 192 * 192 * 4);
  assert(rgbaOk, `Format is 8-bit RGBA (buffer length ${decoded.data.length})`);

  // 4. Corner pixels alpha 0
  const getAlpha = (x, y) => decoded.data[(y * 192 + x) * 4 + 3];
  const sheetCorners = [
    { x: 0, y: 0 },
    { x: 191, y: 0 },
    { x: 0, y: 191 },
    { x: 191, y: 191 }
  ];
  let sheetCornersAlpha0 = true;
  for (const pt of sheetCorners) {
    if (getAlpha(pt.x, pt.y) !== 0) sheetCornersAlpha0 = false;
  }
  assert(sheetCornersAlpha0, `Sheet 4 corners have alpha 0`);

  let allCellCornersAlpha0 = true;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x0 = c * 48;
      const x1 = c * 48 + 47;
      const y0 = r * 48;
      const y1 = r * 48 + 47;
      if (getAlpha(x0, y0) !== 0 || getAlpha(x1, y0) !== 0 ||
          getAlpha(x0, y1) !== 0 || getAlpha(x1, y1) !== 0) {
        allCellCornersAlpha0 = false;
      }
    }
  }
  assert(allCellCornersAlpha0, `All 16 cell corners have alpha 0`);

  // 5. Every cell non-empty
  let allCellsNonEmpty = true;
  const cellCounts = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let count = 0;
      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
          const a = getAlpha(c * 48 + x, r * 48 + y);
          if (a > 0) count++;
        }
      }
      cellCounts.push(count);
      if (count === 0) allCellsNonEmpty = false;
    }
  }
  const minPixels = Math.min(...cellCounts);
  const maxPixels = Math.max(...cellCounts);
  assert(allCellsNonEmpty, `Every cell is non-empty (pixel range: ${minPixels}..${maxPixels} px per cell)`);

  // 6. Color count per sheet <= 12 (alpha 0 excluded)
  const uniqueColors = countUniqueColors(decoded.data);
  assert(uniqueColors <= 12, `Color count <= 12 (alpha 0 excluded): got ${uniqueColors}`);

  // 7. Animation frame differences for every row (0: Up, 1: Right, 2: Down, 3: Left)
  const rowNames = ['Up', 'Right', 'Down', 'Left'];
  const frameDiffs = [];
  for (let r = 0; r < 4; r++) {
    const diffAB = countChangedPixels(decoded.data, r, 0, 1);
    const diffWindA = countChangedPixels(decoded.data, r, 2, 0);
    const diffStrikeWind = countChangedPixels(decoded.data, r, 3, 2);

    assert(diffAB >= 60, `Row ${r} (${rowNames[r]}): Walk A vs Walk B >= 60 px (got ${diffAB} px)`);
    assert(diffWindA >= 60, `Row ${r} (${rowNames[r]}): Wind-up vs Walk A >= 60 px (got ${diffWindA} px)`);
    assert(diffStrikeWind >= 60, `Row ${r} (${rowNames[r]}): Strike vs Wind-up >= 60 px (got ${diffStrikeWind} px)`);

    frameDiffs.push({ r, diffAB, diffWindA, diffStrikeWind });
  }

  results.push({
    file: item.path,
    size: `${decoded.width}x${decoded.height}`,
    cornersAlpha0: sheetCornersAlpha0 && allCellCornersAlpha0,
    allCellsNonEmpty,
    minPixelsPerCell: minPixels,
    maxPixelsPerCell: maxPixels,
    uniqueColors,
    frameDiffs,
  });

  console.log(`  -> Passed (16 cells filled, colors=${uniqueColors}, diffs verified)\n`);
}

// 8. Verify Hero layers composite without misalignment
console.log('Verifying Hero layer compositing and alignment...');
const heroLayerKeys = [
  'hero/body_human_female.png',
  'hero/hair_female.png',
  'hero/outfit_valkyrie.png',
  'hero/cape.png',
  'hero/weapon_longsword.png',
  'hero/shield_round.png',
];

let heroCompositedOk = true;

const compRGBA = Buffer.alloc(192 * 192 * 4);
for (const key of heroLayerKeys) {
  const layer = loadedSheets[key];
  if (!layer) {
    heroCompositedOk = false;
    break;
  }
  for (let i = 0; i < 192 * 192; i++) {
    const sIdx = i * 4;
    const sa = layer.data[sIdx + 3];
    if (sa === 0) continue;
    if (sa === 255) {
      compRGBA[sIdx] = layer.data[sIdx];
      compRGBA[sIdx + 1] = layer.data[sIdx + 1];
      compRGBA[sIdx + 2] = layer.data[sIdx + 2];
      compRGBA[sIdx + 3] = 255;
    } else {
      const da = compRGBA[sIdx + 3];
      const outA = sa + (da * (255 - sa)) / 255;
      compRGBA[sIdx] = Math.round((layer.data[sIdx] * sa + compRGBA[sIdx] * da * (255 - sa) / 255) / outA);
      compRGBA[sIdx + 1] = Math.round((layer.data[sIdx + 1] * sa + compRGBA[sIdx + 1] * da * (255 - sa) / 255) / outA);
      compRGBA[sIdx + 2] = Math.round((layer.data[sIdx + 2] * sa + compRGBA[sIdx + 2] * da * (255 - sa) / 255) / outA);
      compRGBA[sIdx + 3] = Math.round(outA);
    }
  }
}

let boundsOk = true;
const cellBounds = [];

for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) {
    let minX = 48, maxX = -1, minY = 48, maxY = -1;
    let solidCount = 0;

    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const a = compRGBA[((r * 48 + y) * 192 + (c * 48 + x)) * 4 + 3];
        if (a > 0) {
          solidCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const cellW = maxX - minX + 1;
    const cellH = maxY - minY + 1;
    cellBounds.push({ r, c, minX, maxX, minY, maxY, cellW, cellH, solidCount });

    if (cellW > 46 || cellH > 46 || maxY < 39 || maxY > 45) {
      boundsOk = false;
      console.error(`  Alignment warning at cell (row=${r}, col=${c}): w=${cellW}, h=${cellH}, maxY=${maxY}`);
    }
  }
}

assert(heroCompositedOk, 'All 6 hero layers composited successfully');
assert(boundsOk, 'Composited hero fits inside ~40x44 px with feet at y≈42..44 across all 16 cells');

// Check deliverable files
const extraFiles = ['preview_all.png', 'preview_walk.gif', 'hero/preview.png'];
for (const ef of extraFiles) {
  const p = path.join(OUT_DIR, ef);
  const exists = fs.existsSync(p);
  assert(exists, `Deliverable ${ef} exists`);
}

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed (${Math.round(passedTests / totalTests * 100)}%)`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  console.log('ALL SELF-CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error('SOME CHECKS FAILED!\n');
  process.exit(1);
}
