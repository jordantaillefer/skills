import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifierRacine, preparer } from './racine.mjs'

const dossierVide = () => mkdtempSync(join(tmpdir(), 'deps-campagne-racine-'))

test('racine incomplète', () => {
  assert.deepEqual(verifierRacine(dossierVide()), ['pnpm-workspace.yaml', 'pnpm-lock.yaml'])
})

test('racine complète', () => {
  const dossier = dossierVide()
  writeFileSync(join(dossier, 'pnpm-workspace.yaml'), 'packages: []\n')
  writeFileSync(join(dossier, 'pnpm-lock.yaml'), '')
  assert.deepEqual(verifierRacine(dossier), [])
})

test('preparer hors racine', async () => {
  await assert.rejects(
    () => preparer({ racine: dossierVide() }),
    (e) => e.message.includes('pnpm-workspace.yaml') && e.message.includes('racine'),
  )
})

test('preparer à la racine sans config', async () => {
  const dossier = dossierVide()
  writeFileSync(join(dossier, 'pnpm-workspace.yaml'), 'packages: []\n')
  writeFileSync(join(dossier, 'pnpm-lock.yaml'), '')
  await assert.rejects(
    () => preparer({ racine: dossier }),
    (e) => e.message.startsWith('deps-campagne.config.json :'),
  )
})

test('preparer rend la config quand tout est en place', async () => {
  const dossier = dossierVide()
  writeFileSync(join(dossier, 'pnpm-workspace.yaml'), 'packages: []\n')
  writeFileSync(join(dossier, 'pnpm-lock.yaml'), '')
  writeFileSync(
    join(dossier, 'deps-campagne.config.json'),
    JSON.stringify({ workspaces: [{ paquet: '@exemple/api' }] }),
  )
  writeFileSync(join(dossier, 'DEPENDENCIES.md'), '# Dépendances\n')
  const config = await preparer({ racine: dossier })
  assert.equal(config.workspaces[0].paquet, '@exemple/api')
})

test('preparer sans fichier de dépendances', async () => {
  const dossier = dossierVide()
  writeFileSync(join(dossier, 'pnpm-workspace.yaml'), 'packages: []\n')
  writeFileSync(join(dossier, 'pnpm-lock.yaml'), '')
  writeFileSync(
    join(dossier, 'deps-campagne.config.json'),
    JSON.stringify({ workspaces: [{ paquet: '@exemple/api' }] }),
  )
  await assert.rejects(
    () => preparer({ racine: dossier }),
    (e) => e.message.includes('DEPENDENCIES.md') && e.message.includes('DEPENDENCIES.example.md'),
  )
})
