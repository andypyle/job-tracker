// Screenshots Storybook stories from a static build, for comparing against Figma.
//
//   pnpm build-storybook -o /tmp/sb --quiet
//   node scripts/screenshot-stories.mjs /tmp/sb /tmp/shots components-actions-button--all-variants foundations-color--color
//
// Story IDs are in the Storybook URL (?path=/story/<id>). Add `|&globals=theme:dark` to an ID
// to force dark mode. Set WIDTH/HEIGHT to change the viewport (default 1300×700).
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const [root, out, ...ids] = process.argv.slice(2)
if (!root || !out || ids.length === 0) {
  console.error('usage: node scripts/screenshot-stories.mjs <storybook-static-dir> <out-dir> <story-id>...')
  process.exit(1)
}

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
}
// Serves only files inside the Storybook build, and only to this machine
const base = resolve(root)
const server = createServer(async (req, res) => {
  const path = resolve(base, '.' + decodeURIComponent(req.url.split('?')[0]))
  if (!path.startsWith(base + sep)) {
    res.writeHead(403)
    res.end()
    return
  }
  try {
    const body = await readFile(path)
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end()
  }
}).listen(6111, '127.0.0.1')

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: Number(process.env.WIDTH ?? 1300), height: Number(process.env.HEIGHT ?? 700) },
})
for (const entry of ids) {
  const [id, query = ''] = entry.split('|')
  await page.goto(`http://127.0.0.1:6111/iframe.html?id=${id}&viewMode=story${query}`)
  await page.waitForSelector('#storybook-root > *')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1200) // let animated icons load and settle
  const file = join(out, `${id}${query ? '-dark' : ''}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(file)
}
await browser.close()
server.close()
