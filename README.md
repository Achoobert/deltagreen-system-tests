# Delta Green System Tests Module

Note: this is a testing module. I don't want to spend my life writing tests, so I have llms do as much as possible.
Take errors thown with that in mind.

for running against [The Delta Green system ](https://github.com/deltagreen-foundryvtt/delta-green-foundry-vtt-system) 

## Setup
- Run `npm install`
- Copy [`fvtt.config.example copy.js`](./fvtt.config.example%20copy.js) to `fvtt.config.js` and set `userDataPath` / `baseURL` for your Foundry install
   - a module needs to be generated from this code and added to foundry.
   - Match `baseURL` in `fvtt.config.js` to your Foundry URL for Cypress
- Run `npm run build` or `npm run watch`
   - this will buld the module, so it'll appear in your
- Run Foundry with the **Delta Green** system (compendium packs must be available)
- Install the [Quench](https://foundryvtt.com/packages/quench) module from the foundry store
- Create a DG world, enable **Quench** and **Delta Green System Tests**

You should now be able to run the quench tests from the sidebar:

<img src="readme_imgs/quench.webp" alt="quench button" style="max-width: 500px; width: 100%; height: auto;" />


Enabled modules in your DG world should look like this:
Quench and Delta Green System Tests enabled in the Foundry module list

<img src="readme_imgs/modules.webp" alt="Quench and Delta Green System Tests enabled in the Foundry module list" style="max-width: 500px; width: 100%; height: auto;" />

I'm too lazy to reload and go click that `Quench` button myself, so I have Cypress do it:
Do note that *your foundry world has to be running* for these tests to pass...

running `npm run tests:ci`:

<img src="readme_imgs/ci_tests.webp" alt="cypress in the CI" style="max-width: 500px; width: 100%; height: auto;" />

running `npm run tests`:

<img src="readme_imgs/cypress_tests.webp" alt="cypress browser mode" style="max-width: 500px; width: 100%; height: auto;" />



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
- Cypress E2E (interactive): `npm run tests` (create-agent smoke only today)
- Cypress E2E (headless / CI): `npm run tests:ci` (Foundry must be running; same world setup as interactive Cypress)
