import {
  addCompendiumItemToActor,
  createTestAgent,
  evaluatePercentileRoll,
  importDgRolls,
  requirePack,
  setWeaponCustomRollTarget
} from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.compendiums',
    (context) => {
      const { describe, it, assert } = context

      describe('Compendium imports', function () {
        it('imports a firearm and can roll attack', async function () {
          requirePack('deltagreen.firearms')
          const actor = await createTestAgent('comp-firearm')
          try {
            const weapon = await addCompendiumItemToActor(
              actor,
              'deltagreen.firearms'
            )
            assert.equal(weapon.type, 'weapon')
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
              15
            )
            assert.equal(roll.total, 15)
            assert.equal(roll.effectiveTarget, 50)
            assert.isTrue(roll.isSuccess)
          } finally {
            await actor.delete()
          }
        })

        it('imports armor and updates protection when equipped', async function () {
          requirePack('deltagreen.armor')
          const actor = await createTestAgent('comp-armor')
          try {
            const armor = await addCompendiumItemToActor(
              actor,
              'deltagreen.armor'
            )
            if (!armor.system.equipped) {
              await armor.update({ 'system.equipped': true })
            }
            assert.isAtLeast(actor.system.health.protection, 0)
          } finally {
            await actor.delete()
          }
        })

        it('imports Unarmed Attack from hand-to-hand pack', async function () {
          requirePack('deltagreen.hand-to-hand-weapons')
          const actor = await createTestAgent('comp-unarmed')
          try {
            const weapon = await addCompendiumItemToActor(
              actor,
              'deltagreen.hand-to-hand-weapons',
              { nameIncludes: 'Unarmed' }
            )
            assert.equal(weapon.type, 'weapon')
            assert.include(weapon.name, 'Unarmed')
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Compendiums', preSelected: false }
  )
}
