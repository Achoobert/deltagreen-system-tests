/* global game */
import { createTestAgent, deleteTestActor, dgImport, useQuenchTimeout } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.stimulants.time',
    (context) => {
      const { describe, it, assert } = context

      describe('Stimulant duration', function () {
        useQuenchTimeout(this)

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

            const stimulant = actor.effects.get(stimulantId)
            assert.isOk(stimulant)
            stimulant.updateDuration()
            assert.isFalse(
              stimulant.duration?.expired,
              'stimulant AE should be active before time advance'
            )

            const calendar = game.time.calendar
            const advanceSeconds = calendar.componentsToTime({ hour: 2 })
            await game.time.advance(advanceSeconds)
            actor.reset()

            await pruneExpiredStimulantEffects(actor)
            actor.reset()

            const remaining = actor.effects.filter((e) =>
              e.getFlag('deltagreen', 'stimulant')
            )
            assert.equal(
              remaining.length,
              0,
              'stimulant AE should be pruned after world time advances past duration'
            )
          } finally {
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'Stimulants: time advance', preSelected: false }
  )
}
