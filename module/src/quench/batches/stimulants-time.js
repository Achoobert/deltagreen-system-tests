/* global game */
import { createTestAgent, dgImport } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.stimulants.time',
    (context) => {
      const { describe, it, assert } = context

      describe('Stimulant duration', function () {
        it('stimulant AE expires after world time advances', async function () {
          if (!game.user.isActiveGM) {
            this.skip()
          }
          if (typeof game.time.advance !== 'function') {
            this.skip('game.time.advance is not available')
          }
          const actor = await createTestAgent('stim-time')
          try {
            const { applyStimulantEffect, pruneExpiredStimulantEffects } =
              await dgImport(
                '/systems/deltagreen/module/active-effect/runtime/stimulant-effect.js'
              )
            await applyStimulantEffect(actor, 1)
            const stimulantId = actor.effects.find((e) =>
              e.getFlag('deltagreen', 'stimulant')
            )?.id
            assert.isOk(stimulantId)

            const expiredStart = game.time.worldTime - 7200
            await stimulant.update({
              start: { time: expiredStart },
              duration: { value: 1, units: 'hours' }
            })
            stimulant = actor.effects.get(stimulant.id) ?? stimulant
            stimulant.updateDuration()

            let stimulant = actor.effects.get(stimulantId)
            if (stimulant) {
              stimulant.updateDuration()
              assert.isTrue(
                stimulant.duration?.expired,
                'stimulant AE should be expired after time advance'
              )
            }

            await pruneExpiredStimulantEffects(actor)
            actor.reset()

            const remaining = actor.effects.filter((e) =>
              e.getFlag('deltagreen', 'stimulant')
            )
            assert.equal(remaining.length, 0)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Stimulants: time advance', preSelected: false }
  )
}
