> DarkDungeon: the generated sheets are stored in `sprites/hero` and `sprites/monster`. The scripts here write to `out/`; run `node tools/sprites/generate.js` from a working folder and copy the hero and monster PNG sheets (not the previews) into `sprites/`.

# NetHack Pilot Sprite Set (1980s Arcade Fantasy Maze Game Style)

An original set of 1980s arcade fantasy maze game style pixel-art sprites created for a NetHack-based dungeon crawler. Designed with chunky top-down 3/4 perspective, bold dark outlines (`#1a1414`), top-left directional lighting, strictly limited arcade palettes (at most 12 colors per sheet), flat color and shadow shading, readable shapes, and hard pixel edges (nearest-neighbour, zero anti-aliasing halos).

---

## 1. License & Confirmation of Originality

- **License**: All sprites, artwork, and generation scripts in this project are published and distributed under the **NetHack General Public License**.
- **100% Original Work**: Every sprite sheet, pixel coordinate, palette definition, and animation frame in this set was newly designed and generated from scratch.
- **Zero Third-Party Artwork**: No assets were copied, traced, or imitated from any existing commercial game, company, character, or external source.
- **No External Image-Generation AI Models**: All assets were generated deterministically via original procedural pixel-art algorithms implemented in pure Node.js scripts located in `out/tools/`. There are no external model licenses, terms, or proprietary training weights involved.

---

## 2. File Manifest

All assets are located under `./out/`:

```
out/
├── hero/
│   ├── body_human_female.png   # Hero Layer 1: Body, skin, open face, limbs (192x192, 10 colors)
│   ├── hair_female.png         # Hero Layer 2: Golden flowing Valkyrie hair (192x192, 4 colors)
│   ├── outfit_valkyrie.png     # Hero Layer 3: Horned helmet, mail cuirass, greaves (192x192, 11 colors)
│   ├── cape.png                # Hero Layer 4: Cape in neutral grays with dark outline (192x192, 5 colors)
│   ├── weapon_longsword.png    # Hero Layer 5: Longsword with visible swings and slash arc (192x192, 7 colors)
│   ├── shield_round.png        # Hero Layer 6: Round off-hand shield with rim and boss (192x192, 11 colors)
│   └── preview.png             # Composited hero at 4x scale with alignment tints (1632x1720)
├── monster/
│   ├── dog.png                 # Pet Dog: 4x4 sheet, distinct head/collar/tail, bite attack (192x192, 10 colors)
│   ├── newt.png                # Monster Newt (Lizard class ':'): yellow hue family, crawling stride (192x192, 9 colors)
│   ├── jackal.png              # Monster Jackal (Canine class 'd'): feral sandy ochre, real steps (192x192, 10 colors)
│   └── gnome.png               # Monster Gnome (Gnome class 'G'): moss tunic & pickaxe, real steps (192x192, 12 colors)
├── tools/
│   ├── canvas.js               # Pixel canvas with primitives, outlines, tinting, scaling
│   ├── font.js                 # 5x7 retro arcade bitmap font renderer
│   ├── gif.js                  # Pure Node.js GIF89a LZW encoder with transparency
│   ├── palette.js              # 1980s arcade palettes, outline constant (#1a1414), tint tables
│   ├── png.js                  # Pure Node.js RGBA PNG codec (zlib IDAT + CRC32)
│   ├── generate.js             # Master asset generation script
│   ├── verify.js               # Automated self-check verification test suite
│   └── sprites/
│       ├── dog.js              # Pet dog generator
│       ├── gnome.js            # Gnome monster generator
│       ├── hero.js             # Hero Valkyrie layered generator
│       ├── jackal.js           # Jackal monster generator
│       └── newt.js             # Newt monster generator
├── preview_all.png             # All sheets side by side at 3x scale on #808080 background
├── preview_walk.gif            # Animated preview (~6 fps) of hero and monsters facing down
└── README.md                   # Documentation and self-check report
```

---

## 3. Format & Specifications

- **Dimensions**: Exactly 192x192 px per sheet (4x4 layout of 48x48 px cells).
- **Color Depth**: 32-bit RGBA (8 bits per channel), alpha 0 transparent background, no semi-transparent halos.
- **Palette Constraint**: At most 12 colors per sheet (excluding alpha 0 transparent pixels).
- **Character Fitting**: Characters fit within roughly 40x44 px inside each 48x48 cell, with feet planted at $y \approx 42\text{--}44$.
- **Corner Pixels**: Alpha 0 at all sheet corners and cell boundaries.
- **Lighting & Edge**: Consistent top-left directional lighting and bold dark outline `#1a1414` across all sheets.
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
- **Kinematic Differences**: In every row of every sheet, Walk A vs Walk B, Wind-up vs Walk A, and Strike vs Wind-up each differ by at least 60 changed pixels.

---

## 4. Hero Layer Order & Alignment

The pilot hero is a human female Valkyrie. Compositing the sheets in the exact back-to-front order below creates the full character:

1. **`out/hero/body_human_female.png`** (Layer 1):
   - Skin, open face, large eyes with white glints, mouth, ears, neck, limbs, and plain linen undergarment. Alternating arm swings and leg strides in all directions with 1 px vertical bob.
2. **`out/hero/hair_female.png`** (Layer 2):
   - Golden blonde hair cascading past shoulders and framing the cheeks without obstructing the face or eyes.
3. **`out/hero/outfit_valkyrie.png`** (Layer 3):
   - Valkyrie armor: iconic ivory horns curving outward and upward from skullcap, brass brow plate sitting above the eyes, chainmail hauberk with ruby buckle, armored pauldrons, and steel greaves.
4. **`out/hero/cape.png`** (Layer 4):
   - Flowing cape drawn in neutral grays (`#f0f0f0`, `#c0c0c0`, `#606060`, `#303030`) with a bold dark outline (`#1a1414`) that reads clearly against mid-gray (`#808080`) dungeon floors.
5. **`out/hero/weapon_longsword.png`** (Layer 5):
   - Steel longsword held in hand; visibly swings across walking frames, raises high on wind-up, and delivers a slashing kinetic arc on strike.
6. **`out/hero/shield_round.png`** (Layer 6):
   - Round off-hand shield with steel rim, dark enamel face, and central golden boss; guards high on wind-up and braces on strike.

### Cape Alignment Tinting

Because `cape.png` is drawn exclusively using neutral grays, it can be dynamically tinted in-game based on the Valkyrie's alignment:
- **Lawful**: Sapphire Blue (`#98c4ff`, `#3c78e8`, `#1c449c`, `#102458`)
- **Neutral**: Emerald Green (`#88f498`, `#2ca844`, `#146c24`, `#0c3c14`)
- **Chaotic**: Crimson Red (`#ff9494`, `#dc2c2c`, `#941414`, `#540c0c`)

The composite preview at `out/hero/preview.png` displays all four variations side by side at 4x nearest-neighbor scale for visual inspection.

---

## 5. Pet and Monster Designs

1. **Pet Dog (`out/monster/dog.png`)**:
   - A sturdy, loyal dungeon pet dog with a warm caramel coat, white chest blaze, floppy ears, wagging tail with white tip, red collar with golden pendant, and black nose. Facing up clearly defines head crown, floppy ears, red collar, dorsal spine shading, and upright wagging tail. Attack frame 3 features a wide-open jaw snap with sharp white teeth and pink tongue.
2. **Newt (`out/monster/newt.png`)**:
   - NetHack Lizards/Newts class (`:`). Splayed 4-legged salamander crawl with distinct dorsal spots down spine, lateral bead eyes, constricted neck, and long undulating tail that waves dynamically across walk frames. Attack frame 3 features a lunging jaw snap with extended pink tongue.
3. **Jackal (`out/monster/jackal.png`)**:
   - NetHack Canine class (`d`). Distinct from the pet dog: leaner, feral anatomy, tall upright triangular ears, low bushy tail, and sandy tawny coat. Right and left walking rows feature real alternating foreleg and hindleg steps and body bobbing. Attack frame 3 delivers a savage pouncing bite with bared white fangs and deep throat.
4. **Gnome (`out/monster/gnome.png`)**:
   - NetHack Gnomes class (`G`). Short, stout Mines inhabitant with a conical crimson cap, bushy silver beard, sturdy leather boots, and an earthy moss-green tunic. Right and left walking rows feature real alternating boot steps, swinging pickaxe, and swaying beard. Attack frame 3 crashes the pickaxe down with an impact spark.

---

## 6. How to Regenerate All Assets

The generator requires only standard Node.js (v18+; no npm modules or external dependencies required):

```bash
# Regenerate all PNGs, GIF animation, and preview composites:
node out/tools/generate.js

# Run the automated verification test suite:
node out/tools/verify.js

# Verify absence of forbidden names (from outside out/):
node check-names.js
```

---

## 7. Self-Check Verification Results

The automated test script `out/tools/verify.js` was executed and checked every deliverable sheet against all project requirements.

### Test Results Summary

| Sheet Path | Dimensions | Channels | Corners $\alpha=0$ | Colors (excl $\alpha=0$) | Cell Range (px/cell) | Row Diffs $\ge 60$ px | Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `out/hero/body_human_female.png` | 192x192 | RGBA (8-bit) | PASS | 10 colors | 388 – 556 px | PASS (229–557 px) | **PASS** |
| `out/hero/hair_female.png` | 192x192 | RGBA (8-bit) | PASS | 4 colors | 222 – 385 px | PASS (83–278 px) | **PASS** |
| `out/hero/outfit_valkyrie.png` | 192x192 | RGBA (8-bit) | PASS | 11 colors | 295 – 499 px | PASS (197–381 px) | **PASS** |
| `out/hero/cape.png` | 192x192 | RGBA (8-bit) | PASS | 5 colors | 148 – 480 px | PASS (84–305 px) | **PASS** |
| `out/hero/weapon_longsword.png` | 192x192 | RGBA (8-bit) | PASS | 7 colors | 49 – 201 px | PASS (83–278 px) | **PASS** |
| `out/hero/shield_round.png` | 192x192 | RGBA (8-bit) | PASS | 11 colors | 97 – 151 px | PASS (93–258 px) | **PASS** |
| `out/monster/dog.png` | 192x192 | RGBA (8-bit) | PASS | 10 colors | 418 – 511 px | PASS (181–663 px) | **PASS** |
| `out/monster/newt.png` | 192x192 | RGBA (8-bit) | PASS | 9 colors | 361 – 451 px | PASS (290–553 px) | **PASS** |
| `out/monster/jackal.png` | 192x192 | RGBA (8-bit) | PASS | 10 colors | 367 – 480 px | PASS (166–627 px) | **PASS** |
| `out/monster/gnome.png` | 192x192 | RGBA (8-bit) | PASS | 12 colors | 426 – 560 px | PASS (241–673 px) | **PASS** |

### Hero Layer Compositing & Alignment Check

- **Layer Stacking**: Stacked in order `body` $\rightarrow$ `hair` $\rightarrow$ `outfit` $\rightarrow$ `cape` $\rightarrow$ `weapon` $\rightarrow$ `shield`.
- **Anatomical Alignment**: Horned helmet sits on crown above the brow; eyes and face remain fully uncovered and visible in facing down view; flowing hair frames head and shoulders; chainmail fits torso; cape drapes from pauldrons with dark outline; sword hand connects to weapon arm; shield clasps off-hand.
- **Cell Bounds**: Across all 16 frames/directions, the composited hero fits within roughly 40x44 px (maximum width 38 px, maximum height 40 px) with feet touching ground level at $y \approx 42\text{--}44$.
- **Edge Boundaries**: Cell boundary corners and sheet outer borders remain fully transparent ($\alpha = 0$).

### Deliverables Check

- `out/preview_all.png`: Verified (3624x1276 px, labeled sheets scaled 3x on `#808080` background).
- `out/preview_walk.gif`: Verified (840x230 px, 4-frame animation of 5 characters facing down at ~6 fps).
- `out/hero/preview.png`: Verified (1632x1720 px, 2x2 grid of composited hero at 4x scale with Lawful, Neutral, Chaotic, and Base Cape tints).

**Overall Suite Result**: **195 / 195 assertions passed (100%)**.
