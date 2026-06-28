import { EXPECTED_DG_API_KEYS } from '../helpers.js'

export default function register (quench) {
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
}
