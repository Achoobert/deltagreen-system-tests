import {
  createTestAgent,
  dgImport,
  getExhaustionEffect,
  importDgRolls,
  useQuenchTimeout
} from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.physical',
    (context) => {
      const { describe, it, assert } = context

      describe('Exhaustion, rest, stimulants', function () {
        useQuenchTimeout(this)

        it('exhaustion applies roll penalties via Active Effect', async function () {
          const actor = await createTestAgent('exhaust')
          try {
            const { syncExhaustionEffect } = await dgImport(
              '/systems/deltagreen/module/active-effect/runtime/exhaustion-effect.js'
            )
            await actor.update({
              'system.physical.exhausted': true,
              'system.physical.exhaustedPenalty': -20
            })
            await syncExhaustionEffect(actor)
            assert.isOk(getExhaustionEffect(actor))

            actor.reset()
            const { DGPercentileRoll } = await importDgRolls()
            const roll = new DGPercentileRoll(
              '1D100',
              {},
              {
                rollType: 'skill',
                key: 'alertness',
                actor
              }
            )
            assert.equal(roll.rollTargetModifier, -20)
          } finally {
            await actor.delete()
          }
        })

        it('rest clears exhaustion and restores WP', async function () {
          const actor = await createTestAgent('rest')
          try {
            const { clearStimulantEffects } = await dgImport(
              '/systems/deltagreen/module/active-effect/runtime/stimulant-effect.js'
            )
            const { syncExhaustionEffect } = await dgImport(
              '/systems/deltagreen/module/active-effect/runtime/exhaustion-effect.js'
            )
            const maxWp = actor.system.wp.max
            await actor.update({
              'system.physical.exhausted': true,
              'system.physical.exhaustedPenalty': -20,
              'system.wp.value': 2
            })
            await syncExhaustionEffect(actor)
            assert.isOk(getExhaustionEffect(actor))

            await clearStimulantEffects(actor)
            await actor.update({
              'system.physical.exhausted': false,
              'system.physical.suppressExhaustion': false,
              'system.wp.value': Math.min(maxWp, 2 + 4)
            })
            await syncExhaustionEffect(actor)
            actor.reset()

            assert.isFalse(actor.system.physical.exhausted)
            assert.isNotOk(getExhaustionEffect(actor))
            assert.equal(actor.system.wp.value, Math.min(maxWp, 6))
          } finally {
            await actor.delete()
          }
        })

        it('stimulants suppress exhaustion penalties', async function () {
          const actor = await createTestAgent('stimulant')
          try {
            const { applyStimulantEffect, getEffectiveSuppressExhaustion } =
              await dgImport(
                '/systems/deltagreen/module/active-effect/runtime/stimulant-effect.js'
              )
            const { syncExhaustionEffect } = await dgImport(
              '/systems/deltagreen/module/active-effect/runtime/exhaustion-effect.js'
            )
            await actor.update({
              'system.physical.exhausted': true,
              'system.physical.exhaustedPenalty': -20
            })
            await syncExhaustionEffect(actor)
            await applyStimulantEffect(actor, 4)
            await syncExhaustionEffect(actor)
            actor.reset()

            assert.isTrue(getEffectiveSuppressExhaustion(actor))
            const exhaustion = getExhaustionEffect(actor)
            assert.isTrue(exhaustion?.disabled)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Physical: exhaustion & stimulants', preSelected: false }
  )
}
