// Distributed under the NetHack General Public License.
// Master index for all 57 NetHack Monster Class sprite generators

const { AnimalGenerators } = require('./animals');
const { HumanoidGenerators } = require('./humanoids');
const { UndeadGenerators } = require('./undead');
const { MythicGenerators } = require('./mythic');
const { AberrantGenerators } = require('./aberrant');

const ClassGenerators = {
  ...AnimalGenerators,
  ...HumanoidGenerators,
  ...UndeadGenerators,
  ...MythicGenerators,
  ...AberrantGenerators,
};

const CLASS_NAMES = Object.keys(ClassGenerators).sort();

function createClassSheet(name) {
  const gen = ClassGenerators[name];
  if (!gen) {
    throw new Error(`Unknown monster class generator: ${name}`);
  }
  return gen();
}

module.exports = {
  ClassGenerators,
  CLASS_NAMES,
  createClassSheet,
};
