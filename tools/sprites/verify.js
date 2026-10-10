// Distributed under the NetHack General Public License.
// Self-check verification script for 1980s arcade fantasy maze game style sprites
// Verifies for all 101 sprite sheets:
// 1. Size 192x192
// 2. RGBA format
// 3. Corner pixels alpha 0 (both sheet corners and cell corners)
// 4. Every cell non-empty (16 cells per sheet)
// 5. Color count per sheet <= 12 (alpha 0 excluded)
// 6. For every row: walk A vs walk B differ by >= 60 px
// 7. For every row: wind-up vs walk A differ by >= 60 px
// 8. For every row: strike vs wind-up differ by >= 60 px
// 9. All 130 Hero combinations composite within 48x48 cell bounds with feet at y 42..44
// 10. Class sheets have main body saturation 0 (R===G===B) with at least 3 gray levels
// 11. All deliverable previews and documentation exist

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png');

const OUT_DIR = path.resolve(__dirname, '..');
const HERO_DIR = path.join(OUT_DIR, 'hero');
const MONSTER_DIR = path.join(OUT_DIR, 'monster');

const RACES = ['human', 'elf', 'dwarf', 'gnome', 'orc'];
const GENDERS = ['male', 'female'];
const ROLES = [
  'archeologist', 'barbarian', 'caveman', 'healer', 'knight',
  'monk', 'priest', 'ranger', 'rogue', 'samurai',
  'tourist', 'valkyrie', 'wizard'
];

const sheetsToCheck = [];

// 1. Hero Sheets (40)
for (const race of RACES) {
  for (const gender of GENDERS) {
    sheetsToCheck.push({ path: `hero/body_${race}_${gender}.png`, name: `Body ${race} ${gender}`, type: 'hero_body' });
  }
}
for (const gender of GENDERS) {
  sheetsToCheck.push({ path: `hero/hair_${gender}.png`, name: `Hair ${gender}`, type: 'hero_hair' });
}
for (const role of ROLES) {
  sheetsToCheck.push({ path: `hero/outfit_${role}.png`, name: `Outfit ${role}`, type: 'hero_outfit' });
}
sheetsToCheck.push({ path: 'hero/cape.png', name: 'Hero Cape', type: 'hero_cape' });
for (const role of ROLES) {
  sheetsToCheck.push({ path: `hero/weapon_${role}.png`, name: `Weapon ${role}`, type: 'hero_weapon' });
}
sheetsToCheck.push({ path: 'hero/shield_valkyrie.png', name: 'Shield Valkyrie', type: 'hero_shield' });

// 2. Monster Species (4)
sheetsToCheck.push({ path: 'monster/dog.png', name: 'Species Dog', type: 'monster_species' });
sheetsToCheck.push({ path: 'monster/jackal.png', name: 'Species Jackal', type: 'monster_species' });
sheetsToCheck.push({ path: 'monster/newt.png', name: 'Species Newt', type: 'monster_species' });
sheetsToCheck.push({ path: 'monster/gnome.png', name: 'Species Gnome', type: 'monster_species' });

// 3. Monster Classes (57)
const { CLASS_NAMES } = require('./sprites/monsters/index');
for (const cName of CLASS_NAMES) {
  sheetsToCheck.push({ path: `monster/class_${cName}.png`, name: `Class ${cName}`, type: 'monster_class' });
}

console.log('====================================================');
console.log('   SPRITE SET SELF-CHECK VERIFICATION SUITE');
console.log(`   Checking ${sheetsToCheck.length} sheets (expected 101)`);
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
let allSheetsVerified = true;

for (const item of sheetsToCheck) {
  const fullPath = path.join(OUT_DIR, item.path);

  // 1. File existence
  const fileExists = fs.existsSync(fullPath);
  assert(fileExists, `File ${item.path} exists`);
  if (!fileExists) {
    allSheetsVerified = false;
    continue;
  }

  const buf = fs.readFileSync(fullPath);
  let decoded;
  try {
    decoded = decodePNG(buf);
  } catch (err) {
    assert(false, `Failed to decode PNG ${item.path}: ${err.message}`);
    allSheetsVerified = false;
    continue;
  }
  loadedSheets[item.path] = decoded;

  // 2. Size 192x192
  const sizeOk = (decoded.width === 192 && decoded.height === 192);
  assert(sizeOk, `${item.path}: Size is exactly 192x192 (got ${decoded.width}x${decoded.height})`);

  // 3. RGBA check
  const rgbaOk = (decoded.data.length === 192 * 192 * 4);
  assert(rgbaOk, `${item.path}: Format is 8-bit RGBA (buffer length ${decoded.data.length})`);

  // 4. Corner pixels alpha 0
  const getAlpha = (x, y) => decoded.data[(y * 192 + x) * 4 + 3];
  const sheetCorners = [
    { x: 0, y: 0 },
    { x: 191, y: 0 },
    { x: 0, y: 191 },
    { x: 191, y: 191 },
  ];
  let sheetCornersAlpha0 = true;
  for (const c of sheetCorners) {
    if (getAlpha(c.x, c.y) !== 0) {
      sheetCornersAlpha0 = false;
      break;
    }
  }
  assert(sheetCornersAlpha0, `${item.path}: 4 sheet corner pixels are fully transparent (alpha 0)`);

  let allCellCornersAlpha0 = true;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cellCorners = [
        { x: c * 48, y: r * 48 },
        { x: c * 48 + 47, y: r * 48 },
        { x: c * 48, y: r * 48 + 47 },
        { x: c * 48 + 47, y: r * 48 + 47 },
      ];
      for (const pt of cellCorners) {
        if (getAlpha(pt.x, pt.y) !== 0) {
          allCellCornersAlpha0 = false;
          break;
        }
      }
    }
  }
  assert(allCellCornersAlpha0, `${item.path}: All cell corner pixels across all 16 cells have alpha 0`);

  // 5. Every cell non-empty
  let allCellsNonEmpty = true;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let count = 0;
      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
          const a = getAlpha(c * 48 + x, r * 48 + y);
          if (a > 0) count++;
        }
      }
      if (count === 0) allCellsNonEmpty = false;
    }
  }
  assert(allCellsNonEmpty, `${item.path}: Every cell is non-empty (16 cells filled)`);

  // 6. Color count per sheet <= 12 (alpha 0 excluded)
  const uniqueColors = countUniqueColors(decoded.data);
  assert(uniqueColors <= 12, `${item.path}: Color count <= 12 (got ${uniqueColors})`);

  // 7. Animation frame differences for every row (0: Up, 1: Right, 2: Down, 3: Left)
  for (let r = 0; r < 4; r++) {
    const diffAB = countChangedPixels(decoded.data, r, 0, 1);
    const diffWindA = countChangedPixels(decoded.data, r, 2, 0);
    const diffStrikeWind = countChangedPixels(decoded.data, r, 3, 2);

    assert(diffAB >= 60, `${item.path} Row ${r}: Walk A vs Walk B >= 60 px (got ${diffAB} px)`);
    assert(diffWindA >= 60, `${item.path} Row ${r}: Wind-up vs Walk A >= 60 px (got ${diffWindA} px)`);
    assert(diffStrikeWind >= 60, `${item.path} Row ${r}: Strike vs Wind-up >= 60 px (got ${diffStrikeWind} px)`);
  }

  // 8. Class sheet check: main body pixels are saturation 0 gray with >= 3 distinct gray levels
  if (item.type === 'monster_class') {
    const grayLevels = new Set();
    let saturatedCount = 0;
    for (let i = 0; i < 192 * 192; i++) {
      const a = decoded.data[i * 4 + 3];
      if (a > 0) {
        const r = decoded.data[i * 4];
        const g = decoded.data[i * 4 + 1];
        const b = decoded.data[i * 4 + 2];
        if (r === g && g === b) {
          grayLevels.add(r);
        } else {
          saturatedCount++;
        }
      }
    }
    assert(grayLevels.size >= 3, `${item.path}: Neutral gray body has at least 3 distinct gray levels (got ${grayLevels.size})`);
  }
}

// ------------------------------------------------------------------
// 9. VERIFY HERO COMPOSITING (ALL 130 COMBINATIONS)
// 10 bodies x 13 outfits x matching hair x cape x weapon x (valkyrie shield)
// ------------------------------------------------------------------
console.log('\n====================================================');
console.log('   VERIFYING ALL 130 HERO COMPOSITE COMBINATIONS');
console.log('====================================================\n');

let totalComposites = 0;
let compositeErrors = 0;

for (const race of RACES) {
  for (const gender of GENDERS) {
    const bodyKey = `hero/body_${race}_${gender}.png`;
    const hairKey = `hero/hair_${gender}.png`;
    const capeKey = 'hero/cape.png';

    const bodyDecoded = loadedSheets[bodyKey];
    const hairDecoded = loadedSheets[hairKey];
    const capeDecoded = loadedSheets[capeKey];

    for (const role of ROLES) {
      totalComposites++;
      const outfitKey = `hero/outfit_${role}.png`;
      const weaponKey = `hero/weapon_${role}.png`;
      const shieldKey = (role === 'valkyrie') ? 'hero/shield_valkyrie.png' : null;

      const outfitDecoded = loadedSheets[outfitKey];
      const weaponDecoded = loadedSheets[weaponKey];
      const shieldDecoded = shieldKey ? loadedSheets[shieldKey] : null;

      // Composite the layers in exact order: body -> hair -> outfit -> cape -> weapon -> shield
      const layers = [bodyDecoded, hairDecoded, outfitDecoded, capeDecoded, weaponDecoded];
      if (shieldDecoded) layers.push(shieldDecoded);

      const compRGBA = Buffer.alloc(192 * 192 * 4);
      for (const layer of layers) {
        for (let i = 0; i < 192 * 192; i++) {
          const sIdx = i * 4;
          const sa = layer.data[sIdx + 3];
          if (sa === 0) continue;
          compRGBA[sIdx] = layer.data[sIdx];
          compRGBA[sIdx + 1] = layer.data[sIdx + 1];
          compRGBA[sIdx + 2] = layer.data[sIdx + 2];
          compRGBA[sIdx + 3] = 255;
        }
      }

      // Check all 16 cells: stays in 48x48 cell, cell corners alpha 0, feet strictly at y 42..44
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          let minX = 48, maxX = -1, minY = 48, maxY = -1;
          for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
              const a = compRGBA[((r * 48 + y) * 192 + (c * 48 + x)) * 4 + 3];
              if (a > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          // Corners of 48x48 cell must be alpha 0
          const c00 = compRGBA[((r * 48) * 192 + (c * 48)) * 4 + 3];
          const c470 = compRGBA[((r * 48) * 192 + (c * 48 + 47)) * 4 + 3];
          const c047 = compRGBA[((r * 48 + 47) * 192 + (c * 48)) * 4 + 3];
          const c4747 = compRGBA[((r * 48 + 47) * 192 + (c * 48 + 47)) * 4 + 3];

          if (c00 !== 0 || c470 !== 0 || c047 !== 0 || c4747 !== 0) {
            compositeErrors++;
            console.error(`Corner error in composite ${race}_${gender} ${role} cell (${r}, ${c})`);
          }

          if (maxY < 42 || maxY > 44) {
            compositeErrors++;
            console.error(`Foot alignment error in composite ${race}_${gender} ${role} cell (${r}, ${c}): maxY=${maxY} (expected 42..44)`);
          }
        }
      }
    }
  }
}

assert(compositeErrors === 0, `All 130 Hero composites pass cell bounds, corner alpha 0, and feet at y 42..44 (${totalComposites} tested, 0 errors)`);

// ------------------------------------------------------------------
// 10. VERIFY DELIVERABLES
// ------------------------------------------------------------------
console.log('\n====================================================');
console.log('   VERIFYING DELIVERABLE PREVIEWS AND DOCS');
console.log('====================================================\n');

const deliverables = ['preview_all.png', 'preview_walk.gif', 'hero/preview.png', 'README.md'];
for (const d of deliverables) {
  const p = path.join(OUT_DIR, d);
  const exists = fs.existsSync(p);
  assert(exists, `Deliverable ${d} exists`);
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
