import {
  addBondToActor,
  addCompendiumItemToActor,
  assertPersists,
  createTestAgent,
  createTestItem,
  deleteTestActor,
  evaluatePercentileRoll,
  importCompendiumProfession,
  importDgRolls,
  packAvailable,
  setWeaponCustomRollTarget,
  useQuenchTimeout,
  waitForActorBootstrap
} from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.items.functional',
    (context) => {
      const { describe, it, assert } = context

      describe('Item behavior', function () {
        useQuenchTimeout(this)

        it('weapon attack roll uses custom target', async function () {
          if (!packAvailable('deltagreen.firearms')) this.skip()
          const actor = await createTestAgent('item-weapon')
          try {
            await waitForActorBootstrap(actor)
            const weapon = await addCompendiumItemToActor(
              actor,
              'deltagreen.firearms'
            )
            const { DGPercentileRoll } = await importDgRolls()
            await setWeaponCustomRollTarget(weapon, 50)
            const roll = await evaluatePercentileRoll(
              DGPercentileRoll,
              {
                rollType: 'weapon',
                key: 'custom',
                actor,
                item: weapon
              },
              20
            )
            assert.isTrue(roll.isSuccess)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('armor protection applies when equipped', async function () {
          if (!packAvailable('deltagreen.armor')) this.skip()
          const actor = await createTestAgent('item-armor')
          try {
            await waitForActorBootstrap(actor)
            const armor = await addCompendiumItemToActor(
              actor,
              'deltagreen.armor'
            )
            await armor.update({ 'system.equipped': true })
            actor.reset()
            assert.isAtLeast(actor.system.health.protection, 0)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('bond score updates on damage', async function () {
          const actor = await createTestAgent('item-bond')
          try {
            await waitForActorBootstrap(actor)
            const bond = await addBondToActor(actor)
            await bond.update({
              'system.score': 7,
              'system.hasBeenDamagedSinceLastHomeScene': true
            })
            assert.equal(bond.system.score, 7)
            assert.isTrue(bond.system.hasBeenDamagedSinceLastHomeScene)
          } finally {
            await deleteTestActor(actor)
          }
        })

        it('gear description persists', async function () {
          const item = await createTestItem('gear', 'functional')
          const text = 'Field kit contents'
          try {
            await item.update({ 'system.description': text })
            assertPersists(item, 'system.description', text, assert)
          } finally {
            await item.delete()
          }
        })

        it('motivation transfer AE activates on acute episode', async function () {
          const actor = await createTestAgent('item-motivation')
          try {
            await waitForActorBootstrap(actor)
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

        it('profession compendium item has skill definitions', async function () {
          if (!packAvailable('deltagreen.professions')) this.skip()
          const profession = await importCompendiumProfession()
          assert.equal(profession.type, 'profession')
          const autoKeys = Object.keys(profession.system.automaticSkills ?? {})
          assert.isAtLeast(autoKeys.length, 1)
        })

        it('ritual handler notes persist', async function () {
          const item = await createTestItem('ritual', 'functional')
          const html = '<p>Ritual handler notes</p>'
          try {
            await item.update({ 'system.handlerNotes': html })
            assertPersists(item, 'system.handlerNotes', html, assert)
          } finally {
            await item.delete()
          }
        })

        it('tome sanity damage roll uses item formulas', async function () {
          const actor = await createTestAgent('item-tome')
          const tome = await createTestItem('tome', 'functional')
          try {
            await tome.update({
              'system.sanity.successLoss': '2',
              'system.sanity.failedLoss': '1D4'
            })
            const { DGSanityDamageRoll } = await importDgRolls()
            const roll = new DGSanityDamageRoll(
              '{2, 1D4}',
              {},
              {
                rollType: 'sanity-damage',
                key: 'sanity',
                actor,
                item: tome,
                sanityDamageSource: 'item'
              }
            )
            await roll.evaluate()
            assert.isAtLeast(roll.terms.length, 1)
          } finally {
            await tome.delete()
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'Items: functional', preSelected: false }
  )
}
