import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validerConfig, chargerConfig, NOM_CONFIG } from './config.mjs'

function dossierAvec(contenu) {
  const dossier = mkdtempSync(join(tmpdir(), 'deps-campagne-config-'))
  if (contenu !== undefined) writeFileSync(join(dossier, NOM_CONFIG), contenu)
  return dossier
}

test('config minimale valide', () => {
  assert.deepEqual(validerConfig({ workspaces: [{ paquet: '@exemple/api' }] }), [])
})

test('workspaces obligatoire', () => {
  const erreurs = validerConfig({})
  assert.ok(
    erreurs.some((e) => e.includes('workspaces')),
    erreurs.join('\n'),
  )
})

test('workspaces ne peut pas être vide', () => {
  const erreurs = validerConfig({ workspaces: [] })
  assert.ok(
    erreurs.some((e) => e.includes('workspaces')),
    erreurs.join('\n'),
  )
})

test('un groupe couplé exige prefixe ou paquets', () => {
  const erreurs = validerConfig({
    workspaces: [{ paquet: '@exemple/api' }],
    groupesCouples: [{ nom: 'x' }],
  })
  assert.ok(
    erreurs.some((e) => e.includes('groupesCouples[0]')),
    erreurs.join('\n'),
  )
})

test('un préalable exige un port entier', () => {
  const erreurs = validerConfig({
    workspaces: [{ paquet: '@exemple/api' }],
    prealables: [{ nom: 'base', hote: '127.0.0.1', port: '5432', pourquoi: 'les tests' }],
  })
  assert.ok(
    erreurs.some((e) => e.includes('prealables[0].port')),
    erreurs.join('\n'),
  )
})

test('lint et test sont des argv', () => {
  const erreurs = validerConfig({ workspaces: [{ paquet: '@exemple/api', lint: 'pnpm lint' }] })
  assert.ok(
    erreurs.some((e) => e.includes('workspaces[0].lint')),
    erreurs.join('\n'),
  )
})

function racineComplete(config) {
  const dossier = dossierAvec(JSON.stringify(config))
  for (const fichier of ['package.json', 'pnpm-lock.yaml'])
    writeFileSync(join(dossier, fichier), '')
  for (const sousDossier of ['apps', 'packages']) mkdirSync(join(dossier, sousDossier))
  return dossier
}

test('chargerConfig applique les défauts', () => {
  const config = chargerConfig(racineComplete({ workspaces: [{ paquet: '@exemple/api' }] }))
  assert.deepEqual(config.cheminsCommit, ['package.json', 'pnpm-lock.yaml', 'apps', 'packages'])
  assert.equal(config.pr.base, 'main')
  assert.equal(config.pr.titre, 'chore(deps): campagne du')
  assert.equal(config.fichierDependances, 'DEPENDENCIES.md')
  assert.deepEqual(config.prealables, [])
  assert.deepEqual(config.groupesCouples, [])
})

test('chargerConfig donne une commande de typage par défaut', () => {
  const config = chargerConfig(
    dossierAvec(
      JSON.stringify({
        workspaces: [{ paquet: '@exemple/api', typage: {} }, { paquet: '@exemple/web' }],
      }),
    ),
  )
  assert.deepEqual(config.workspaces[0].typage.commande, ['tsc', '--noEmit'])
  // Un workspace sans `typage` n'a pas de tsc : on ne lui en invente pas.
  assert.equal(config.workspaces[1].typage, undefined)
})

test('chargerConfig sans fichier', () => {
  assert.throws(
    () => chargerConfig(dossierAvec()),
    (e) => e.message.startsWith('deps-campagne.config.json :') && e.message.includes('introuvable'),
  )
})

test('chargerConfig sur un JSON illisible', () => {
  assert.throws(
    () => chargerConfig(dossierAvec('{ workspaces: ')),
    (e) => e.message.startsWith('deps-campagne.config.json :') && e.message.includes('JSON'),
  )
})

test('chargerConfig sur une config invalide liste les erreurs', () => {
  assert.throws(
    () => chargerConfig(dossierAvec('{}')),
    (e) => e.message.startsWith('deps-campagne.config.json :') && e.message.includes('workspaces'),
  )
})

test("l'exemple fourni est valide", () => {
  const exemple = new URL('../../deps-campagne.config.example.json', import.meta.url)
  assert.deepEqual(validerConfig(JSON.parse(readFileSync(exemple, 'utf8'))), [])
})

test('cheminsCommit par défaut : seulement les chemins qui existent', () => {
  // Un monorepo sans dossier `packages` : `git add packages` échouerait, et le banc d'essai
  // ne restaurerait plus rien.
  const dossier = dossierAvec(JSON.stringify({ workspaces: [{ paquet: '@exemple/api' }] }))
  for (const fichier of ['package.json', 'pnpm-lock.yaml'])
    writeFileSync(join(dossier, fichier), '')
  mkdirSync(join(dossier, 'apps'))
  assert.deepEqual(chargerConfig(dossier).cheminsCommit, ['package.json', 'pnpm-lock.yaml', 'apps'])
})

test('cheminsCommit déclaré mais absent : refus', () => {
  const dossier = dossierAvec(
    JSON.stringify({
      workspaces: [{ paquet: '@exemple/api' }],
      cheminsCommit: ['package.json', 'services'],
    }),
  )
  writeFileSync(join(dossier, 'package.json'), '')
  assert.throws(
    () => chargerConfig(dossier),
    (e) => e.message.startsWith('deps-campagne.config.json :') && e.message.includes('services'),
  )
})
