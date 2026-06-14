import {
  addCompendiumItemToActor,
  applyManualHpDamage,
  createTestAgent,
  evaluatePercentileRoll,
  importDgRolls,
  setWeaponCustomRollTarget
} from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.agent.combat',
    (context) => {
      const { describe, it, assert } = context

      describe('Combat and armor', function () {
        it('perform attack', async function () {
          const actor = await createTestAgent('attack')
          try {
            const weapon = await addCompendiumItemToActor(
              actor,
              'deltagreen.firearms'
            )
            const { DGPercentileRoll } = await importDgRolls()
            await setWeaponCustomRollTarget(weapon, 50)
            const roll = await evaluatePercentileRoll(
              DGPercentileRoll,
              {
                rollType: 'weapon',
                key: 'custom',
                actor,
                item: weapon
              },
              25
            )
            assert.equal(roll.total, 25)
            assert.equal(roll.effectiveTarget, 50)
            assert.isTrue(roll.isSuccess)
          } finally {
            await actor.delete()
          }
        })

        it('attack damage', async function () {
          const actor = await createTestAgent('damage-roll')
          try {
            const weapon = await addCompendiumItemToActor(
              actor,
              'deltagreen.firearms'
            )
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
            const armor = await addCompendiumItemToActor(
              actor,
              'deltagreen.armor'
            )
            if (!armor.system.equipped) {
              await armor.update({ 'system.equipped': true })
            }
            assert.equal(armor.type, 'armor')
            assert.isTrue(armor.system.equipped)
            assert.isAtLeast(armor.system.protection, 0)
            assert.equal(
              actor.system.health.protection,
              armor.system.protection
            )
          } finally {
            await actor.delete()
          }
        })

        it('damage agent with armor on', async function () {
          const actor = await createTestAgent('hp-armor')
          try {
            const maxHp = actor.system.health.max
            await actor.update({ 'system.health.value': maxHp })
            const armor = await addCompendiumItemToActor(
              actor,
              'deltagreen.armor'
            )
            if (!armor.system.equipped) {
              await armor.update({ 'system.equipped': true })
            }
            const protection = actor.system.health.protection
            assert.isAtLeast(protection, 0)

            const hpLoss = await applyManualHpDamage(actor, 8, 0)
            assert.equal(hpLoss, Math.max(0, 8 - protection))
            assert.equal(actor.system.health.value, maxHp - hpLoss)
          } finally {
            await actor.delete()
          }
        })

        it('damage agent with armor piercing', async function () {
          const actor = await createTestAgent('hp-ap')
          try {
            const maxHp = actor.system.health.max
            await actor.update({ 'system.health.value': maxHp })
            await addCompendiumItemToActor(actor, 'deltagreen.armor')
            const protection = actor.system.health.protection
            const armorPiercing = 2
            const effective = Math.max(0, protection - armorPiercing)

            const hpLoss = await applyManualHpDamage(actor, 8, armorPiercing)
            assert.equal(hpLoss, Math.max(0, 8 - effective))
            assert.equal(actor.system.health.value, maxHp - hpLoss)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Agent: combat', preSelected: false }
  )
}
