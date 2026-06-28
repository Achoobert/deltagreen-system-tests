import {
  createTestAgent,
  deleteTestActor,
  settleAgentSideEffects,
  useQuenchTimeout,
  waitForActorBootstrap,
  waitForChatMessage,
  withSanityRollSource,
  withSetting
} from '../helpers.js'

async function applySanityBaseline (actor) {
  await actor.update({
    'system.sanity.value': 50,
    'system.sanity.currentBreakingPoint': 30,
    'system.sanity.adaptations.violence.incident1': false,
    'system.sanity.adaptations.violence.incident2': false,
    'system.sanity.adaptations.violence.incident3': false,
    'system.sanity.adaptations.helplessness.incident1': false,
    'system.sanity.adaptations.helplessness.incident2': false,
    'system.sanity.adaptations.helplessness.incident3': false
  })
  if (actor.getFlag('deltagreen', 'lastSanityRollSource') !== undefined) {
    await actor.unsetFlag('deltagreen', 'lastSanityRollSource')
  }
}

function messageCount () {
  return game.messages.size
}

/** Nested tick/clear updates can lag on actor.system until reset. */
async function syncActor (actor) {
  await settleAgentSideEffects(actor)
  actor.reset()
}

function violenceIncidents (actor) {
  const v = actor.system.sanity.adaptations.violence
  return [v.incident1, v.incident2, v.incident3]
}

function helplessnessIncidents (actor) {
  const h = actor.system.sanity.adaptations.helplessness
  return [h.incident1, h.incident2, h.incident3]
}

/** Same update shape as DGAgentSheet._resetBreakingPoint */
async function applyBreakingPointReset (actor) {
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

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.sanity.automation',
    (context) => {
      const { describe, it, assert, before, after, beforeEach } = context

      describe('SAN automation', function () {
        useQuenchTimeout(this)

        let actor

        before(async function () {
          actor = await createTestAgent('san-shared')
          await waitForActorBootstrap(actor)
        })

        after(async function () {
          await deleteTestActor(actor)
        })

        beforeEach(async function () {
          await applySanityBaseline(actor)
          await syncActor(actor)
        })

        it('small loss with violence source ticks next incident', async function () {
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 47 })
          })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [true, false, false])
        })

        it('small loss with helplessness source ticks helplessness incident', async function () {
          await withSanityRollSource(actor, 'helplessness', async () => {
            await actor.update({ 'system.sanity.value': 48 })
          })
          await syncActor(actor)
          assert.deepEqual(helplessnessIncidents(actor), [true, false, false])
        })

        it('small loss with unnatural source does not tick incidents', async function () {
          await withSanityRollSource(actor, 'unnatural', async () => {
            await actor.update({ 'system.sanity.value': 49 })
          })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [false, false, false])
          assert.deepEqual(helplessnessIncidents(actor), [false, false, false])
        })

        it('4-point loss ticks instead of clearing partial incidents', async function () {
          await actor.update({
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true
          })
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 46 })
          })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [true, true, true])
          assert.isTrue(actor.system.sanity.adaptations.violence.isAdapted)
        })

        it('5+ SAN loss clears all partial violence incidents and posts temp insanity chat', async function () {
          await actor.update({
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true,
            'system.sanity.adaptations.helplessness.incident1': true
          })
          const before = messageCount()
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 44 })
          })
          await waitForChatMessage(actor.name, { beforeCount: before })
          await syncActor(actor)
          assert.isAbove(messageCount(), before)
          assert.deepEqual(violenceIncidents(actor), [false, false, false])
          assert.deepEqual(helplessnessIncidents(actor), [true, false, false])
        })

        it('exactly 5-point loss clears correlated violence incidents', async function () {
          await actor.update({
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true
          })
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 45 })
          })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [false, false, false])
        })

        it('5+ SAN loss without roll source leaves incidents unchanged', async function () {
          await actor.update({
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true
          })
          const before = messageCount()
          await withSanityRollSource(actor, 'none', async () => {
            await actor.update({ 'system.sanity.value': 44 })
          })
          await waitForChatMessage(actor.name, { beforeCount: before })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [true, true, false])
        })

        it('5+ SAN loss does not clear an already adapted track', async function () {
          await actor.update({
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true,
            'system.sanity.adaptations.violence.incident3': true
          })
          assert.isTrue(actor.system.sanity.adaptations.violence.isAdapted)
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 44 })
          })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [true, true, true])
          assert.isTrue(actor.system.sanity.adaptations.violence.isAdapted)
        })

        it('dropping to breaking point clears both adaptation tracks', async function () {
          await actor.update({
            'system.sanity.value': 36,
            'system.sanity.currentBreakingPoint': 35,
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true,
            'system.sanity.adaptations.helplessness.incident1': true
          })
          const before = messageCount()
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 34 })
          })
          await waitForChatMessage(actor.name, { beforeCount: before })
          await syncActor(actor)
          assert.isAbove(messageCount(), before)
          assert.deepEqual(violenceIncidents(actor), [false, false, false])
          assert.deepEqual(helplessnessIncidents(actor), [false, false, false])
          assert.isTrue(actor.system.sanity.breakingPointHit)
        })

        it('5+ SAN loss crossing breaking point clears both tracks in one update', async function () {
          await actor.update({
            'system.sanity.value': 40,
            'system.sanity.currentBreakingPoint': 35,
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true,
            'system.sanity.adaptations.helplessness.incident1': true,
            'system.sanity.adaptations.helplessness.incident2': true
          })
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 34 })
          })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [false, false, false])
          assert.deepEqual(helplessnessIncidents(actor), [false, false, false])
          assert.isTrue(actor.system.sanity.breakingPointHit)
        })

        it('completing adaptation posts adaptation chat', async function () {
          const before = messageCount()
          await actor.update({
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true,
            'system.sanity.adaptations.violence.incident3': true
          })
          await waitForChatMessage('Adapted to Violence', { beforeCount: before })
          await syncActor(actor)
          assert.isAbove(messageCount(), before)
          assert.isTrue(actor.system.sanity.adaptations.violence.isAdapted)
        })

        it('automation disabled skips incident ticks', async function () {
          await withSetting('automateAdaptationTicks', false, async () => {
            await withSanityRollSource(actor, 'violence', async () => {
              await actor.update({ 'system.sanity.value': 47 })
            })
          })
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [false, false, false])
        })

        it('breaking point reset clears non-adapted incidents', async function () {
          await actor.update({
            'system.sanity.value': 40,
            'system.sanity.adaptations.violence.incident1': true,
            'system.sanity.adaptations.violence.incident2': true,
            'system.sanity.adaptations.helplessness.incident1': true
          })
          await applyBreakingPointReset(actor)
          await syncActor(actor)
          assert.deepEqual(violenceIncidents(actor), [false, false, false])
          assert.deepEqual(helplessnessIncidents(actor), [false, false, false])
        })

        it('incident-only updates do not re-trigger sanity loss chat', async function () {
          const before = messageCount()
          await withSanityRollSource(actor, 'violence', async () => {
            await actor.update({ 'system.sanity.value': 44 })
          })
          await waitForChatMessage(actor.name, { beforeCount: before })
          const afterLoss = messageCount()
          await actor.update({
            'system.sanity.adaptations.violence.incident1': true
          })
          await syncActor(actor)
          assert.equal(messageCount(), afterLoss)
        })
      })
    },
    { displayName: 'SAN: automation', preSelected: true }
  )
}
