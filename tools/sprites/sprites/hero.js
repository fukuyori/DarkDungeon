// Distributed under the NetHack General Public License.
// Master Hero Generator aggregating Bodies, Hair, Outfits, Cape, Weapons, Shields

const Canvas = require('../canvas');
const { RACES, GENDERS, createBodySheet } = require('./hero_bodies');
const { createHairSheet, getHeroKinematics } = require('./hero_hair');
const { ROLES, createOutfitSheet } = require('./hero_outfits');
const { createCapeSheet } = require('./hero_cape');
const { createWeaponSheet } = require('./hero_weapons');
const { createShieldSheet } = require('./hero_shield');

function createHeroLayers() {
  return {
    body: createBodySheet('human', 'female'),
    hair: createHairSheet('female'),
    outfit: createOutfitSheet('valkyrie'),
    cape: createCapeSheet(),
    weapon: createWeaponSheet('valkyrie'),
    shield: createShieldSheet(),
  };
}

// Composite layers in exact order: body -> hair -> outfit -> cape -> weapon -> shield (if present)
function compositeHeroLayers(body, hair, outfit, cape, weapon, shield = null) {
  const comp = new Canvas(192, 192);
  if (body) comp.blit(body);
  if (hair) comp.blit(hair);
  if (outfit) comp.blit(outfit);
  if (cape) comp.blit(cape);
  if (weapon) comp.blit(weapon);
  if (shield) comp.blit(shield);
  return comp;
}

module.exports = {
  RACES,
  GENDERS,
  ROLES,
  createHeroLayers,
  compositeHeroLayers,
  createBodySheet,
  createHairSheet,
  createOutfitSheet,
  createCapeSheet,
  createWeaponSheet,
  createShieldSheet,
  getHeroKinematics,
};
