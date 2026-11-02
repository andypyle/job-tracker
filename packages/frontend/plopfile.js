import fs from 'node:fs'
import path from 'node:path'

const COMPONENTS_DIR = 'src/components'
const TEMPLATES_DIR = 'plop-templates/component'

const variantsPrompt = {
  type: 'confirm',
  name: 'withVariants',
  message: 'Include a .variants.ts file (class-variance-authority)?',
  default: false,
}

const requiredName = (label) => (value) => (value.trim() ? true : `A ${label} name is required`)

// Component folders that follow the ComponentName/ComponentName.tsx convention
function listComponents() {
  return fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(COMPONENTS_DIR, entry.name, `${entry.name}.tsx`)))
    .map((entry) => entry.name)
}

// One `add` action per file; `data` supplies the location-dependent template values
function addFiles({ dir, files, data }) {
  return files.map((ext) => ({
    type: 'add',
    path: `${dir}/{{pascalCase name}}.${ext}`,
    templateFile: `${TEMPLATES_DIR}/Component.${ext}.hbs`,
    data,
    abortOnFail: true,
  }))
}

/** @param {import('plop').NodePlopAPI} plop */
export default function (plop) {
  plop.setGenerator('component', {
    description: 'React component with types, stories, and optional cva variants',
    prompts: [
      { type: 'input', name: 'name', message: 'Component name:', validate: requiredName('component') },
      variantsPrompt,
    ],
    actions: (data) => {
      const files = ['tsx', 'types.ts', 'stories.tsx']
      if (data?.withVariants) files.push('variants.ts')

      return addFiles({
        dir: `${COMPONENTS_DIR}/{{pascalCase name}}`,
        files,
        data: { libPath: '../../lib', storyTitle: plop.renderString('Components/{{pascalCase name}}', data) },
      })
    },
  })

  // Parts are private building blocks of a single component, kept in that component's parts/ folder
  plop.setGenerator('part', {
    description: 'Part of an existing component, in ComponentName/parts/PartName',
    prompts: [
      {
        type: 'list',
        name: 'parent',
        message: 'Which component is this part of?',
        choices: listComponents(),
      },
      { type: 'input', name: 'name', message: 'Part name:', validate: requiredName('part') },
      variantsPrompt,
      {
        type: 'confirm',
        name: 'withStories',
        message: 'Include a .stories.tsx file?',
        default: false,
      },
    ],
    actions: (data) => {
      const files = ['tsx', 'types.ts']
      if (data?.withStories) files.push('stories.tsx')
      if (data?.withVariants) files.push('variants.ts')

      return addFiles({
        dir: `${COMPONENTS_DIR}/{{parent}}/parts/{{pascalCase name}}`,
        files,
        data: { libPath: '../../../../lib', storyTitle: plop.renderString('Components/{{parent}}/Parts/{{pascalCase name}}', data) },
      })
    },
  })
}
