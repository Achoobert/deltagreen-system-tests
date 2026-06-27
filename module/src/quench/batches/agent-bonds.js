import { addBondToActor, bondScoreFromActor, createTestAgent, useQuenchTimeout } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.agent.bonds',
    (context) => {
      const { describe, it, assert } = context

      describe('Bond lifecycle', function () {
        useQuenchTimeout(this)

        it('add bond', async function () {
          const actor = await createTestAgent('bond-add')
          try {
            assert.equal(actor.itemTypes.bond.length, 0)
            const bond = await addBondToActor(actor)
            assert.equal(actor.itemTypes.bond.length, 1)
            assert.equal(bond.type, 'bond')
            assert.equal(bond.system.score, bondScoreFromActor(actor))
            assert.equal(bond.system.relationship, 'friend')
          } finally {
            await actor.delete()
          }
        })

        it('damage bond', async function () {
          const actor = await createTestAgent('bond-damage')
          try {
            const bond = await addBondToActor(actor)
            await bond.update({
              'system.score': 8,
              'system.hasBeenDamagedSinceLastHomeScene': true
            })
            assert.equal(bond.system.score, 8)
            assert.isTrue(bond.system.hasBeenDamagedSinceLastHomeScene)
          } finally {
            await actor.delete()
          }
        })

        it('remove bond', async function () {
          const actor = await createTestAgent('bond-remove')
          try {
            const bond = await addBondToActor(actor)
            assert.equal(actor.itemTypes.bond.length, 1)
            await actor.deleteEmbeddedDocuments('Item', [bond.id])
            assert.equal(actor.itemTypes.bond.length, 0)
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Agent: bonds', preSelected: false }
  )
}
