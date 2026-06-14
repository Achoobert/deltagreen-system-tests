import { defineConfig } from 'cypress'
import developmentOptions from './fvtt.config.js'

let { baseURL } = developmentOptions

if (!baseURL) {
  baseURL = 'http://localhost:30000'
}

export default defineConfig({
  e2e: {
    baseUrl: baseURL,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 60000,
    retries: {
      runMode: 2,
      openMode: 0
    }
  },
  viewportWidth: 1024,
  viewportHeight: 700
})
