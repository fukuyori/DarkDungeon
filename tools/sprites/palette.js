// Distributed under the NetHack General Public License.
// Color definitions, palettes, and tinting functions for 1980s arcade fantasy maze game style sprites

const OUTLINE = [0x1a, 0x14, 0x14, 255]; // Standard dark arcade outline across all sheets
const MONSTER_OUTLINE = [24, 24, 24, 255]; // Pure gray saturation 0 outline for monster class sheets

function hexToRgba(hex, alpha = 255) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b, alpha];
}

const Palettes = {
  outline: OUTLINE,
  monsterOutline: MONSTER_OUTLINE,

  // Hero Race Skin Tones
  skin: {
    highlight: hexToRgba('#ffe0d0'),
    mid: hexToRgba('#f4c090'),
    shadow: hexToRgba('#c88860'),
    deep: hexToRgba('#8a4a2a'),
  },

  skinElf: {
    highlight: hexToRgba('#fff4ec'),
    mid: hexToRgba('#fae4d8'),
    shadow: hexToRgba('#c89884'),
    deep: hexToRgba('#885c4a'),
  },

  skinDwarf: {
    highlight: hexToRgba('#ffd4a4'),
    mid: hexToRgba('#e4aa72'),
    shadow: hexToRgba('#b4743c'),
    deep: hexToRgba('#74401c'),
  },

  skinGnome: {
    highlight: hexToRgba('#ffd8b0'),
    mid: hexToRgba('#f2b484'),
    shadow: hexToRgba('#bc7c50'),
    deep: hexToRgba('#7c3c1c'),
  },

  skinOrc: {
    highlight: hexToRgba('#acbe94'),
    mid: hexToRgba('#849670'),
    shadow: hexToRgba('#566642'),
    deep: hexToRgba('#344226'),
  },

  undergarment: {
    highlight: hexToRgba('#fdfbf7'),
    mid: hexToRgba('#eee4d4'),
    shadow: hexToRgba('#b4a898'),
  },

  hair: {
    highlight: hexToRgba('#ffec60'),
    mid: hexToRgba('#f4c020'),
    shadow: hexToRgba('#b87810'),
    deep: hexToRgba('#784400'),
  },

  // Dwarf male beard
  beardDwarf: {
    hi: hexToRgba('#f0f0f0'),
    mid: hexToRgba('#b8b8b8'),
    shadow: hexToRgba('#707070'),
    deep: hexToRgba('#383838'),
  },

  // Orc tusks
  tusks: {
    hi: hexToRgba('#fffff0'),
    mid: hexToRgba('#e0dec8'),
    shadow: hexToRgba('#a09e88'),
  },

  // Hero Outfits
  valkyrieArmor: {
    steelHi: hexToRgba('#e0ecf8'),
    steelMid: hexToRgba('#90a4b8'),
    steelShadow: hexToRgba('#506478'),

    brassHi: hexToRgba('#ffe050'),
    brassMid: hexToRgba('#d8a018'),
    brassShadow: hexToRgba('#886008'),

    hornHi: hexToRgba('#fff4d8'),
    hornMid: hexToRgba('#d8c8a8'),
    hornShadow: hexToRgba('#908064'),

    ruby: hexToRgba('#d82020'),
  },

  outfitArcheologist: {
    hatHi: hexToRgba('#b88048'),
    hatMid: hexToRgba('#8a582c'),
    hatShadow: hexToRgba('#543214'),
    hatBand: hexToRgba('#2c1c0c'),
    jacketHi: hexToRgba('#c4985c'),
    jacketMid: hexToRgba('#9c723c'),
    jacketShadow: hexToRgba('#60441e'),
    shirt: hexToRgba('#f2ece0'),
    belt: hexToRgba('#4c2c14'),
    buckle: hexToRgba('#e8c030'),
    boots: hexToRgba('#5c381c'),
  },

  outfitBarbarian: {
    furHi: hexToRgba('#e8e2d4'),
    furMid: hexToRgba('#b8aca0'),
    furShadow: hexToRgba('#74685c'),
    leatherHi: hexToRgba('#9c5024'),
    leatherMid: hexToRgba('#703414'),
    leatherShadow: hexToRgba('#441c08'),
    studs: hexToRgba('#f4d040'),
    boots: hexToRgba('#5a2810'),
  },

  outfitCaveman: {
    peltHi: hexToRgba('#f8e090'),
    peltMid: hexToRgba('#d09028'),
    peltShadow: hexToRgba('#946014'),
    spots: hexToRgba('#502804'),
    wrapHi: hexToRgba('#8c5424'),
    wrapMid: hexToRgba('#603410'),
    wrapShadow: hexToRgba('#381c04'),
  },

  outfitHealer: {
    robeHi: hexToRgba('#ffffff'),
    robeMid: hexToRgba('#eaf0f6'),
    robeShadow: hexToRgba('#a4b8cc'),
    trimHi: hexToRgba('#44d06c'),
    trimMid: hexToRgba('#209c48'),
    trimShadow: hexToRgba('#105c28'),
    belt: hexToRgba('#287044'),
    shoes: hexToRgba('#cad8e4'),
  },

  outfitKnight: {
    plateHi: hexToRgba('#e4f0fa'),
    plateMid: hexToRgba('#94b0c8'),
    plateShadow: hexToRgba('#4c647c'),
    goldHi: hexToRgba('#ffe458'),
    goldMid: hexToRgba('#d8a418'),
    goldShadow: hexToRgba('#8c6408'),
    plume: hexToRgba('#d82424'),
  },

  outfitMonk: {
    giHi: hexToRgba('#ffffff'),
    giMid: hexToRgba('#f0ede0'),
    giShadow: hexToRgba('#b4b09c'),
    beltHi: hexToRgba('#4c4c54'),
    beltMid: hexToRgba('#24242c'),
    headband: hexToRgba('#d82424'),
    wraps: hexToRgba('#dcd6c4'),
  },

  outfitPriest: {
    robeHi: hexToRgba('#644898'),
    robeMid: hexToRgba('#442c74'),
    robeShadow: hexToRgba('#241444'),
    goldHi: hexToRgba('#ffdc48'),
    goldMid: hexToRgba('#d8a818'),
    goldShadow: hexToRgba('#886408'),
    white: hexToRgba('#fdfdf8'),
    mitre: hexToRgba('#583c88'),
  },

  outfitRanger: {
    hoodHi: hexToRgba('#649c5c'),
    hoodMid: hexToRgba('#3c6c38'),
    hoodShadow: hexToRgba('#20441c'),
    tunicHi: hexToRgba('#946438'),
    tunicMid: hexToRgba('#6c4420'),
    tunicShadow: hexToRgba('#442810'),
    strap: hexToRgba('#38200c'),
    buckle: hexToRgba('#d4a830'),
    boots: hexToRgba('#482c14'),
  },

  outfitRogue: {
    leatherHi: hexToRgba('#505060'),
    leatherMid: hexToRgba('#30303c'),
    leatherShadow: hexToRgba('#1c1c24'),
    maskHi: hexToRgba('#444450'),
    maskMid: hexToRgba('#282830'),
    buckle: hexToRgba('#94a4b8'),
    boots: hexToRgba('#181820'),
  },

  outfitSamurai: {
    armorHi: hexToRgba('#e43434'),
    armorMid: hexToRgba('#b82020'),
    armorShadow: hexToRgba('#6c1010'),
    lace: hexToRgba('#202028'),
    goldHi: hexToRgba('#ffd844'),
    goldMid: hexToRgba('#d8a018'),
    goldShadow: hexToRgba('#886008'),
    suneate: hexToRgba('#901818'),
  },

  outfitTourist: {
    hatHi: hexToRgba('#f4ecb0'),
    hatMid: hexToRgba('#d8cca0'),
    hatShadow: hexToRgba('#9c906c'),
    shirtBase: hexToRgba('#ff4468'),
    shirtPattern1: hexToRgba('#ffdc28'),
    shirtPattern2: hexToRgba('#28d0e8'),
    shortsHi: hexToRgba('#d8c090'),
    shortsMid: hexToRgba('#b49c70'),
    shoes: hexToRgba('#ffffff'),
  },

  outfitWizard: {
    robeHi: hexToRgba('#3c509c'),
    robeMid: hexToRgba('#243474'),
    robeShadow: hexToRgba('#141e4c'),
    goldHi: hexToRgba('#ffdc48'),
    goldMid: hexToRgba('#d8a818'),
    star: hexToRgba('#ffffff'),
    belt: hexToRgba('#845418'),
    boots: hexToRgba('#181e3c'),
  },

  // Crisp neutral grays for cape
  capeGray: {
    hi: hexToRgba('#f0f0f0'),
    mid: hexToRgba('#c0c0c0'),
    shadow: hexToRgba('#606060'),
    deep: hexToRgba('#303030'),
  },

  // Tint palettes for cape alignments
  capeLawfulBlue: {
    hi: hexToRgba('#98c4ff'),
    mid: hexToRgba('#3c78e8'),
    shadow: hexToRgba('#1c449c'),
    deep: hexToRgba('#102458'),
  },

  capeNeutralGreen: {
    hi: hexToRgba('#88f498'),
    mid: hexToRgba('#2ca844'),
    shadow: hexToRgba('#146c24'),
    deep: hexToRgba('#0c3c14'),
  },

  capeChaoticRed: {
    hi: hexToRgba('#ff9494'),
    mid: hexToRgba('#dc2c2c'),
    shadow: hexToRgba('#941414'),
    deep: hexToRgba('#540c0c'),
  },

  // Weapons
  weapon: {
    bladeWhite: hexToRgba('#ffffff'),
    bladeHi: hexToRgba('#d8e4f0'),
    bladeMid: hexToRgba('#88a0b8'),
    bladeShadow: hexToRgba('#485868'),
    slashGlow: hexToRgba('#80c8ff'),
    goldHi: hexToRgba('#ffdc40'),
    goldMid: hexToRgba('#d8a018'),
    woodHi: hexToRgba('#b47c40'),
    woodMid: hexToRgba('#885424'),
    woodShadow: hexToRgba('#503010'),
    featherRed: hexToRgba('#d82020'),
    magicBlueHi: hexToRgba('#a4e8ff'),
    magicBlueMid: hexToRgba('#30a8f4'),
  },

  shield: {
    rimHi: hexToRgba('#d8e4f0'),
    rimMid: hexToRgba('#90a4b8'),
    rimShadow: hexToRgba('#506478'),
    faceHi: hexToRgba('#385888'),
    faceMid: hexToRgba('#243c60'),
    faceShadow: hexToRgba('#14243c'),
    bossHi: hexToRgba('#ffd840'),
    bossMid: hexToRgba('#d8a018'),
    strap: hexToRgba('#603c20'),
  },

  // Species Monsters
  dog: {
    furHi: hexToRgba('#f8b868'),
    furMid: hexToRgba('#d8842c'),
    furShadow: hexToRgba('#945018'),
    belly: hexToRgba('#fff2dc'),
    bellyShadow: hexToRgba('#dec4a0'),
    collarHi: hexToRgba('#ff4444'),
    collarMid: hexToRgba('#d82020'),
    tag: hexToRgba('#ffd830'),
    tongue: hexToRgba('#ff5880'),
    white: hexToRgba('#ffffff'),
  },

  newt: {
    bodyHi: hexToRgba('#fff448'),
    bodyMid: hexToRgba('#f8c818'),
    bodyShadow: hexToRgba('#b8840c'),
    spots: hexToRgba('#884800'),
    belly: hexToRgba('#fffab8'),
    eyeGlint: hexToRgba('#ffffff'),
    tongue: hexToRgba('#ff4880'),
    tongueShadow: hexToRgba('#b81848'),
  },

  jackal: {
    furHi: hexToRgba('#e0b87c'),
    furMid: hexToRgba('#b88444'),
    furShadow: hexToRgba('#7c5024'),
    innerEar: hexToRgba('#d8a890'),
    belly: hexToRgba('#f4e0c8'),
    snout: hexToRgba('#282018'),
    eyes: hexToRgba('#ffcc20'),
    fangs: hexToRgba('#ffffff'),
    throat: hexToRgba('#9c1c1c'),
  },

  gnome: {
    capMid: hexToRgba('#c42424'),
    capShadow: hexToRgba('#741010'),
    tunicMid: hexToRgba('#507834'),
    tunicShadow: hexToRgba('#2c481c'),
    beardHi: hexToRgba('#f0f0f0'),
    beardShadow: hexToRgba('#989898'),
    skin: hexToRgba('#f4b888'),
    skinShadow: hexToRgba('#c08054'),
    leather: hexToRgba('#482c18'),
    gold: hexToRgba('#f0b820'),
    weaponHead: hexToRgba('#889cb0'),
  },

  // Monster Class Neutral Gray Palette (Saturation 0)
  monsterGray: {
    white: [240, 240, 240, 255],
    hi: [196, 196, 196, 255],
    mid: [136, 136, 136, 255],
    shadow: [80, 80, 80, 255],
    dark: [44, 44, 44, 255],
    outline: MONSTER_OUTLINE,

    // Small fixed accents (used sparingly for eyes, teeth, weapon trim)
    redEye: [224, 32, 32, 255],
    yellowEye: [240, 200, 20, 255],
    magicBlue: [60, 140, 240, 255],
    boneWhite: [255, 255, 255, 255],
    toxicGreen: [50, 210, 50, 255],
  }
};

module.exports = { OUTLINE, MONSTER_OUTLINE, hexToRgba, Palettes };
