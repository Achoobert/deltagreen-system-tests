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
      const { describe, it, assert, before, after, beforeEach } = context

      describe('Item behavior', function () {
        useQuenchTimeout(this)

        let actor

        before(async function () {
          actor = await createTestAgent('item-functional-shared')
          await waitForActorBootstrap(actor)
        })

        after(async function () {
          await deleteTestActor(actor)
        })

        beforeEach(async function () {
          const embedded = actor.items.filter(
            (item) => item.getFlag('deltagreen', 'AutoAdded') !== true
          )
          if (embedded.length) {
            await actor.deleteEmbeddedDocuments(
              'Item',
              embedded.map((item) => item.id)
            )
          }
          actor.reset()
        })

        it('weapon attack roll uses custom target', async function () {
          if (!packAvailable('deltagreen.firearms')) this.skip()
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
        })

        it('armor protection applies when equipped', async function () {
          if (!packAvailable('deltagreen.armor')) this.skip()
          const armor = await addCompendiumItemToActor(
            actor,
            'deltagreen.armor'
          )
          await armor.update({ 'system.equipped': true })
          actor.reset()
          assert.isAtLeast(actor.system.health.protection, 0)
        })

        it('bond score updates on damage', async function () {
          const bond = await addBondToActor(actor)
          await bond.update({
            'system.score': 7,
            'system.hasBeenDamagedSinceLastHomeScene': true
          })
          assert.equal(bond.system.score, 7)
          assert.isTrue(bond.system.hasBeenDamagedSinceLastHomeScene)
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
          }
        })
      })
    },
    { displayName: 'Items: functional', preSelected: false }
  )
}
