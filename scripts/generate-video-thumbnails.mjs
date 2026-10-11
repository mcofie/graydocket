import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const modules = new Map()

// Render the shared SVG shapes as static assets, without browser CSS or animations.
function loadComponent(file) {
  if (modules.has(file)) return modules.get(file)
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  })
  const componentModule = { exports: {} }
  const localRequire = (id) => {
    if (id.endsWith('.css')) return {}
    if (id.startsWith('.')) return loadComponent(path.resolve(path.dirname(file), `${id}.tsx`))
    return require(id)
  }
  new Function('require', 'module', 'exports', outputText)(localRequire, componentModule, componentModule.exports)
  modules.set(file, componentModule.exports)
  return componentModule.exports
}

async function main() {
  const { videoScenes } = loadComponent(path.join(root, 'src/components/doodles/GuideBanner.tsx'))
  const { videos } = loadComponent(path.join(root, 'src/app/dashboard/resources/content.ts'))
  for (const video of videos) {
    const Scene = videoScenes[video.id]
    if (!Scene || !video.thumbnail?.startsWith('/thumbnails/')) {
      throw new Error(`Missing doodle thumbnail configuration for ${video.id}`)
    }
    const art = renderToStaticMarkup(React.createElement(Scene))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="#faf8f3"/>
      <g transform="translate(-80 40) scale(1.2)">
        <circle cx="400" cy="150" r="130" fill="#f1ede3"/>
        <circle cx="193" cy="190" r="59" fill="#f4f0e8"/>
        <circle cx="611" cy="116" r="69" fill="#f4f0e8"/>
        <ellipse cx="400" cy="278" rx="241" ry="9" fill="#e6dfd2" opacity=".5"/>
        ${art}
      </g>
    </svg>`
    const target = path.join(root, 'public', video.thumbnail)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    await sharp(Buffer.from(svg)).png({ palette: true }).toFile(target)
    console.log(`Updated ${video.thumbnail} (800x450)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
