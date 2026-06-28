import { ITEM_SMOKE, useQuenchTimeout } from '../helpers.js'

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.items.smoke',
    (context) => {
      const { describe, it, assert } = context

      describe('Item creation', function () {
        useQuenchTimeout(this)

        for (const spec of ITEM_SMOKE) {
          it('creates a ' + spec.type + ' item', async function () {
            const name = 'Quench ' + spec.type + ' ' + foundry.utils.randomID()
            const item = await Item.create({ name, type: spec.type })
            try {
              assert.equal(item.type, spec.type)
              spec.assert(item, assert)
            } finally {
              await item.delete()
            }
          })
        }
      })
    },
    { displayName: 'Items: smoke' }
  )
}
