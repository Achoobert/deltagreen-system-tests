import {
  addCompendiumItemToActor,
  createTestAgent,
  evaluatePercentileRoll,
  importDgRolls,
  setWeaponCustomRollTarget
} from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.rolls',
    (context) => {
      const { describe, it, assert } = context

      describe('Rolls', function () {
        it('basic skill roll succeeds under target', async function () {
          const actor = await createTestAgent('skill-roll')
          try {
            await actor.update({ 'system.skills.alertness.proficiency': 50 })
            const { DGPercentileRoll } = await importDgRolls()
            const roll = await evaluatePercentileRoll(
              DGPercentileRoll,
              {
                rollType: 'skill',
                key: 'alertness',
                actor
              },
              30
            )
            assert.equal(roll.target, 50)
            assert.equal(roll.total, 30)
            assert.isTrue(roll.isSuccess)
          } finally {
            await actor.delete()
          }
        })

        it('weapon roll from compendium firearm', async function () {
          const actor = await createTestAgent('weapon-roll')
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
              20
            )
            assert.equal(roll.total, 20)
            assert.equal(roll.effectiveTarget, 50)
            assert.isTrue(roll.isSuccess)
          } finally {
            await actor.delete()
          }
        })

        it('modified roll applies dialog modifier to effective target', async function () {
          const actor = await createTestAgent('modified-roll')
          try {
            await actor.update({ 'system.skills.alertness.proficiency': 40 })
            const { DGPercentileRoll } = await importDgRolls()
            const roll = await evaluatePercentileRoll(
              DGPercentileRoll,
              {
                rollType: 'skill',
                key: 'alertness',
                actor
              },
              55
            )
            roll.modifier = 20
            assert.equal(roll.effectiveTarget, 60)
            assert.isTrue(roll.isSuccess)
          } finally {
            await actor.delete()
          }
        })

        it('luck roll uses target 50', async function () {
          const actor = await createTestAgent('luck-roll')
          try {
            const { DGPercentileRoll } = await importDgRolls()
            const roll = await evaluatePercentileRoll(
              DGPercentileRoll,
              {
                rollType: 'luck',
                key: 'luck',
                actor
              },
              40
            )
            assert.equal(roll.target, 50)
            assert.equal(roll.total, 40)
            assert.isTrue(roll.isSuccess)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Rolls', preSelected: false }
  )
}
