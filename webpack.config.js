import { fileURLToPath } from 'url'
import * as fs from 'fs'
import * as path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import developmentOptions from './fvtt.config.js'
import TerserPlugin from 'terser-webpack-plugin'

const rootFolder = path.dirname(fileURLToPath(import.meta.url))

export default (env, argv) => {
  const buildMode = argv.mode === 'production' ? 'production' : 'development'

  return {
    bail: buildMode === 'production',
    context: rootFolder,
    entry: './module/src/deltagreen.js',
    devtool: 'inline-source-map',
    mode: buildMode,
    optimization:
      buildMode === 'production'
        ? {
            minimize: true,
            minimizer: [
              new TerserPlugin({
                terserOptions: {
                  mangle: false
                }
              })
            ],
            splitChunks: {
              chunks: 'all',
              cacheGroups: {
                default: {
                  name: 'main',
                  test: 'module/deltagreen.js'
                }
              }
            }
          }
        : undefined,
    output: {
      clean: true,
      path: buildDestination(),
      filename: 'module.js'
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: copyList()
      })
    ],
    resolve: {
      extensions: ['.js']
    },
    watch: buildMode === 'development'
  }
}

/**
 * Get the user data path for Foundry VTT, based on what is configured on key
 * userDataPath inside fvtt.config.js
 */
function buildDestination () {
  try {
    const { userDataPath } = developmentOptions
    let check = ''
    if (fs.existsSync(check = rootFolder + '/module/module.json')) {
      const json = JSON.parse(fs.readFileSync(check, 'utf8'))
      if (typeof json.id !== 'undefined') {
        if (fs.existsSync(userDataPath)) {
          return path.join(userDataPath, 'Data', 'modules', json.id)
        }
      }
    }
  } catch {
    //
  }
  return path.join(rootFolder, 'build/')
}

function copyList () {
  const list = []
  if (fs.existsSync('module/assets/')) {
    list.push({ from: 'module/assets/', to: 'assets/' })
  }
  if (fs.existsSync('module/lang/')) {
    list.push({ from: 'module/lang/', to: 'lang/' })
  }
  if (fs.existsSync('module/packs/')) {
    list.push({ from: 'module/packs/', to: 'packs/' })
  }
  if (fs.existsSync('module/templates/')) {
    list.push({ from: 'module/templates/', to: 'templates/' })
  }
  if (fs.existsSync('module/README.md')) {
    list.push({ from: 'module/README.md', to: 'README.md' })
  }
  list.push({ from: 'module/LICENSE', to: 'LICENSE', toType: 'file' })
  list.push({ from: 'module/module.json', to: 'module.json' })
  return list
}
