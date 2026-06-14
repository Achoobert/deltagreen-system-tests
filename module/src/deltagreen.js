/* global Hooks, game, Actor, Item, CONFIG */

const ACTOR_SMOKE = [
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

const ITEM_SMOKE = [
  { type: 'weapon', assert (item, assert) { assert.equal(item.system.damage, '1D8') } },
  { type: 'armor', assert (item, assert) { assert.isNumber(item.system.protection) } },
  { type: 'bond', assert (item, assert) { assert.equal(item.system.score, 10) } },
  { type: 'gear', assert (item, assert) { assert.isString(item.system.description) } }
]

const EXPECTED_DG_API_KEYS = [
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

function importDgRolls () {
  if (!dgRollsPromise) {
    const path = '/systems/deltagreen/module/roll/roll.js'
    dgRollsPromise = import(/* webpackIgnore: true */ path)
  }
  return dgRollsPromise
}

async function createTestAgent (label) {
  return Actor.create({
    name: 'Quench ' + label + ' ' + foundry.utils.randomID(),
    type: 'agent'
  })
}

async function withFixedD100 (result, fn) {
  const prior = CONFIG.Dice.randomUniform
  CONFIG.Dice.randomUniform = () => (result - 0.5) / 100
  try {
    return await fn()
  } finally {
    CONFIG.Dice.randomUniform = prior
  }
}

async function applyManualHpDamage (actor, rawDamage, armorPiercing = 0) {
  const protection = actor.system.health.protection ?? 0
  const effectiveProtection = Math.max(0, protection - armorPiercing)
  const hpLoss = Math.max(0, rawDamage - effectiveProtection)
  const current = actor.system.health.value
  await actor.update({ 'system.health.value': current - hpLoss })
  return hpLoss
}

function bondScoreFromActor (actor) {
  return (
    actor.system.statistics.cha.effectiveValue ??
    actor.system.statistics.cha.value
  )
}

async function addBondToActor (actor, name = 'Quench Bond') {
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

Hooks.on('quenchReady', (quench) => {
  quench.registerBatch(
    'deltagreen.actors.smoke',
    (context) => {
      const { describe, it, assert } = context

      describe('Actor creation', function () {
        for (const spec of ACTOR_SMOKE) {
          it('creates a ' + spec.type + ' actor', async function () {
            const name = 'Quench ' + spec.type + ' ' + foundry.utils.randomID()
            const actor = await Actor.create({ name, type: spec.type })
            try {
              spec.assert(actor, assert)
            } finally {
              await actor.delete()
            }
          })
        }
      })
    },
    { displayName: 'Actors: smoke' }
  )

  quench.registerBatch(
    'deltagreen.items.smoke',
    (context) => {
      const { describe, it, assert } = context

      describe('Item creation', function () {
        for (const spec of ITEM_SMOKE) {
          it('creates a ' + spec.type + ' item', async function () {
            const name = 'Quench ' + spec.type + ' ' + foundry.utils.randomID()
            const item = await Item.create({ name, type: spec.type })
            try {
              assert.equal(item.type, spec.type)
              spec.assert(item, assert)
            } finally {
              await item.delete()
            }
          })
        }
      })
    },
    { displayName: 'Items: smoke', preSelected: false }
  )

  quench.registerBatch(
    'deltagreen.actors.derived',
    (context) => {
      const { describe, it, assert } = context

      describe('Agent derived data', function () {
        it('updates statistics and derived combat values', async function () {
          const actor = await createTestAgent('derived')
          try {
            await actor.update({
              'system.statistics.str.value': 14,
              'system.statistics.con.value': 12
            })
            assert.equal(actor.system.statistics.str.x5, 70)
            assert.equal(actor.system.health.max, 13)
            assert.equal(actor.system.statistics.str.meleeDamageBonusFormula, '+1')
          } finally {
            await actor.delete()
          }
        })

        it('flags skills that cannot improve on failure', async function () {
          const actor = await createTestAgent('skills')
          try {
            assert.isTrue(actor.system.skills.unnatural.cannotBeImprovedByFailure)
            assert.isTrue(actor.system.skills.luck.cannotBeImprovedByFailure)
            assert.isFalse(actor.system.skills.alertness.cannotBeImprovedByFailure)
          } finally {
            await actor.delete()
          }
        })

        it('marks breaking point when sanity is at or below current breaking point', async function () {
          const actor = await createTestAgent('SAN')
          try {
            await actor.update({
              'system.sanity.value': 25,
              'system.sanity.currentBreakingPoint': 30
            })
            assert.isTrue(actor.system.sanity.breakingPointHit)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Actors: derived', preSelected: false }
  )

  quench.registerBatch(
    'deltagreen.agent.bonds',
    (context) => {
      const { describe, it, assert } = context

      describe('Bond lifecycle', function () {
        it('add bond', async function () {
          const actor = await createTestAgent('bond-add')
          try {
            assert.equal(actor.itemTypes.bond.length, 0)
            const bond = await addBondToActor(actor)
            assert.equal(actor.itemTypes.bond.length, 1)
            assert.equal(bond.type, 'bond')
            assert.equal(bond.system.score, bondScoreFromActor(actor))
            assert.equal(bond.system.relationship, 'friend')
          } finally {
            await actor.delete()
          }
        })

        it('damage bond', async function () {
          const actor = await createTestAgent('bond-damage')
          try {
            const bond = await addBondToActor(actor)
            await bond.update({
              'system.score': 8,
              'system.hasBeenDamagedSinceLastHomeScene': true
            })
            assert.equal(bond.system.score, 8)
            assert.isTrue(bond.system.hasBeenDamagedSinceLastHomeScene)
          } finally {
            await actor.delete()
          }
        })

        it('remove bond', async function () {
          const actor = await createTestAgent('bond-remove')
          try {
            const bond = await addBondToActor(actor)
            assert.equal(actor.itemTypes.bond.length, 1)
            await actor.deleteEmbeddedDocuments('Item', [bond.id])
            assert.equal(actor.itemTypes.bond.length, 0)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Agent: bonds', preSelected: false }
  )

  quench.registerBatch(
    'deltagreen.agent.combat',
    (context) => {
      const { describe, it, assert } = context

      describe('Combat and armor', function () {
        it('perform attack', async function () {
          const actor = await createTestAgent('attack')
          try {
            await actor.AddWeaponItemToSheet(
              'Quench weapon',
              '',
              '1D8',
              'custom',
              0,
              50,
              0
            )
            const weapon = actor.items.find((i) => i.name === 'Quench weapon')
            const { DGPercentileRoll } = await importDgRolls()

            await withFixedD100(25, async () => {
              const roll = new DGPercentileRoll(
                '1D100',
                {},
                {
                  rollType: 'weapon',
                  key: 'custom',
                  actor,
                  item: weapon
                }
              )
              await roll.evaluate()
              assert.equal(roll.effectiveTarget, 50)
              assert.isTrue(roll.isSuccess)
            })
          } finally {
            await actor.delete()
          }
        })

        it('attack damage', async function () {
          const actor = await createTestAgent('damage-roll')
          try {
            await actor.AddWeaponItemToSheet(
              'Quench weapon',
              '',
              '1D8',
              'custom',
              0,
              50,
              0
            )
            const weapon = actor.items.find((i) => i.name === 'Quench weapon')
            const { DGDamageRoll } = await importDgRolls()
            const roll = new DGDamageRoll(
              '7',
              {},
              {
                rollType: 'damage',
                actor,
                item: weapon
              }
            )
            await roll.evaluate()
            assert.equal(roll.total, 7)
          } finally {
            await actor.delete()
          }
        })

        it('add armor to agent', async function () {
          const actor = await createTestAgent('armor')
          try {
            await actor.AddArmorItemToSheet('Test vest', '', 5, true)
            const armor = actor.items.find((i) => i.name === 'Test vest')
            assert.equal(armor.type, 'armor')
            assert.isTrue(armor.system.equipped)
            assert.equal(armor.system.protection, 5)
            assert.equal(actor.system.health.protection, 5)
          } finally {
            await actor.delete()
          }
        })

        it('damage agent with armor on', async function () {
          const actor = await createTestAgent('hp-armor')
          try {
            const maxHp = actor.system.health.max
            await actor.update({ 'system.health.value': maxHp })
            await actor.AddArmorItemToSheet('Test vest', '', 5, true)
            assert.equal(actor.system.health.protection, 5)

            const hpLoss = await applyManualHpDamage(actor, 8, 0)
            assert.equal(hpLoss, 3)
            assert.equal(actor.system.health.value, maxHp - 3)
          } finally {
            await actor.delete()
          }
        })

        it('damage agent with armor piercing', async function () {
          const actor = await createTestAgent('hp-ap')
          try {
            const maxHp = actor.system.health.max
            await actor.update({ 'system.health.value': maxHp })
            await actor.AddArmorItemToSheet('Test vest', '', 5, true)

            const hpLoss = await applyManualHpDamage(actor, 8, 2)
            assert.equal(hpLoss, 5)
            assert.equal(actor.system.health.value, maxHp - 5)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Agent: combat', preSelected: false }
  )

  quench.registerBatch(
    'deltagreen.api',
    (context) => {
      const { describe, it, assert } = context

      describe('game.deltagreen', function () {
        it('exposes the public system API', function () {
          assert.isObject(game.deltagreen)
          for (const key of EXPECTED_DG_API_KEYS) {
            assert.property(game.deltagreen, key, 'Missing API member: ' + key)
          }
          assert.equal(game.system.id, 'deltagreen')
          assert.equal(
            game.deltagreen.DeltaGreenActor,
            CONFIG.Actor.documentClass
          )
        })
      })
    },
    { displayName: 'System API' }
  )
})
