import { createTestAgent, deleteTestActor, dgImport, useQuenchTimeout } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.chargen',
    (context) => {
      const { describe, it, assert } = context

      describe('Character creation commit path', function () {
        useQuenchTimeout(this)

        it('applyCharacterCreationPayload sets skills bonds and profession', async function () {
          const actor = await createTestAgent('chargen')
          try {
            const { applyCharacterCreationPayload } = await dgImport(
              '/systems/deltagreen/module/profession/index.js'
            )
            await applyCharacterCreationPayload(actor, {
              fixedValues: { alertness: 45, dodge: 40 },
              typedValues: {},
              professionName: 'Quench Profession',
              bonds: [{ name: 'Alex', relationship: 'partner' }]
            })
            assert.equal(actor.system.skills.alertness.proficiency, 45)
            assert.equal(actor.system.skills.dodge.proficiency, 40)
            assert.equal(actor.system.biography.profession, 'Quench Profession')
            assert.equal(actor.itemTypes.bond.length, 1)
            assert.equal(actor.itemTypes.bond[0].name, 'Alex')
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('finalizeAgentStartingResources sets SAN WP and HP from POW', async function () {
          const actor = await createTestAgent('finalize')
          try {
            const { finalizeAgentStartingResources } = await dgImport(
              '/systems/deltagreen/module/data/derived/actor-derived.js'
            )
            await actor.update({ 'system.statistics.pow.value': 12 })
            await finalizeAgentStartingResources(actor)
            assert.equal(actor.system.sanity.value, 60)
            assert.equal(actor.system.wp.max, 12)
            assert.equal(actor.system.wp.value, 12)
            assert.equal(actor.system.health.value, actor.system.health.max)
            assert.isAtMost(
              actor.system.sanity.currentBreakingPoint,
              actor.system.sanity.value
            )
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('typed skill proficiency 80 is stored from payload', async function () {
          const actor = await createTestAgent('bonus-cap')
          try {
            const { applyCharacterCreationPayload } = await dgImport(
              '/systems/deltagreen/module/profession/index.js'
            )
            await applyCharacterCreationPayload(actor, {
              fixedValues: {},
              typedValues: {
                placeholder: {
                  group: 'science',
                  label: 'Quench Science',
                  value: 80
                }
              },
              professionName: 'Test',
              bonds: [{ name: 'B', relationship: 'r' }]
            })
            const typed = Object.values(actor.system.typedSkills ?? {})
            const match = typed.find((t) => t.label === 'Quench Science')
            assert.isOk(match)
            assert.equal(match.proficiency, 80)
          } finally {
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'Chargen (programmatic)', preSelected: false }
  )
}
