/* global Actor, Item, CONFIG, game */

export const ACTOR_SMOKE = [
  {
    type: 'agent',
    assert (actor, assert) {
      assert.equal(actor.type, 'agent')
      assert.isAtLeast(actor.system.health.max, 1)
      assert.equal(actor.system.statistics.str.x5, 50)
    }
  },
  {
    type: 'npc',
    assert (actor, assert) {
      assert.equal(actor.type, 'npc')
      assert.equal(actor.system.statistics.str.x5, 50)
      assert.isAtLeast(actor.system.health.max, 1)
    }
  },
  {
    type: 'unnatural',
    assert (actor, assert) {
      assert.equal(actor.type, 'unnatural')
      assert.equal(actor.system.statistics.str.x5, 50)
    }
  },
  {
    type: 'vehicle',
    assert (actor, assert) {
      assert.equal(actor.type, 'vehicle')
      assert.equal(actor.system.health.max, 10)
      assert.isUndefined(actor.system.statistics)
    }
  }
]

export const ITEM_SMOKE = [
  { type: 'weapon', assert (item, assert) { assert.equal(item.system.damage, '1D8') } },
  { type: 'armor', assert (item, assert) { assert.isNumber(item.system.protection) } },
  { type: 'bond', assert (item, assert) { assert.equal(item.system.score, 10) } },
  { type: 'gear', assert (item, assert) { assert.isString(item.system.description) } }
]

export const EXPECTED_DG_API_KEYS = [
  'DeltaGreenActor',
  'DeltaGreenItem',
  'DGActiveEffect',
  'rollItemMacro',
  'rollItemSkillCheckMacro',
  'rollSkillMacro',
  'ParseDeltaGreenStatBlock',
  'rollSkillTestAndDamageForOwnedItem'
]

let dgRollsPromise

export function dgImport (path) {
  return import(/* webpackIgnore: true */ path)
}

export function importDgRolls () {
  if (!dgRollsPromise) {
    dgRollsPromise = dgImport('/systems/deltagreen/module/roll/roll.js')
  }
  return dgRollsPromise
}

export async function createTestAgent (label) {
  return Actor.create({
    name: 'Quench ' + label + ' ' + foundry.utils.randomID(),
    type: 'agent'
  })
}

export async function withFixedD100 (result, fn) {
  const prior = CONFIG.Dice.randomUniform
  CONFIG.Dice.randomUniform = () => (result - 0.5) / 100
  try {
    return await fn()
  } finally {
    CONFIG.Dice.randomUniform = prior
  }
}

/** Compendium weapons vary by skill; pin a known target for deterministic attack tests. */
export async function setWeaponCustomRollTarget (weapon, target = 50) {
  await weapon.update({
    'system.skill': 'custom',
    'system.customSkillTarget': target,
    'system.skillModifier': 0
  })
  return 'custom'
}

export function forceRollTotal (roll, total) {
  const numeric = Number(total)
  if (!Number.isFinite(numeric)) return roll

  for (const die of roll.dice ?? []) {
    for (const result of die.results ?? []) {
      result.result = numeric
    }
  }

  for (const term of roll.terms ?? []) {
    if (term.results) {
      for (const result of term.results) {
        result.result = numeric
      }
    }
  }

  roll._total = numeric
  return roll
}

export async function evaluatePercentileRoll (RollClass, options, d100Result) {
  let roll
  await withFixedD100(d100Result, async () => {
    roll = new RollClass('1D100', {}, options)
    await roll.evaluate()
  })
  if (roll.total !== d100Result) {
    forceRollTotal(roll, d100Result)
  }
  return roll
}

export async function applyManualHpDamage (actor, rawDamage, armorPiercing = 0) {
  const protection = actor.system.health.protection ?? 0
  const effectiveProtection = Math.max(0, protection - armorPiercing)
  const hpLoss = Math.max(0, rawDamage - effectiveProtection)
  const current = actor.system.health.value
  await actor.update({ 'system.health.value': current - hpLoss })
  return hpLoss
}

export function bondScoreFromActor (actor) {
  return (
    actor.system.statistics.cha.effectiveValue ??
    actor.system.statistics.cha.value
  )
}

export async function addBondToActor (actor, name = 'Quench Bond') {
  const created = await actor.createEmbeddedDocuments('Item', [
    {
      name,
      type: 'bond',
      system: {
        score: bondScoreFromActor(actor),
        relationship: 'friend'
      }
    }
  ])
  return created[0]
}

export function requirePack (collection) {
  const pack = game.packs.get(collection)
  if (!pack) {
    throw new Error('Missing compendium pack: ' + collection)
  }
  return pack
}

export async function importCompendiumItem (collection, { nameIncludes } = {}) {
  const pack = requirePack(collection)
  await pack.getIndex()
  const entries = Array.from(pack.index.values())
  if (!entries.length) {
    throw new Error('Empty compendium pack: ' + collection)
  }
  const entry =
    entries.find((e) => !nameIncludes || e.name.includes(nameIncludes)) ??
    entries[0]
  return pack.getDocument(entry._id)
}

export async function addCompendiumItemToActor (actor, collection, opts = {}) {
  const doc = await importCompendiumItem(collection, opts)
  const [item] = await actor.createEmbeddedDocuments('Item', [doc.toObject()])
  return item
}

export async function createActorEmbeddedEffect (actor, data) {
  const documentClass = foundry.utils.getDocumentClass('ActiveEffect')
  return documentClass.create(data, { parent: actor })
}

export function getExhaustionEffect (actor) {
  return actor.effects?.find((effect) => effect.getFlag('deltagreen', 'exhaustion'))
}
