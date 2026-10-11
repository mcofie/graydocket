import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

async function main() {
  // Render the real hero components without their browser-only animation classes.
  const source = (await fs.readFile(path.join(root, 'src/components/doodles/HeroDoodles.tsx'), 'utf8'))
    .replace("import styles from './hero-doodles.module.css'", 'const styles = {}')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  })
  const heroModule = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(require, heroModule, heroModule.exports)

  const art = (Component, x, y, width, height) => renderToStaticMarkup(React.createElement(Component))
    .replace('<svg ', `<svg x="${x}" y="${y}" width="${width}" height="${height}" `)
  const left = art(heroModule.exports.HeroArtLeft, 12, 158, 236, 310)
  const right = art(heroModule.exports.HeroArtRight, 952, 158, 236, 310)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#ffffff"/>
    ${left}${right}
    <g transform="translate(474 65)" fill="#44c67f">
      <rect width="12" height="12" rx="2.5"/><rect x="17" width="12" height="12" rx="2.5"/>
      <rect y="17" width="12" height="12" rx="2.5"/><rect x="17" y="17" width="12" height="12" rx="2.5"/>
    </g>
    <text x="519" y="90" font-family="Helvetica, Arial, sans-serif" font-size="31" font-weight="700" fill="#111827">GrayDocket</text>
    <g text-anchor="middle" font-family="Helvetica, Arial, sans-serif" fill="#111827" font-size="54" font-weight="500" letter-spacing="-2">
      <text x="600" y="252">Start your business.</text>
      <text x="600" y="320">We'll handle the paperwork.</text>
    </g>
    <g text-anchor="middle" font-family="Helvetica, Arial, sans-serif" fill="#474645" font-size="23">
      <text x="600" y="382">Register your business in Ghana in minutes.</text>
      <text x="600" y="416">We keep it compliant, so you can focus</text>
      <text x="600" y="450">on getting it off the ground.</text>
    </g>
    <text x="600" y="552" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#047857">graydocket.com</text>
  </svg>`

  const image = await sharp(Buffer.from(svg)).png({ palette: true, quality: 100 }).toBuffer()
  for (const target of ['src/app/opengraph-image.png', 'src/app/twitter-image.png', 'public/opengraph-image.png', 'public/twitter-image.png']) {
    await fs.writeFile(path.join(root, target), image)
  }
  console.log(`Updated social preview images: 1200x630, ${image.length} bytes`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
