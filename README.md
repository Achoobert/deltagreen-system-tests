# Delta Green System Tests Module

## Setup
- Run `npm install`
- Copy [`fvtt.config.example copy.js`](./fvtt.config.example%20copy.js) to `fvtt.config.js` and set `userDataPath` / `baseURL` for your Foundry install
- Run `npm run build` or `npm run watch`
- Run Foundry with the **Delta Green** system (compendium packs must be available)
- Install the [Quench](https://foundryvtt.com/packages/quench) module
- Create a DG world, enable **Quench** and **Delta Green System Tests**
- Match `baseURL` in `fvtt.config.js` to your Foundry URL for Cypress

## Quench batches

| Batch ID | Topic |
|----------|--------|
| `deltagreen.actors.smoke` | Actor types |
| `deltagreen.items.smoke` | Item types |
| `deltagreen.actors.derived` | Derived agent data |
| `deltagreen.agent.bonds` | Add / damage / remove bonds |
| `deltagreen.agent.combat` | Attacks, damage, armor (compendium gear) |
| `deltagreen.rolls` | Skill, weapon, modified, luck rolls |
| `deltagreen.activeEffects` | Roll targets, max HP, motivation AE |
| `deltagreen.physical` | Exhaustion, rest, stimulants |
| `deltagreen.prose` | HTML / ProseMirror persistence |
| `deltagreen.chargen` | Programmatic character creation commit |
| `deltagreen.compendiums` | Firearms, armor, unarmed packs |
| `deltagreen.stimulants.time` | Stimulant expiry after time advance (**active GM only**) |
| `deltagreen.api` | `game.deltagreen` surface |

**Notes:** Compendium tests require system packs (`deltagreen.firearms`, etc.). The stimulant time batch skips for non-GM users; calendar modules are not required for the basic `game.time.advance` check.

## Running tests
- In-world: **Quench** sidebar → run selected batches
- Cypress E2E: `npm run tests` (create-agent smoke only today)
