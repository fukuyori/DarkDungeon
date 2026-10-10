// Distributed under the NetHack General Public License.
// Color definitions, palettes, and tinting functions for 1980s arcade fantasy maze game style sprites

const OUTLINE = [0x1a, 0x14, 0x14, 255]; // Standard dark arcade outline across all sheets

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

  skin: {
    highlight: hexToRgba('#ffe0d0'),
    mid: hexToRgba('#f4c090'),
    shadow: hexToRgba('#c88860'),
    deep: hexToRgba('#8a4a2a'),
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

  weapon: {
    bladeWhite: hexToRgba('#ffffff'),
    bladeHi: hexToRgba('#d8e4f0'),
    bladeMid: hexToRgba('#88a0b8'),
    bladeShadow: hexToRgba('#485868'),
    slashGlow: hexToRgba('#80c8ff'),
    goldHi: hexToRgba('#ffdc40'),
    goldMid: hexToRgba('#d8a018'),
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

  // 1980s arcade gnome: 11 distinct colors total (strictly <= 12)
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
  }
};

module.exports = { OUTLINE, hexToRgba, Palettes };
