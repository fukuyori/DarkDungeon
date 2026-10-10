> DarkDungeon: the generated sheets are stored in `sprites/hero` and `sprites/monster`. The scripts here write to `out/`; run `node tools/sprites/generate.js` from a working folder and copy the hero and monster PNG sheets (not the previews) into `sprites/`.

# NetHack Complete Sprite Set (1980s Arcade Fantasy Maze Game Style)

An original complete set of 1980s arcade fantasy maze game style pixel-art sprites created for a NetHack-based dungeon crawler. Designed with chunky top-down 3/4 perspective, bold dark outlines (`#1a1414`), top-left directional lighting, strictly limited arcade palettes (at most 12 colors per sheet), flat color and shadow shading, readable shapes, and hard pixel edges (nearest-neighbour, zero anti-aliasing halos).

---

## 1. License & Confirmation of Originality

- **License**: All sprites, artwork, and generation scripts in this project are published and distributed under the **NetHack General Public License**.
- **100% Original Work**: Every sprite sheet, pixel coordinate, palette definition, and animation frame in this set was newly designed and generated from scratch.
- **Zero Third-Party Artwork**: No assets were copied, traced, or imitated from any existing commercial game, company, character, or external source.
- **No External Image-Generation AI Models**: All assets were generated deterministically via original procedural pixel-art algorithms implemented in pure Node.js scripts located in `out/tools/`. Standard libraries only; zero npm dependencies.
- **Name Check**: Verified clean against `forbidden-words.txt` via `node check-names.js` (0 forbidden words).

---

## 2. File Manifest (101 Sprite Sheets)

All assets are located under `./out/`:

```
out/
├── hero/                          # 40 Hero Layer Sheets (192x192 PNG RGBA)
│   ├── body_<race>_<gender>.png   # 10 Bodies: human, elf, dwarf, gnome, orc x male, female
│   ├── hair_male.png              # Neat arcade cropped hair for male heroes
│   ├── hair_female.png            # Flowing golden hair for female heroes
│   ├── outfit_<role>.png          # 13 Role Outfits (archeologist, barbarian, caveman, healer,
│   │                              #   knight, monk, priest, ranger, rogue, samurai, tourist,
│   │                              #   valkyrie, wizard)
│   ├── cape.png                   # Gray neutral cape (tinted dynamically by alignment)
│   ├── weapon_<role>.png          # 13 Role Weapons (pick-axe, two-handed sword, club, scalpel,
│   │                              #   knight long sword, fists, mace, bow, short sword, katana,
│   │                              #   darts, valkyrie long sword, quarterstaff)
│   ├── shield_valkyrie.png        # Round off-hand shield for Valkyrie role
│   └── preview.png                # Composited preview of all 13 roles on human male & female
├── monster/                       # 61 Monster Sheets (192x192 PNG RGBA)
│   ├── dog.png                    # Species: Loyal Pet Dog (warm caramel coat, collar, bite)
│   ├── jackal.png                 # Species: Feral Jackal (sandy ochre, upright ears, pounce)
│   ├── newt.png                   # Species: Salamander Newt (yellow spots, crawling crawl)
│   ├── gnome.png                  # Species: Dungeon Gnome (conical red cap, beard, pickaxe)
│   └── class_<name>.png           # 57 Monster Class Sheets in neutral gray (saturation 0):
│                                  #   ant, blob, cockatrice, dog, eye, feline, gremlin, humanoid,
│                                  #   imp, jelly, kobold, leprechaun, mimic, nymph, orc, piercer,
│                                  #   quadruped, rodent, spider, trapper, unicorn, vortex, worm,
│                                  #   xan, light, zruty, angel, bat, centaur, dragon, elemental,
│                                  #   fungus, gnome, giant, jabberwock, kop, lich, mummy, naga,
│                                  #   ogre, pudding, quantmech, rustmonst, snake, troll, umber,
│                                  #   vampire, wraith, xorn, yeti, zombie, human, ghost, golem,
│                                  #   demon, eel, lizard
├── tools/                         # Pure Node.js Generator & Verification Tooling
│   ├── canvas.js                  # Pixel canvas with primitives, outlines, tinting, scaling
│   ├── font.js                    # Retro arcade bitmap font renderer
│   ├── gif.js                     # GIF89a LZW encoder with transparency
│   ├── palette.js                 # 1980s arcade palettes, outline constant (#1a1414), tint tables
│   ├── png.js                     # Pure Node.js RGBA PNG codec (zlib IDAT + CRC32)
│   ├── generate.js                # Master asset generation script (generates all 101 sheets)
│   ├── verify.js                  # Verification test suite (1981 automated assertions)
│   └── sprites/
│       ├── hero.js                # Master hero aggregator and compositor
│       ├── hero_bodies.js         # 10 race/gender body generators
│       ├── hero_hair.js           # Male and female hair generators
│       ├── hero_outfits.js        # 13 role costume generators
│       ├── hero_cape.js           # Neutral gray cape generator
│       ├── hero_weapons.js        # 13 role weapon generators
│       ├── hero_shield.js         # Valkyrie round shield generator
│       ├── dog.js                 # Pet dog species generator
│       ├── jackal.js              # Jackal species generator
│       ├── newt.js                # Newt species generator
│       ├── gnome.js               # Gnome species generator
│       └── monsters/
│           ├── base.js            # Monster class base framework & kinematics helper
│           ├── animals.js         # 9 animal classes (ant, dog, feline, rodent, etc.)
│           ├── humanoids.js       # 13 humanoid classes (humanoid, orc, giant, etc.)
│           ├── undead.js          # 6 undead classes (lich, mummy, vampire, etc.)
│           ├── mythic.js          # 8 mythic classes (dragon, centaur, demon, etc.)
│           ├── aberrant.js        # 21 aberrant classes (blob, eye, vortex, etc.)
│           └── index.js           # Master index of all 57 class generators
├── preview_all.png                # All 101 sheets labeled side by side on #808080 background
├── preview_walk.gif               # Animated preview (~6 fps) of hero and monsters facing down
└── README.md                      # Documentation and self-check report
```

---

## 3. Format & Specifications

- **Dimensions**: Exactly 192x192 px per sheet (4x4 layout of 48x48 px cells).
- **Color Depth**: 32-bit RGBA (8 bits per channel), alpha 0 transparent background, no semi-transparent halos.
- **Palette Constraint**: At most 12 colors per sheet (excluding alpha 0 transparent pixels).
- **Character Fitting**: Every character cell stays within the 48x48 cell bounds with corners alpha 0.
- **Hero Footprint**: All 10 bodies share the exact same joint, neck, and footprint coordinates. Across all 130 composite combinations, feet remain strictly at $y \in [42, 44]$.
- **Monster Class Saturation**: Main body pixels of all 57 class sheets are drawn in neutral gray (saturation 0: $R = G = B$) with at least 3 distinct gray levels from light to dark so tinting retains shading. Colored pixels are used only for small fixed accents (eyes, teeth, magic sparks).
- **Sheet Grid Layout**:
  - **Rows (Directions)**:
    - Row 0: Facing Up (away from viewer)
    - Row 1: Facing Right
    - Row 2: Facing Down (towards viewer)
    - Row 3: Facing Left
  - **Columns (Animation Frames)**:
    - Column 0: Walk frame A (idle frame)
    - Column 1: Walk frame B
    - Column 2: Attack wind-up
    - Column 3: Attack strike
- **Kinematic Differences**: In every row of every sheet:
  - Walk A vs Walk B $\ge 60$ changed pixels
  - Wind-up vs Walk A $\ge 60$ changed pixels
  - Strike vs Wind-up $\ge 60$ changed pixels

---

## 4. Hero Layer Order & Compositing

Hero layers composite in the exact back-to-front order below:

$$\text{Body} \longrightarrow \text{Hair} \longrightarrow \text{Outfit} \longrightarrow \text{Cape} \longrightarrow \text{Weapon} \longrightarrow \text{Shield (optional)}$$

1. **Body (`out/hero/body_<race>_<gender>.png`)**:
   - 10 variations (human, elf, dwarf, gnome, orc x male, female).
   - Identical footprint, neck, and joint anchors across all 10 bodies.
   - Distinct racial features: Elf has pointed ears; Dwarf has stocky build and male body-layer beard; Gnome has large bulbous nose; Orc has green-gray skin tone and lower tusks.
2. **Hair (`out/hero/hair_<gender>.png`)**:
   - `hair_female.png`: Approved flowing golden Valkyrie hair.
   - `hair_male.png`: Clean 1980s arcade cropped haircut fitted to all 5 male bodies.
3. **Outfit (`out/hero/outfit_<role>.png`)**:
   - 13 distinct role costumes:
     - `archeologist`: Leather jacket, khaki trousers, fedora hat.
     - `barbarian`: Fur-lined harness, hide kilt, bare muscular arms.
     - `caveman`: Primitive animal-hide tunic with bone necklace.
     - `healer`: Clean white medical robe with emerald-green trim.
     - `knight`: Polished steel plate cuirass, shoulder pauldrons, red helm plume.
     - `monk`: Clean white martial arts gi with dark black belt and red headband.
     - `priest`: Royal purple ceremonial vestments with golden trim and mitre.
     - `ranger`: Hooded forest-green leather tunic with quiver harness.
     - `rogue`: Dark stealth leather armor with shinobi face mask.
     - `samurai`: Traditional laced lamellar armor with kabuto crest.
     - `tourist`: Loud tropical hawaiian floral shirt and sun hat.
     - `valkyrie`: Chainmail hauberk with horned skullcap and steel greaves.
     - `wizard`: Blue wizard robe with celestial crescent and tall pointed hat.
4. **Cape (`out/hero/cape.png`)**:
   - Gray neutral cape draped from pauldrons with dark outline; tintable in-game by alignment.
5. **Weapon (`out/hero/weapon_<role>.png`)**:
   - 13 role weapons: archeologist pick-axe, barbarian two-handed greatsword, caveman heavy club, healer scalpel, knight longsword, monk bare fists, priest spiked mace, ranger recurve bow, rogue shortsword, samurai katana, tourist darts, valkyrie longsword (`weapon_valkyrie.png`), wizard quarterstaff.
6. **Shield (`out/hero/shield_valkyrie.png`)**:
   - Round off-hand shield for the Valkyrie role.

---

## 5. How to Regenerate and Verify All Assets

The generator and verification suite require only standard Node.js (no external dependencies):

```bash
# 1. Regenerate all 101 sprite sheets and deliverable preview composites:
node out/tools/generate.js

# 2. Run the automated verification test suite:
node out/tools/verify.js

# 3. Verify absence of forbidden commercial names:
node check-names.js
```

---

## 6. Self-Check Verification Results

The automated test script `out/tools/verify.js` was executed across all deliverable sheets against all project requirements.

### Test Results Summary

- **Total Sheets Checked**: 101 sheets (40 Hero, 4 Monster Species, 57 Monster Classes)
- **Dimensions (192x192)**: 101 / 101 PASS
- **Format (8-bit RGBA)**: 101 / 101 PASS
- **Corners Alpha 0 (Sheet & All 16 Cells)**: 101 / 101 PASS
- **Non-Empty Cells (16 / 16 cells)**: 101 / 101 PASS
- **Palette Constraint ($\le 12$ colors)**: 101 / 101 PASS (sheets average 5–8 colors)
- **Kinematic Differences ($\ge 60$ px in all 4 rows)**: 101 / 101 PASS (all rows exceed 60 px)
- **Monster Class Neutral Gray (Saturation 0, $\ge 3$ gray levels)**: 57 / 57 PASS
- **Hero Compositing (All 130 Combinations)**: 130 / 130 PASS
  - 10 bodies $\times$ 13 roles $\times$ gender hair $\times$ cape $\times$ role weapon $\times$ shield
  - All 130 combinations stay within the 48x48 cell bounds with cell corners alpha 0
  - Feet strictly grounded at $y \in [42, 44]$ across all 16 frames/directions (0 errors)
- **Deliverables Existence**:
  - `out/preview_all.png`: PASS (2096x2524 px, all 101 sheets labeled on `#808080` background)
  - `out/hero/preview.png`: PASS (1656x3048 px, all 13 roles on human male and female at 2x scale)
  - `out/preview_walk.gif`: PASS (animated walk/attack loop of hero and monsters facing down)
  - `out/README.md`: PASS
- **Check-Names Verification**: PASS (`node check-names.js` clean, 0 forbidden words)

**Overall Verification Suite Result**: **1981 / 1981 assertions passed (100%)**.
