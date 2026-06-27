/* global Actor */
import { ACTOR_SMOKE, useQuenchTimeout } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.actors.smoke',
    (context) => {
      const { describe, it, assert } = context

      describe('Actor creation', function () {
        useQuenchTimeout(this)

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
}
