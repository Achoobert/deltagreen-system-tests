import { defineFoundryConfig } from './foundry-cypress.js'
import developmentOptions from './fvtt.config.js'

export default defineFoundryConfig({
  viewportWidth: 1024,
  viewportHeight: 700,
  e2e: {
    baseUrl: developmentOptions.baseURL || 'http://localhost:30000'
  }
})
