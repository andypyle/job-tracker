// Reads tokens.css itself, so the Foundations pages can't drift from the real tokens.
import css from '../tokens.css?raw'

export interface ColorToken {
  /** Figma-style name, e.g. "bg/canvas" */
  name: string
  /** CSS variable, e.g. "--color-bg-canvas" */
  cssVar: string
  /** Primitive aliases, e.g. "pine/100" */
  light: string
  dark: string
}

export interface Primitive {
  name: string
  cssVar: string
  value: string
}

const declarations = [...css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => ({
  name,
  value: value.trim(),
}))

// "--pine-100" -> "pine/100", "--overlay-scrim-dark" -> "overlay/scrim-dark"
const primitiveName = (cssVar: string) => cssVar.slice(2).replace('-', '/')

const alias = (value: string) => {
  const match = value.match(/var\((--[\w-]+)\)/)
  return match ? primitiveName(match[1]) : value
}

export const colorTokens: ColorToken[] = declarations
  .filter((d) => d.name.startsWith('--color-'))
  .map(({ name, value }) => {
    const pair = value.match(/^light-dark\((.+),\s*(var\(.+\))\)$/)
    return {
      name: name.slice('--color-'.length).replace('-', '/'),
      cssVar: name,
      light: alias(pair ? pair[1] : value),
      dark: alias(pair ? pair[2] : value),
    }
  })

/** Semantic colors grouped by their first segment ("bg", "text", ...), in file order */
export function colorGroups(exclude: string[] = []) {
  const groups = new Map<string, ColorToken[]>()
  for (const token of colorTokens) {
    const group = token.name.split('/')[0]
    if (exclude.includes(group)) continue
    groups.set(group, [...(groups.get(group) ?? []), token])
  }
  return groups
}

const primitiveFamilies = [
  'white',
  'pine',
  'chartreuse',
  'coral',
  'cobalt',
  'brick',
  'overlay',
] as const

/** Primitive ramps, each sorted by step */
export const primitives = primitiveFamilies.map((family) => ({
  family,
  steps: declarations
    .filter((d) => d.name === `--${family}` || d.name.startsWith(`--${family}-`))
    .map<Primitive>(({ name, value }) => ({ name: primitiveName(name), cssVar: name, value }))
    .sort((a, b) => (parseInt(a.name.split('/')[1]) || 0) - (parseInt(b.name.split('/')[1]) || 0)),
}))

/** Values of other tokens by name prefix, e.g. tokensWithPrefix('--radius-') */
export const tokensWithPrefix = (prefix: string) =>
  declarations
    .filter((d) => d.name.startsWith(prefix) && !d.name.includes('--', 2))
    .map(({ name, value }) => ({ name: name.slice(prefix.length), cssVar: name, value }))
