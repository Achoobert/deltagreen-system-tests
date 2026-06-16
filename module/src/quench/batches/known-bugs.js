/* global game */
import { createTestUnnatural } from '../helpers.js'
import {
  parseAttackLinesFromStatBlock,
  unarmedCombatRatingFromStatBlock
} from '../stat-parser-mirror.js'

const SAMPLE_STAT_BLOCK = `Quench Parser NPC
Horror from the deep
STR 12 CON 10 DEX 10 INT 10 POW 10 CHA 10
HP 12 WP 10 SAN 50
ACCOUNTING 0
ALERTNESS 40
Unarmed 45%
ATTACKS:
Claw 50% damage 1D6 ARMOR PIERCING 3
`

export default function register(quench) {
  quench.registerBatch(
    'deltagreen.known-bugs',
    (context) => {
      const { describe, it, assert } = context

      describe('Open issues (expected to fail until system fix)', function () {
        it('GitHub #388 unnatural creature description (shortDescription) persists', async function () {
          const actor = await createTestUnnatural('creature-desc')
          const text = 'Quench creature type description'
          try {
            await actor.update({ 'system.shortDescription': text })
            assert.equal(actor.system.shortDescription, text)
            actor.reset()
            assert.equal(actor._source.system.shortDescription, text)
            const refetched = game.actors.get(actor.id)
            assert.equal(refetched.system.shortDescription, text)
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #388 unnatural notes prose field persists', async function () {
          const actor = await createTestUnnatural('creature-notes')
          const html = '<p>Quench unnatural notes</p>'
          try {
            await actor.update({ 'system.notes': html })
            actor.reset()
            assert.equal(actor._source.system.notes, html)
          } finally {
            await actor.delete()
          }
        })

        it('GitHub #231 stat block Unarmed line sets unarmed_combat rating', function () {
          const rating = unarmedCombatRatingFromStatBlock(SAMPLE_STAT_BLOCK)
          assert.isAtLeast(
            rating,
            1,
            'Expected "Unarmed 45%" to map to unarmed_combat skill rating'
          )
          assert.equal(rating, 45)
        })

        it('GitHub #231 attack line sets armor piercing on parsed weapon', function () {
          const attacks = parseAttackLinesFromStatBlock(SAMPLE_STAT_BLOCK)
          const claw = attacks.find((a) => a.customSkillTarget === 50)
          assert.isOk(claw, 'Expected claw attack in ATTACKS section')
          assert.equal(claw.armorPiercing, 3)
        })
      })
    },
    {
      displayName: 'Known bugs (open issues)',
      preSelected: true
    }
  )
}
