/**
 * Mirrors skill/attack parsing in
 * systems/deltagreen/module/macros/stat-parser-macro.js (for Quench #231).
 * Update when the system parser changes.
 */

export const SAMPLE_STAT_BLOCK = `Quench Parser NPC
Horror from the deep
STR 12 CON 10 DEX 10 INT 10 POW 10 CHA 10
HP 12 WP 10 SAN 50
ACCOUNTING 0
ALERTNESS 40
Unarmed 45%
ATTACKS:
Claw 50% damage 1D6 ARMOR PIERCING 3
`

export function getSkillRatingsFromInput(inputText, skill) {
  const matchStr = `(?:${skill}\\n?\\s?\\n?)(\\d\\d?)`
  const re = new RegExp(matchStr, 'i')
  const results = inputText.match(re)
  if (results != null && results.length > 1) {
    return parseInt(results[1], 10)
  }
  return 0
}

/** @internal Matches system parser: only "UNARMED COMBAT" skill line, not "Unarmed". */
export function unarmedCombatRatingFromStatBlock(inputStr) {
  return getSkillRatingsFromInput(inputStr, 'UNARMED COMBAT')
}

export function parseAttackLinesFromStatBlock(inputText) {
  const attacks = []
  const lines = inputText
    .replace('; \r\n', ';')
    .replace(';\r\n', ';')
    .replace(';\n', ';')
    .replace('; \n', ';')
    .split(/\r?\n/)

  let isInAttackSection = false

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toString().toUpperCase().indexOf('ATTACKS:') >= 0) {
      isInAttackSection = true
    } else if (
      isInAttackSection &&
      lines[i].toString().toUpperCase().indexOf(':') > 0
    ) {
      isInAttackSection = false
    }

    if (!isInAttackSection) continue

    const attackLine = lines[i]
      .toString()
      .toUpperCase()
      .replace('ATTACKS:', '')

    const weaponData = {
      armorPiercing: 0,
      customSkillTarget: 0,
      damage: '0',
      isLethal: false
    }

    if (attackLine.indexOf('LETHALITY') >= 0) {
      weaponData.isLethal = true
    } else {
      const skillMatchStr =
        '(\\w.*?)(\\d?\\d%)([\\S\\s]*?damage\\s.*?)?(\\d?d\\d?\\d?\\d([\\+\\-]\\d+)?)?'
      const skillResults = attackLine.match(new RegExp(skillMatchStr, 'i'))
      if (skillResults?.[1]) {
        if (skillResults[2]) {
          weaponData.customSkillTarget = parseInt(
            skillResults[2].toString().replace('%', '').replace(';', ''),
            10
          )
        }
        if (skillResults[4]) {
          weaponData.damage = skillResults[4].toString().replace(';', '')
        }
      }
      if (attackLine.indexOf('ARMOR PIERCING') >= 0) {
        const apMatch = attackLine.match(/ARMOR\s+PIERCING\s*(\d+)/i)
        weaponData.armorPiercing = apMatch?.[1] ? parseInt(apMatch[1], 10) : 5
      }
    }

    if (weaponData.customSkillTarget > 0 || weaponData.isLethal) {
      attacks.push(weaponData)
    }
  }

  return attacks
}
