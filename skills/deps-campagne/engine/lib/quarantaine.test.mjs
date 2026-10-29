import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  readExclusions,
  readMinimumReleaseAge,
  getQuarantineVerdict,
  findLockedVersions,
} from './quarantaine.mjs'

const YAML = `packages:
  - "apps/*"

minimumReleaseAge: 20160
minimumReleaseAgeExclude:
  # expire: jamais
  - exemple-framework
  - "@exemple-framework/*"
  # expire: 2026-03-01
  # lib-beta est épinglé en exact sur une préversion.
  - lib-beta
  - "@scope/core"
  # expire: 2026-05-01
  - mitt
  - sans-marqueur

autreCle: valeur
`

test('lit les exclusions avec leur échéance déclarée', () => {
  assert.deepEqual(readExclusions(YAML), [
    { paquet: 'exemple-framework', expire: 'jamais' },
    { paquet: '@exemple-framework/*', expire: 'jamais' },
    { paquet: 'lib-beta', expire: '2026-03-01' },
    { paquet: '@scope/core', expire: '2026-03-01' },
    { paquet: 'mitt', expire: '2026-05-01' },
    { paquet: 'sans-marqueur', expire: '2026-05-01' },
  ])
})

test('ferme le bloc à la première clé non indentée', () => {
  assert.equal(
    readExclusions(YAML).some((e) => e.paquet.includes('autreCle')),
    false,
  )
})

test('rend une liste vide si la clé est absente', () => {
  assert.deepEqual(readExclusions('packages:\n  - "apps/*"\n'), [])
})

const LE_19 = new Date('2026-05-19T00:00:00Z')
const QUARANTAINE = 20160

test('une exclusion sans échéance est en défaut', () => {
  const v = getQuarantineVerdict({
    paquet: 'x',
    expire: null,
    publieeLe: null,
    aujourdhui: LE_19,
    minimumReleaseAgeMinutes: QUARANTAINE,
  })
  assert.equal(v.statut, 'sans-echeance')
})

test('une politique permanente est laissée tranquille', () => {
  const v = getQuarantineVerdict({
    paquet: 'exemple-framework',
    expire: 'jamais',
    publieeLe: null,
    aujourdhui: LE_19,
    minimumReleaseAgeMinutes: QUARANTAINE,
  })
  assert.equal(v.statut, 'permanente')
})

test('échéance non atteinte : rien à faire', () => {
  const v = getQuarantineVerdict({
    paquet: 'x',
    expire: '2026-05-28',
    publieeLe: new Date('2026-05-17T00:00:00Z'),
    aujourdhui: LE_19,
    minimumReleaseAgeMinutes: QUARANTAINE,
  })
  assert.equal(v.statut, 'en-cours')
  assert.equal(v.resteJours, 9)
})

test('échéance dépassée ET version mûre : retirable', () => {
  const v = getQuarantineVerdict({
    paquet: 'mitt',
    expire: '2026-05-01',
    publieeLe: new Date('2026-04-17T00:00:00Z'),
    aujourdhui: LE_19,
    minimumReleaseAgeMinutes: QUARANTAINE,
  })
  assert.equal(v.statut, 'retirable')
  assert.equal(v.retardJours, 18)
  assert.equal(v.ageJours, 32)
})

test('échéance dépassée mais version encore fraîche : NE PAS retirer', () => {
  const v = getQuarantineVerdict({
    paquet: 'x',
    expire: '2026-05-01',
    publieeLe: new Date('2026-05-15T00:00:00Z'),
    aujourdhui: LE_19,
    minimumReleaseAgeMinutes: QUARANTAINE,
  })
  assert.equal(v.statut, 'echue-mais-prematuree')
  assert.equal(v.ageJours, 4)
})

test('échéance dépassée et version inconnue : à vérifier à la main', () => {
  const v = getQuarantineVerdict({
    paquet: '@exemple-framework/*',
    expire: '2026-05-01',
    publieeLe: null,
    aujourdhui: LE_19,
    minimumReleaseAgeMinutes: QUARANTAINE,
  })
  assert.equal(v.statut, 'echue-non-verifiable')
})

test('une échéance illisible est signalée, pas ignorée', () => {
  const v = getQuarantineVerdict({
    paquet: 'x',
    expire: 'bientôt',
    publieeLe: null,
    aujourdhui: LE_19,
    minimumReleaseAgeMinutes: QUARANTAINE,
  })
  assert.equal(v.statut, 'echeance-illisible')
})

const LOCKFILE = `packages:

  '@scope/core@0.1.0':
    resolution: {integrity: sha512-x}

  lib-beta@2.0.0-beta.3:
    resolution: {integrity: sha512-y}

  mitt@3.0.1:
    resolution: {integrity: sha512-z}

  mitt@2.1.0:
    resolution: {integrity: sha512-w}

snapshots:

  lib-beta@2.0.0-beta.3(react@19.0.0):
    dependencies:
      '@scope/core': 0.1.0
`

test("trouve la version d'un paquet non scopé", () => {
  assert.deepEqual(findLockedVersions('lib-beta', LOCKFILE), ['2.0.0-beta.3'])
})

test("trouve la version d'un paquet scopé, dont la clé est quotée dans le lockfile", () => {
  assert.deepEqual(findLockedVersions('@scope/core', LOCKFILE), ['0.1.0'])
})

test('rend toutes les versions quand il y en a plusieurs', () => {
  assert.deepEqual(findLockedVersions('mitt', LOCKFILE).sort(), ['2.1.0', '3.0.1'])
})

test('ne résout pas un motif glob', () => {
  assert.deepEqual(findLockedVersions('@exemple-framework/*', LOCKFILE), [])
})

test('ne confond pas un paquet avec un autre dont il est le préfixe', () => {
  assert.deepEqual(findLockedVersions('next', LOCKFILE), [])
})

test('lit minimumReleaseAge', () => {
  assert.equal(readMinimumReleaseAge(YAML), 20160)
  assert.equal(readMinimumReleaseAge('packages:\n  - "apps/*"\n'), 0)
})
