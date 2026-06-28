import { createTestAgent, deleteTestActor, settleAgentSideEffects, useQuenchTimeout } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.actors.derived',
    (context) => {
      const { describe, it, assert } = context

      describe('Agent derived data', function () {
        useQuenchTimeout(this)

        it('updates statistics and derived combat values', async function () {
          const actor = await createTestAgent('derived')
          try {
            await actor.update({
              'system.statistics.str.value': 14,
              'system.statistics.con.value': 12
            })
            assert.equal(actor.system.statistics.str.x5, 70)
            assert.equal(actor.system.health.max, 13)
            assert.equal(actor.system.statistics.str.meleeDamageBonusFormula, '+1')
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('flags skills that cannot improve on failure', async function () {
          const actor = await createTestAgent('skills')
          try {
            assert.isTrue(actor.system.skills.unnatural.cannotBeImprovedByFailure)
            // actor.system.skills.luck
            // note that luck is not a skill
            assert.isFalse(actor.system.skills.alertness.cannotBeImprovedByFailure)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('marks breaking point when sanity is at or below current breaking point', async function () {
          const actor = await createTestAgent('SAN')
          try {
            await actor.update({
              'system.sanity.value': 25,
              'system.sanity.currentBreakingPoint': 30
            })
            assert.isTrue(actor.system.sanity.breakingPointHit)
          } finally {
            await settleAgentSideEffects(actor)
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'Actors: derived', preSelected: true }
  )
}
