import {
  createTestAgent,
  createTestItem,
  createTestNpc,
  createTestUnnatural,
  createTestVehicle,
  deleteTestActor,
  dgImport,
  renderSheetRoundTrip,
  useQuenchTimeout
} from '../helpers.js'

const ACTOR_FIELD_SPECS = [
  {
    label: 'agent',
    create: () => createTestAgent('sheet-persist'),
    fieldPath: 'system.physical.description'
  },
  {
    label: 'npc',
    create: () => createTestNpc('sheet-persist'),
    fieldPath: 'system.notes'
  },
  {
    label: 'unnatural',
    create: () => createTestUnnatural('sheet-persist'),
    fieldPath: 'system.notes'
  },
  {
    label: 'unnatural shortDescription',
    create: () => createTestUnnatural('sheet-persist-desc'),
    fieldPath: 'system.shortDescription',
    plainText: true
  },
  {
    label: 'vehicle',
    create: () => createTestVehicle('sheet-persist'),
    fieldPath: 'system.description'
  }
]

const ITEM_TYPE_SPECS = [
  { type: 'weapon' },
  { type: 'armor' },
  { type: 'bond' },
  { type: 'gear' },
  { type: 'motivation' },
  { type: 'profession' },
  { type: 'ritual' },
  { type: 'tome' }
]

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.sheets.persistence',
    (context) => {
      const { describe, it, assert } = context

      describe('Actor sheet round-trips', function () {
        useQuenchTimeout(this)

        for (const spec of ACTOR_FIELD_SPECS) {
          it(
            'persists ' +
              spec.label +
              (spec.plainText ? ' header field' : ' rich-text field') +
              ' after close and reopen',
            async function () {
              const value = spec.plainText
                ? 'Quench sheet ' + spec.label
                : '<p>Quench sheet ' + spec.label + '</p>'
              const actor = await spec.create()
              try {
                await renderSheetRoundTrip({
                  doc: actor,
                  fieldPath: spec.fieldPath,
                  value,
                  assert
                })
              } finally {
                await deleteTestActor(actor)
              }
            }
          )
        }
      })

      describe('Item sheet round-trips', function () {
        useQuenchTimeout(this)

        for (const spec of ITEM_TYPE_SPECS) {
          it('persists ' + spec.type + ' description after close and reopen', async function () {
            const html = '<p>Quench item ' + spec.type + '</p>'
            const item = await createTestItem(spec.type, 'sheet-persist')
            try {
              await renderSheetRoundTrip({
                doc: item,
                fieldPath: 'system.description',
                value: html,
                assert
              })
            } finally {
              await item.delete()
            }
          })
        }

        for (const type of ['ritual', 'tome']) {
          it('persists ' + type + ' handler notes after close and reopen', async function () {
            const html = '<p>Quench handler ' + type + '</p>'
            const item = await createTestItem(type, 'sheet-persist')
            try {
              await renderSheetRoundTrip({
                doc: item,
                fieldPath: 'system.handlerNotes',
                value: html,
                assert
              })
            } finally {
              await item.delete()
            }
          })
        }
      })

      describe('ProseMirror prep after round-trip', function () {
        useQuenchTimeout(this)

        it('prepareProseMirrorInput reflects saved agent physical description', async function () {
          const html = '<p>Round-trip mirror</p>'
          const actor = await createTestAgent('prose-roundtrip')
          try {
            await renderSheetRoundTrip({
              doc: actor,
              fieldPath: 'system.physical.description',
              value: html,
              assert
            })
            const { prepareProseMirrorInput } = await dgImport(
              '/systems/deltagreen/module/utils/rich-text.js'
            )
            const markup = await prepareProseMirrorInput(
              actor,
              'physical.description'
            )
            assert.include(markup, 'Round-trip mirror')
          } finally {
            await deleteTestActor(actor)
          }
        })
      })
    },
    { displayName: 'Sheets: persistence', preSelected: false }
  )
}
