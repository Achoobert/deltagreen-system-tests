import {
  createTestAgent,
  deleteTestActor,
  settleAgentSideEffects,
  useQuenchTimeout,
  waitForActorBootstrap,
  waitForChatMessage,
  withSanityRollSource
} from '../helpers.js'

function messageCount () {
  return game.messages.size
}

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.sanity.guards',
    (context) => {
      const { describe, it, assert } = context

      describe('SAN update user guards', function () {
        useQuenchTimeout(this)

        it('does not run sanity reactions for a foreign userId', async function () {
          const actor = await createTestAgent('san-guard-off')
          try {
            await waitForActorBootstrap(actor)
            await actor.update({
              'system.sanity.value': 50,
              'system.sanity.currentBreakingPoint': 30
            })
            const before = messageCount()
            await actor.system._onUpdate(
              { 'system.sanity.value': 44 },
              {
                dg: {
                  previousSanity: { value: 50, aboveBreakingPoint: true }
                }
              },
              'foreignUserId'
            )
            assert.equal(messageCount(), before)
          } finally {
            await settleAgentSideEffects(actor)
            await deleteTestActor(actor)
          }
        })

        it('runs sanity reactions for the initiating userId', async function () {
          const actor = await createTestAgent('san-guard-on')
          try {
            await waitForActorBootstrap(actor)
            await actor.update({
              'system.sanity.value': 50,
              'system.sanity.currentBreakingPoint': 30,
              'system.sanity.adaptations.violence.incident1': false,
              'system.sanity.adaptations.violence.incident2': false,
              'system.sanity.adaptations.violence.incident3': false
            })
            const before = messageCount()
            await withSanityRollSource(actor, 'violence', async () => {
              await actor.update({ 'system.sanity.value': 44 })
            })
            await waitForChatMessage(actor.name, { beforeCount: before })
            assert.isAbove(messageCount(), before)
          } finally {
            await settleAgentSideEffects(actor)
            await deleteTestActor(actor)
          }
        })

        it('does not run adaptation chat for a foreign userId', async function () {
          const actor = await createTestAgent('san-guard-adapt')
          try {
            await waitForActorBootstrap(actor)
            await actor.update({
              'system.sanity.value': 50,
              'system.sanity.adaptations.violence.incident1': false,
              'system.sanity.adaptations.violence.incident2': false
            })
            const before = messageCount()
            await actor.system._onUpdate(
              {
                'system.sanity.adaptations.violence.incident3': true
              },
              {
                dg: {
                  previousAdaptations: {
                    violence: false,
                    helplessness: false
                  }
                }
              },
              'foreignUserId'
            )
            assert.equal(messageCount(), before)
          } finally {
            await settleAgentSideEffects(actor)
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'SAN: user guards', preSelected: true }
  )
}
