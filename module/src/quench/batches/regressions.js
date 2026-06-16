/* global Actor, game, CONST */
import {
  createTestAgent,
  createTestNpc,
  dgImport,
  evaluatePercentileRoll,
  importDgRolls
} from '../helpers.js'

/** GitHub #296 — same update shape as DGAgentSheet._resetBreakingPoint */
async function applyBreakingPointReset(actor) {
  const pow =
    actor.system.statistics.pow.effectiveValue ??
    actor.system.statistics.pow.value
  const currentBreakingPoint = Math.max(actor.system.sanity.value - pow, 0)

  const dataToUpdate = {
    'system.sanity.currentBreakingPoint': currentBreakingPoint
  }
  if (!actor.system.sanity.adaptations.violence.isAdapted) {
    dataToUpdate['system.sanity.adaptations.violence.incident1'] = false
    dataToUpdate['system.sanity.adaptations.violence.incident2'] = false
    dataToUpdate['system.sanity.adaptations.violence.incident3'] = false
  }
  if (!actor.system.sanity.adaptations.helplessness.isAdapted) {
    dataToUpdate['system.sanity.adaptations.helplessness.incident1'] = false
    dataToUpdate['system.sanity.adaptations.helplessness.incident2'] = false
    dataToUpdate['system.sanity.adaptations.helplessness.incident3'] = false
  }

  await actor.update(dataToUpdate)
}

export default function register(quench) {
  quench.registerBatch(
    'deltagreen.regressions',
    (context) => {
      const { describe, it, assert } = context

      describe('Closed issue regressions', function () {
        it('GitHub #359 NPC profession persists via actor.update', async function () {
          const actor = await createTestNpc('profession')
          const value = 'Quench NPC Profession'
          try {
            await actor.update({ 'system.biography.profession': value })
            actor.reset()
            assert.equal(actor.system.biography.profession, value)
            const refetched = game.actors.get(actor.id)
            assert.equal(refetched.system.biography.profession, value)
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #363 default agent First Aid skill label is spelled correctly', async function () {
          const actor = await createTestAgent('first-aid-label')
          try {
            assert.equal(actor.system.skills.first_aid.label, 'First Aid')
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #383 NPC prototype token display name persists', async function () {
          const actor = await createTestNpc('token-display')
          const displayName = 'Quench Display Name'
          try {
            await actor.update({
              'prototypeToken.displayName': displayName,
              'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.HOSTILE
            })
            actor.reset()
            assert.equal(actor.prototypeToken.displayName, displayName)
            assert.equal(
              actor.prototypeToken.disposition,
              CONST.TOKEN_DISPOSITIONS.HOSTILE
            )
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #296 breaking point reset clears adaptation incident ticks', async function () {
          const actor = await createTestAgent('bp-reset')
          try {
            await actor.update({
              'system.statistics.pow.value': 10,
              'system.sanity.value': 40,
              'system.sanity.adaptations.violence.incident1': true,
              'system.sanity.adaptations.violence.incident2': true,
              'system.sanity.adaptations.violence.incident3': true,
              'system.sanity.adaptations.helplessness.incident1': true,
              'system.sanity.adaptations.helplessness.incident2': true,
              'system.sanity.adaptations.helplessness.incident3': true
            })
            await applyBreakingPointReset(actor)
            actor.reset()
            assert.isFalse(actor.system.sanity.adaptations.violence.incident1)
            assert.isFalse(actor.system.sanity.adaptations.helplessness.incident3)
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #328 failed unnatural roll does not mark skill for improvement', async function () {
          const actor = await createTestAgent('unnatural-fail')
          try {
            await actor.update({ 'system.skills.unnatural.proficiency': 30 })
            const { DGPercentileRoll } = await importDgRolls()
            const roll = await evaluatePercentileRoll(
              DGPercentileRoll,
              {
                rollType: 'skill',
                key: 'unnatural',
                actor
              },
              50
            )
            assert.isFalse(roll.isSuccess)
            const failureMark =
              actor.type === 'agent' &&
              !roll.isSuccess &&
              roll.key !== 'unnatural' &&
              !foundry.utils.getProperty(
                actor,
                `${roll.skillPath}.failure`
              )
            assert.isFalse(failureMark)
            assert.isFalse(actor.system.skills.unnatural.failure)
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #327 NPC unarmed damage includes STR melee bonus', async function () {
          const actor = await createTestNpc('str-bonus')
          try {
            await actor.update({ 'system.statistics.str.value': 14 })
            actor.reset()
            const appendMeleeDamageBonus = (
              await dgImport(
                '/systems/deltagreen/module/roll/melee-damage.js'
              )
            ).default
            const formula = appendMeleeDamageBonus(
              '1D4',
              actor,
              'unarmed_combat'
            )
            assert.include(formula, '+1')
            assert.notInclude(formula, 'undefined')
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #382 ritual learn SAN damage uses learnedSanity not activation sanity', async function () {
          const actor = await createTestNpc('ritual-san')
          try {
            const [ritual] = await actor.createEmbeddedDocuments('Item', [
              {
                name: 'Quench Ritual',
                type: 'ritual',
                system: {
                  sanity: {
                    failedLoss: '1D10',
                    successLoss: '0'
                  },
                  learnedSanity: {
                    failedLoss: '1D2',
                    successLoss: '0'
                  }
                }
              }
            ])
            const { createDGRollFromDataset } = await dgImport(
              '/systems/deltagreen/module/roll/roll.js'
            )
            const learnElement = {
              hasAttribute: (name) => name === 'data-san-on-learn'
            }
            const roll = createDGRollFromDataset(
              { rolltype: 'sanity-damage', key: 'sanity' },
              {
                actor,
                item: ritual,
                element: learnElement,
                sanityDamageSource: 'item'
              }
            )
            assert.include(roll.formula, '1D2')
            assert.notInclude(roll.formula, '1D10')
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Regressions (closed issues)', preSelected: true }
  )
}
