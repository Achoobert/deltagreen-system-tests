import { dgImport } from '../helpers.js'

/** @param {string[]} keys @param {number} value */
function buildStatSpread (keys, value) {
  return Object.fromEntries(keys.map((key) => [key, value]))
}

export default function register (quench) {
  quench.registerBatch(
    'deltagreen.stat-setup',
    (context) => {
      const { describe, it, assert } = context

      describe('Point-buy stat setup', function () {
        it('getDefaultPointBuyValues starts at minimum with 54 points remaining', async function () {
          const {
            STAT_KEYS,
            STAT_MIN,
            POINT_BUY_TOTAL,
            getDefaultPointBuyValues,
            computePointsRemaining
          } = await dgImport('/systems/deltagreen/module/profession/stat-setup.js')

          const values = getDefaultPointBuyValues()
          assert.equal(Object.keys(values).length, STAT_KEYS.length)
          for (const key of STAT_KEYS) {
            assert.equal(values[key], STAT_MIN)
          }
          assert.equal(computePointsRemaining(values), POINT_BUY_TOTAL - STAT_MIN * STAT_KEYS.length)
        })

        it('validatePointBuyValues accepts a valid 72-point spread', async function () {
          const {
            STAT_KEYS,
            validatePointBuyValues,
            buildPointBuyValidationMessages
          } = await dgImport('/systems/deltagreen/module/profession/stat-setup.js')

          const values = buildStatSpread(STAT_KEYS, 12)
          const result = validatePointBuyValues(values)
          assert.isTrue(result.isValid)
          assert.equal(result.remaining, 0)
          assert.isEmpty(buildPointBuyValidationMessages(values))
        })

        it('validatePointBuyValues rejects out-of-range and non-integer stats', async function () {
          const {
            STAT_KEYS,
            STAT_MIN,
            STAT_MAX,
            validatePointBuyValues,
            buildPointBuyValidationMessages,
            getPointBuyInvalidKeys
          } = await dgImport('/systems/deltagreen/module/profession/stat-setup.js')

          const belowMin = buildStatSpread(STAT_KEYS, STAT_MIN)
          belowMin.str = STAT_MIN - 1
          assert.isFalse(validatePointBuyValues(belowMin).isValid)
          assert.include(getPointBuyInvalidKeys(belowMin), 'str')
          assert.isNotEmpty(buildPointBuyValidationMessages(belowMin))

          const aboveMax = buildStatSpread(STAT_KEYS, STAT_MIN)
          aboveMax.con = STAT_MAX + 1
          assert.isFalse(validatePointBuyValues(aboveMax).isValid)
          assert.include(getPointBuyInvalidKeys(aboveMax), 'con')

          const nonInteger = buildStatSpread(STAT_KEYS, STAT_MIN)
          nonInteger.dex = 12.5
          assert.isFalse(validatePointBuyValues(nonInteger).isValid)
          assert.include(getPointBuyInvalidKeys(nonInteger), 'dex')

          const missing = buildStatSpread(STAT_KEYS, STAT_MIN)
          missing.pow = Number.NaN
          assert.isFalse(validatePointBuyValues(missing).isValid)
          assert.include(getPointBuyInvalidKeys(missing), 'pow')
        })

        it('validatePointBuyValues rejects valid integers that do not total 72', async function () {
          const {
            STAT_KEYS,
            validatePointBuyValues,
            buildPointBuyValidationMessages,
            getPointBuyInvalidKeys
          } = await dgImport('/systems/deltagreen/module/profession/stat-setup.js')

          const values = buildStatSpread(STAT_KEYS, 11)
          const result = validatePointBuyValues(values)
          assert.isFalse(result.isValid)
          assert.notEqual(result.remaining, 0)
          assert.isEmpty(getPointBuyInvalidKeys(values))
          assert.lengthOf(buildPointBuyValidationMessages(values), 1)
        })

        it('computePointsRemaining ignores non-finite values', async function () {
          const {
            STAT_KEYS,
            STAT_MIN,
            POINT_BUY_TOTAL,
            computePointsRemaining
          } = await dgImport('/systems/deltagreen/module/profession/stat-setup.js')

          const values = buildStatSpread(STAT_KEYS, STAT_MIN)
          values.int = Number.NaN
          const validCount = STAT_KEYS.length - 1
          assert.equal(
            computePointsRemaining(values),
            POINT_BUY_TOTAL - STAT_MIN * validCount
          )
        })
      })
    }
  )
}
