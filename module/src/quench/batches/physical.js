import {
  applyStimulantDoseSinceRest,
  createTestAgent,
  deleteTestActor,
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
            await deleteTestActor(actor)
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
              'system.physical.stimulantDosesSinceRest': 0,
              'system.wp.value': Math.min(maxWp, 2 + 4)
            })
            await syncExhaustionEffect(actor)
            actor.reset()

            assert.isFalse(actor.system.physical.exhausted)
            assert.isNotOk(getExhaustionEffect(actor))
            assert.equal(actor.system.wp.value, Math.min(maxWp, 6))
            assert.equal(actor.system.physical.stimulantDosesSinceRest, 0)
          } finally {
            await deleteTestActor(actor)
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
            await deleteTestActor(actor)
          }
        })

        it('first stimulant dose increments counter without WP loss', async function () {
          const actor = await createTestAgent('stim-first-dose')
          try {
            const startWp = actor.system.wp.value
            const result = await applyStimulantDoseSinceRest(actor, 3)
            assert.isFalse(result.isRepeatDose)
            assert.equal(result.doses, 1)
            assert.equal(actor.system.physical.stimulantDosesSinceRest, 1)
            assert.equal(actor.system.wp.value, startWp)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('repeat stimulant dose since rest reduces WP', async function () {
          const actor = await createTestAgent('stim-repeat-dose')
          try {
            await actor.update({ 'system.wp.value': 10 })
            await applyStimulantDoseSinceRest(actor, 2)
            const result = await applyStimulantDoseSinceRest(actor, 4, {
              wpRollTotal: 3
            })
            assert.isTrue(result.isRepeatDose)
            assert.equal(result.doses, 2)
            assert.equal(result.wpLoss, 3)
            assert.equal(actor.system.wp.value, 7)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('dose counter persists after stimulant effect expires without rest', async function () {
          const actor = await createTestAgent('stim-dose-persist')
          try {
            const { clearStimulantEffects } = await dgImport(
              '/systems/deltagreen/module/active-effect/runtime/stimulant-effect.js'
            )
            await applyStimulantDoseSinceRest(actor, 2)
            await applyStimulantDoseSinceRest(actor, 3, { wpRollTotal: 1 })
            assert.equal(actor.system.physical.stimulantDosesSinceRest, 2)

            await clearStimulantEffects(actor)
            actor.reset()

            assert.equal(actor.system.physical.stimulantDosesSinceRest, 2)
            assert.isEmpty(
              actor.effects.filter((e) => e.getFlag('deltagreen', 'stimulant'))
            )
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('repeat dose charges WP when stimulant AE exists but counter is zero', async function () {
          const actor = await createTestAgent('stim-migration-dose')
          try {
            const { applyStimulantEffect, hasActiveStimulantEffect } =
              await dgImport(
                '/systems/deltagreen/module/active-effect/runtime/stimulant-effect.js'
              )
            await actor.update({
              'system.physical.stimulantDosesSinceRest': 0,
              'system.wp.value': 10
            })
            await applyStimulantEffect(actor, 2)
            actor.reset()

            assert.equal(actor.system.physical.stimulantDosesSinceRest, 0)
            assert.isTrue(hasActiveStimulantEffect(actor))

            const result = await applyStimulantDoseSinceRest(actor, 3, {
              wpRollTotal: 4
            })
            assert.isTrue(result.isRepeatDose)
            assert.equal(result.wpLoss, 4)
            assert.equal(actor.system.wp.value, 6)
            assert.equal(actor.system.physical.stimulantDosesSinceRest, 1)
          } finally {
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'Physical: exhaustion & stimulants', preSelected: false }
  )
}
