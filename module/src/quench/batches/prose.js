/* global game */
import { createTestAgent, dgImport, useQuenchTimeout } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.prose',
    (context) => {
      const { describe, it, assert } = context

      describe('Prose / HTML fields', function () {
        useQuenchTimeout(this)

        it('updates and persists physical description', async function () {
          const actor = await createTestAgent('prose')
          const html = '<p>Quench prose test</p>'
          try {
            await actor.update({ 'system.physical.description': html })
            assert.equal(actor.system.physical.description, html)
            actor.reset()
            assert.equal(
              actor._source.system.physical.description,
              html
            )
            const refetched = game.actors.get(actor.id)
            assert.equal(refetched.system.physical.description, html)
          } finally {
            await actor.delete()
          }
        })

        it('prepareProseMirrorInput includes saved content', async function () {
          const actor = await createTestAgent('prose-input')
          const html = '<p>Mirror box</p>'
          try {
            await actor.update({ 'system.physical.description': html })
            const { prepareProseMirrorInput } = await dgImport(
              '/systems/deltagreen/module/utils/rich-text.js'
            )
            const markup = await prepareProseMirrorInput(
              actor,
              'physical.description'
            )
            assert.include(markup, 'Mirror box')
          } finally {
            await actor.delete()
          }
        })
      })
    },
    { displayName: 'Prose fields', preSelected: false }
  )
}
