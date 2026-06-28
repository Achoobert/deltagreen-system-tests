import {
  buildCompendiumProfessionPayload,
  createTestAgent,
  deleteTestActor,
  dgImport,
  importCompendiumProfession,
  packAvailable,
  useQuenchTimeout,
  waitForActorBootstrap
} from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.chargen.flow',
    (context) => {
      const { describe, it, assert } = context

      describe('Profession assignment flow', function () {
        useQuenchTimeout(this)

        it('commitProfessionSetup applies compendium profession to agent', async function () {
          if (!packAvailable('deltagreen.professions')) this.skip()

          const actor = await createTestAgent('chargen-flow')
          try {
            await waitForActorBootstrap(actor)
            const professionDoc = await importCompendiumProfession()
            const payload = await buildCompendiumProfessionPayload(professionDoc)
            const { commitProfessionSetup } = await dgImport(
              '/systems/deltagreen/module/profession/index.js'
            )
            const ItemDocument = foundry.utils.getDocumentClass('Item')
            const stub = new ItemDocument(professionDoc.toObject(), {
              parent: actor
            })

            await commitProfessionSetup(actor, stub, payload, {
              path: 'freshRecruit'
            })

            assert.equal(actor.system.biography.profession, professionDoc.name)
            assert.isAtLeast(actor.itemTypes.profession.length, 1)
            assert.isAtLeast(actor.itemTypes.bond.length, 1)
            assert.isAtLeast(actor.system.sanity.value, 1)
            assert.equal(actor.system.wp.value, actor.system.wp.max)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('assignProfessionToAgent rejects a second profession', async function () {
          if (!packAvailable('deltagreen.professions')) this.skip()

          const actor = await createTestAgent('chargen-dup')
          try {
            await waitForActorBootstrap(actor)
            const professionDoc = await importCompendiumProfession()
            const payload = await buildCompendiumProfessionPayload(professionDoc)
            const { commitProfessionSetup } = await dgImport(
              '/systems/deltagreen/module/profession/index.js'
            )
            const ItemDocument = foundry.utils.getDocumentClass('Item')
            const stub = new ItemDocument(professionDoc.toObject(), {
              parent: actor
            })
            await commitProfessionSetup(actor, stub, payload, {
              path: 'freshRecruit'
            })

            const assignProfessionToAgent = (
              await dgImport(
                '/systems/deltagreen/module/applications/profession-setup-flow.js'
              )
            ).default
            const second = await assignProfessionToAgent(
              actor,
              professionDoc.toObject()
            )
            assert.isNull(second)
            assert.equal(actor.itemTypes.profession.length, 1)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('compendium profession is valid assignment payload', async function () {
          if (!packAvailable('deltagreen.professions')) this.skip()
          const professionDoc = await importCompendiumProfession()
          const itemData = professionDoc.toObject()
          assert.equal(itemData.type, 'profession')
          assert.isAtLeast(
            Object.keys(itemData.system.automaticSkills ?? {}).length,
            1
          )
          const payload = await buildCompendiumProfessionPayload(professionDoc)
          assert.equal(payload.professionName, professionDoc.name)
          assert.isAtLeast(Object.keys(payload.fixedValues).length, 1)
        })
      })
    },
    { displayName: 'Chargen: profession flow', preSelected: false }
  )
}
