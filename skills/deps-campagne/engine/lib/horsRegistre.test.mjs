import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isOutsideRegistry,
  findOutsideRegistryDeps,
  readDocumentedPackages,
  getOutsideRegistryVerdicts,
} from './horsRegistre.mjs'

test('reconnaît les specifiers qui contournent le registre', () => {
  for (const specifier of [
    'https://cdn.example/tableur-1.0.0.tgz',
    'git+https://github.com/org/repo.git',
    'github:org/repo#v1',
    'file:../vendor/paquet.tgz',
    'link:../ailleurs',
  ]) {
    assert.equal(isOutsideRegistry(specifier), true, specifier)
  }
})

test('laisse passer ce qui se résout au registre ou dans le workspace', () => {
  for (const specifier of [
    '^1.2.3',
    '1.2.3',
    '>=4 <5',
    'workspace:*',
    'catalog:',
    'npm:autre@^1',
  ]) {
    assert.equal(isOutsideRegistry(specifier), false, specifier)
  }
})

test('trouve les dépendances hors registre dans tous les champs, overrides compris', () => {
  const manifestes = [
    {
      chemin: 'apps/webapp/package.json',
      contenu: {
        dependencies: { tableur: 'https://cdn.example/tableur.tgz', react: '^19.0.0' },
        devDependencies: { outil: 'github:org/outil' },
      },
    },
    {
      chemin: 'package.json',
      contenu: {
        pnpm: { overrides: { 'paquet-x': '>=1.2.0 <2', patche: 'file:./patche.tgz' } },
      },
    },
  ]
  assert.deepEqual(findOutsideRegistryDeps(manifestes), [
    {
      paquet: 'tableur',
      specifier: 'https://cdn.example/tableur.tgz',
      manifeste: 'apps/webapp/package.json',
      champ: 'dependencies',
    },
    {
      paquet: 'outil',
      specifier: 'github:org/outil',
      manifeste: 'apps/webapp/package.json',
      champ: 'devDependencies',
    },
    {
      paquet: 'patche',
      specifier: 'file:./patche.tgz',
      manifeste: 'package.json',
      champ: 'pnpm.overrides',
    },
  ])
})

test('ne lit que le tableau de la section dédiée', () => {
  const markdown = `## Pins exacts

| Package | Version |
|---|---|
| \`ailleurs\` | 1.0.0 |

## Dépendances hors registre

| Paquet | Specifier |
|---|---|
| \`tableur\` (@exemple/web) | \`https://cdn.example/tableur.tgz\` |

## Overrides

| \`paquet-x: >=1.0.0\` | porteur |
`
  assert.deepEqual(readDocumentedPackages(markdown), ['tableur'])
})

test('rend une liste vide quand la section est absente', () => {
  assert.deepEqual(readDocumentedPackages('## Overrides\n\n| `paquet-x` | x |\n'), [])
})

test('marque comme non documentée une dépendance absente du tableau', () => {
  const trouvees = [
    { paquet: 'tableur', specifier: 'https://a', manifeste: 'a', champ: 'dependencies' },
    { paquet: 'inconnu', specifier: 'https://b', manifeste: 'b', champ: 'dependencies' },
  ]
  assert.deepEqual(
    getOutsideRegistryVerdicts(trouvees, ['tableur']).map(({ paquet, documente }) => ({
      paquet,
      documente,
    })),
    [
      { paquet: 'tableur', documente: true },
      { paquet: 'inconnu', documente: false },
    ],
  )
})
