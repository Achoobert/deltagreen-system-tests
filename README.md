# Delta Green System Tests Module

## Setup
- Run `npm install`
- Copy [`fvtt.config.example copy.js`](./fvtt.config.example%20copy.js) to `fvtt.config.js` and set `userDataPath` / `baseURL` for your Foundry install
- Run `npm run build` or `npm run watch`
- Run Foundry
- Install the [Quench](https://foundryvtt.com/packages/quench) module
- Create a new world using the [Delta Green](https://github.com/deltagreen-foundryvtt/delta-green-foundry-vtt-system) system
- Enable Quench and this module in the world
- Check that `baseURL` in `fvtt.config.js` (used by `cypress.config.js`) matches your Foundry URL

## Running tests
- Run Quench in-game tests from the **Quench** sidebar button
- Run Cypress E2E tests with `npm run tests` (or `npx cypress open`) and open the browser tests in Chrome against a logged-in DG world
