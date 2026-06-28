/** CI (software WebGL + dockerized Foundry) makes Actor/Item DB ops slow; bump Mocha's 2000ms default. */
export const QUENCH_DEFAULT_TIMEOUT_MS = 30000

/**
 * Call inside a describe/it body declared with `function () {}` (not arrow),
 * so `this` is the Mocha context.
 */
export function useQuenchTimeout (mochaCtx, ms = QUENCH_DEFAULT_TIMEOUT_MS) {
  if (mochaCtx && typeof mochaCtx.timeout === 'function') {
    mochaCtx.timeout(ms)
  }
  return ms
}

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
  { type: 'gear', assert (item, assert) { assert.isString(item.system.description) } },
  { type: 'motivation', assert (item, assert) { assert.isFalse(item.system.acuteEpisode) } },
  { type: 'profession', assert (item, assert) { assert.isAtLeast(Number(item.system.bonds) || 0, 1) } },
  { type: 'ritual', assert (item, assert) { assert.isString(item.system.complexity) } },
  { type: 'tome', assert (item, assert) { assert.isNumber(item.system.unnaturalSkillIncrease) } }
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

export async function createTestNpc(label) {
  return Actor.create({
    name: 'Quench ' + label + ' ' + foundry.utils.randomID(),
    type: 'npc'
  })
}

export async function createTestUnnatural(label) {
  return Actor.create({
    name: 'Quench ' + label + ' ' + foundry.utils.randomID(),
    type: 'unnatural'
  })
}

export async function createTestVehicle (label) {
  return Actor.create({
    name: 'Quench ' + label + ' ' + foundry.utils.randomID(),
    type: 'vehicle'
  })
}

export async function createTestItem (type, label = type) {
  return Item.create({
    name: 'Quench ' + label + ' ' + foundry.utils.randomID(),
    type
  })
}

const BOOTSTRAP_POLL_MS = 50
const BOOTSTRAP_TIMEOUT_MS = 15000
const CHAT_POLL_MS = 50
const CHAT_TIMEOUT_MS = 5000

/**
 * Wait for createActor hook side effects (unarmed / vehicle armor) before deleting test actors.
 * @param {Actor} actor
 */
export async function waitForActorBootstrap (actor) {
  const deadline = Date.now() + BOOTSTRAP_TIMEOUT_MS
  while (Date.now() < deadline) {
    const current = game.actors.get(actor.id)
    if (!current) return
    actor = current

    if (actor.type === 'agent') {
      const hasUnarmed = actor.items.some(
        (item) => item.name === 'Unarmed Attack'
      )
      if (hasUnarmed) return
    } else if (actor.type === 'vehicle') {
      const hasArmor = actor.items.some((item) => item.name === 'Vehicle Frame')
      const flag = await actor.getFlag('deltagreen', 'DefaultVehicleArmorAdded')
      if (hasArmor || flag === true) return
    } else {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_POLL_MS))
  }
  throw new Error('Timed out waiting for actor bootstrap: ' + actor.type)
}

/**
 * Brief pause so fire-and-forget AgentData._onUpdate reactions can finish.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {number} [options.ms]
 */
export async function settleAgentSideEffects (actor, { ms = 150 } = {}) {
  if (!game.actors.get(actor?.id)) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for bootstrap side effects, then delete a test actor safely.
 * @param {Actor} actor
 */
export async function deleteTestActor (actor) {
  if (!actor?.id) return
  await waitForActorBootstrap(actor)
  const current = game.actors.get(actor.id)
  if (!current) return
  await current.delete()
}

/**
 * @param {Actor|Item} doc
 * @param {string} path
 * @param {*} expected
 * @param {import('chai').AssertStatic} assert
 */
export function assertPersists (doc, path, expected, assert) {
  assert.equal(foundry.utils.getProperty(doc, path), expected)
  doc.reset()
  assert.equal(foundry.utils.getProperty(doc._source, path), expected)
  const collection =
    doc.documentName === 'Actor' ? game.actors : game.items
  const refetched = collection.get(doc.id)
  assert.equal(foundry.utils.getProperty(refetched, path), expected)
}

/**
 * @param {string} settingKey
 * @param {*} value
 * @param {() => Promise<*>|*} fn
 */
export async function withSetting (settingKey, value, fn) {
  const prior = game.settings.get('deltagreen', settingKey)
  await game.settings.set('deltagreen', settingKey, value)
  try {
    return await fn()
  } finally {
    await game.settings.set('deltagreen', settingKey, prior)
  }
}

/**
 * @param {Actor} actor
 * @param {string} source
 * @param {() => Promise<*>|*} fn
 */
export async function withSanityRollSource (actor, source, fn) {
  const prior = actor.getFlag('deltagreen', 'lastSanityRollSource')
  await actor.setFlag('deltagreen', 'lastSanityRollSource', source)
  try {
    return await fn()
  } finally {
    if (prior === undefined) {
      await actor.unsetFlag('deltagreen', 'lastSanityRollSource')
    } else {
      await actor.setFlag('deltagreen', 'lastSanityRollSource', prior)
    }
  }
}

/**
 * @param {string} substring
 * @returns {ChatMessage|undefined}
 */
export function lastChatMessageMatching (substring) {
  const messages = [...game.messages.contents].reverse()
  return messages.find((m) => m.content?.includes(substring))
}

/**
 * Poll until a chat message containing substring appears after beforeCount.
 * @param {string} substring
 * @param {object} [options]
 * @param {number} [options.beforeCount]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<ChatMessage>}
 */
export async function waitForChatMessage (substring, options = {}) {
  const beforeCount = options.beforeCount ?? game.messages.size - 1
  const timeoutMs = options.timeoutMs ?? CHAT_TIMEOUT_MS
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (game.messages.size > beforeCount) {
      const msg = lastChatMessageMatching(substring)
      if (msg) return msg
    }
    await new Promise((resolve) => setTimeout(resolve, CHAT_POLL_MS))
  }
  throw new Error('Timed out waiting for chat message matching: ' + substring)
}

/**
 * @param {Actor|Item} doc
 * @param {object} options
 * @param {string} options.fieldPath
 * @param {*} options.value
 * @param {import('chai').AssertStatic} options.assert
 */
export async function renderSheetRoundTrip ({
  doc,
  fieldPath,
  value,
  assert
}) {
  await doc.sheet.render(true)
  try {
    await doc.update({ [fieldPath]: value })
    assert.equal(foundry.utils.getProperty(doc, fieldPath), value)
  } finally {
    await doc.sheet.close()
  }
  await doc.sheet.render(true)
  try {
    assertPersists(doc, fieldPath, value, assert)
  } finally {
    await doc.sheet.close()
  }
}

export function importCompendiumProfession (opts = {}) {
  return importCompendiumItem('deltagreen.professions', opts)
}

export function packAvailable (collection) {
  return Boolean(game.packs.get(collection))
}

/**
 * Build a character-creation payload from a compendium profession document.
 * @param {Item} professionDoc
 */
export async function buildCompendiumProfessionPayload (professionDoc) {
  const {
    buildCharacterCreationPayload,
    buildBonusSkillCatalog,
    computeSkillValues
  } = await dgImport('/systems/deltagreen/module/profession/index.js')
  const { splitProfessionSkillMap, isChooseOneProfessionSkillKey } =
    await dgImport('/systems/deltagreen/module/profession/keys.js')

  const automaticSkills = professionDoc.system.automaticSkills ?? {}
  const automaticMeta = professionDoc.system.automaticSkillMeta ?? {}
  const optionMeta = professionDoc.system.optionSkillMeta ?? {}
  const { optionPicks, skills: optionSkills } = splitProfessionSkillMap(
    professionDoc.system.optionSkills ?? {}
  )

  const optionKeys = Object.keys(optionSkills)
  const checkedOptionKeys = optionKeys.slice(
    0,
    Math.min(optionPicks, optionKeys.length)
  )
  const chooseOneLabels = {}
  for (const key of [...Object.keys(automaticSkills), ...checkedOptionKeys]) {
    if (isChooseOneProfessionSkillKey(key, automaticMeta, optionMeta)) {
      chooseOneLabels[key] = 'Quench Skill Choice'
    }
  }

  const bonusCatalogIds = buildBonusSkillCatalog()
    .filter((entry) => !entry.id.startsWith('typed:'))
    .slice(0, 8)
    .map((entry) => entry.id)
  const bondCount = Math.max(1, Number(professionDoc.system.bonds) || 1)
  const bondNames = Array.from(
    { length: bondCount },
    (_, index) => 'Bond ' + (index + 1)
  )
  const bondRelationships = Array.from({ length: bondCount }, () => 'friend')

  const computed = computeSkillValues(
    automaticSkills,
    optionSkills,
    optionPicks,
    {
      checkedOptionKeys: new Set(checkedOptionKeys),
      chooseOneLabels,
      bonusCatalogIds,
      bonusTypedLabels: Array(8).fill(''),
      bondNames,
      bondRelationships
    },
    {
      automaticMeta,
      optionMeta,
      bondCount
    }
  )

  if (!computed.isValid) {
    throw new Error(
      'Invalid profession form: ' + computed.validationErrors.join(', ')
    )
  }

  return buildCharacterCreationPayload(computed, professionDoc, {
    bondNames,
    bondRelationships
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

/**
 * Mirrors DGAgentSheet._takeStimulants dose counter and WP loss (no dialog or chat).
 * @param {Actor} actor
 * @param {number} hours
 * @param {object} [options]
 * @param {number} [options.wpRollTotal] Fixed WP loss on repeat dose; otherwise rolls 1d6.
 * @returns {Promise<{ isRepeatDose: boolean, newWp: number, doses: number, wpLoss: number }>}
 */
export async function applyStimulantDoseSinceRest (actor, hours, options = {}) {
  const { applyStimulantEffect } = await dgImport(
    '/systems/deltagreen/module/active-effect/runtime/stimulant-effect.js'
  )
  const doses = Number(actor.system.physical.stimulantDosesSinceRest) || 0
  const isRepeatDose = doses > 0
  const currentWp = Number(actor.system.wp.value) || 0
  let wpLoss = 0
  let newWp = currentWp
  if (isRepeatDose) {
    const Roll = foundry.dice.Roll
    wpLoss =
      options.wpRollTotal ?? (await new Roll('1d6').evaluate()).total
    newWp = Math.max(0, currentWp - wpLoss)
  }
  await applyStimulantEffect(actor, hours)
  const updateData = { 'system.physical.stimulantDosesSinceRest': doses + 1 }
  if (isRepeatDose) updateData['system.wp.value'] = newWp
  await actor.update(updateData)
  actor.reset()
  return { isRepeatDose, newWp, doses: doses + 1, wpLoss }
}
