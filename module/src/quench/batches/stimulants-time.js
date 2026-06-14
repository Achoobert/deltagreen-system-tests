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
          const actor = await createTestAgent('stim-time')
          try {
            const { applyStimulantEffect, pruneExpiredStimulantEffects } =
              await dgImport(
                '/systems/deltagreen/module/active-effect/runtime/stimulant-effect.js'
              )
            await applyStimulantEffect(actor, 1)
            assert.isAtLeast(
              actor.effects.filter((e) => e.getFlag('deltagreen', 'stimulant'))
                .length,
              1
            )

            if (typeof game.time.advance === 'function') {
              await game.time.advance(3660)
            }

            for (const effect of actor.effects.filter((e) =>
              e.getFlag('deltagreen', 'stimulant')
            )) {
              effect.updateDuration()
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
