import {
  createActorEmbeddedEffect,
  createTestAgent,
  deleteTestActor,
  dgImport,
  useQuenchTimeout
} from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.activeEffects',
    (context) => {
      const { describe, it, assert } = context

      describe('Active Effects', function () {
        useQuenchTimeout(this)

        it('roll-target AE changes skill roll modifier', async function () {
          const actor = await createTestAgent('ae-roll-target')
          try {
            await createActorEmbeddedEffect(actor, {
              name: 'Quench AE',
              img: 'icons/svg/aura.svg',
              transfer: false,
              disabled: false,
              changes: [
                {
                  key: 'system.rollTarget.allSkills',
                  type: 'add',
                  value: '-10',
                  phase: 'final',
                  priority: 20
                }
              ]
            })
            actor.reset()
            const { DGPercentileRoll } = await dgImport(
              '/systems/deltagreen/module/roll/roll.js'
            )
            const roll = new DGPercentileRoll(
              '1D100',
              {},
              {
                rollType: 'skill',
                key: 'alertness',
                actor
              }
            )
            assert.equal(roll.rollTargetModifier, -10)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('resource max AE increases health maximum', async function () {
          const actor = await createTestAgent('ae-hp-max')
          try {
            const baseMax = actor.system.health.max
            await createActorEmbeddedEffect(actor, {
              name: 'Quench HP bonus',
              img: 'icons/svg/heart.svg',
              transfer: false,
              disabled: false,
              changes: [
                {
                  key: 'system.health.maxBonus',
                  type: 'add',
                  value: '3',
                  phase: 'final',
                  priority: 20
                }
              ]
            })
            actor.reset()
            assert.equal(actor.system.health.max, baseMax + 3)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('motivation transfer AE suppressed until acute episode', async function () {
          const actor = await createTestAgent('ae-motivation')
          try {
            const [motivation] = await actor.createEmbeddedDocuments('Item', [
              {
                name: 'Disorder',
                type: 'motivation',
                system: { acuteEpisode: false }
              }
            ])
            const documentClass = foundry.utils.getDocumentClass('ActiveEffect')
            const effect = await documentClass.create(
              {
                name: 'Disorder AE',
                img: 'icons/svg/aura.svg',
                transfer: true,
                disabled: false,
                changes: [
                  {
                    key: 'system.rollTarget.allSkills',
                    type: 'add',
                    value: '-5',
                    phase: 'final',
                    priority: 20
                  }
                ]
              },
              { parent: motivation }
            )
            assert.isTrue(effect.isSuppressed)
            await motivation.update({ 'system.acuteEpisode': true })
            assert.isFalse(effect.isSuppressed)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('agent sheet exposes canManageEffects on effects tab context', async function () {
          useQuenchTimeout(this)
          const actor = await createTestAgent('ae-manage')
          try {
            const context = await actor.sheet._prepareContext({})
            assert.isTrue(
              context.canManageEffects,
              'editable owner should manage embedded Active Effects'
            )
            assert.isObject(context.sheetEffects)
            assert.isArray(context.sheetEffects.temporary)
            assert.isArray(context.sheetEffects.permanent)
          } finally {
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'Active Effects', preSelected: false }
  )
}
