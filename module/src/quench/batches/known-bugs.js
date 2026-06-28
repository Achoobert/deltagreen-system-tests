import { useQuenchTimeout } from '../helpers.js'
import {
  SAMPLE_STAT_BLOCK,
  unarmedCombatRatingFromStatBlock
} from '../stat-parser-mirror.js'

export default function register(quench) {
  quench.registerBatch(
    'deltagreen.known-bugs',
    (context) => {
      const { describe, it, assert } = context

      describe('Open issues (expected to fail until system fix)', function () {
        useQuenchTimeout(this)

        it('stat block Unarmed line sets unarmed_combat rating', function () {
          const rating = unarmedCombatRatingFromStatBlock(SAMPLE_STAT_BLOCK)
          assert.isAtLeast(
            rating,
            1,
            'Expected "Unarmed 45%" to map to unarmed_combat skill rating'
          )
          assert.equal(rating, 45)
        })
      })
    },
    {
      displayName: 'Known bugs (open issues)',
      preSelected: true
    }
  )
}
