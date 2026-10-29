import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nomPaquetDepuisCle,
  selecteurDepuisCle,
  verdictOverride,
  versionsResoluesDepuisWhy,
} from './overrides.mjs'

/**
 * Forme réelle de `pnpm why <pkg> -r --json --depth Infinity` : un tableau d'entrées
 * workspace, chacune portant un arbre imbriqué. Le paquet cherché apparaît à des
 * profondeurs variables, souvent plusieurs fois.
 */
const WHY_FIXTURE = [
  { name: 'exemple-monorepo', path: '/', private: true },
  {
    name: '@exemple/api',
    version: '0.1.0',
    dependencies: {
      vite: {
        version: '8.0.10',
        dependencies: {
          minifieur: { version: '1.8.0' },
        },
      },
    },
  },
  {
    name: '@exemple/web',
    version: '0.1.0',
    devDependencies: {
      'un-outil': {
        version: '1.0.0',
        dependencies: {
          minifieur: { version: '2.1.0' },
        },
      },
    },
    dependencies: {
      minifieur: { version: '1.8.0' },
    },
  },
]

test('nomPaquetDepuisCle gère un nom simple', () => {
  assert.equal(nomPaquetDepuisCle('exemple-http'), 'exemple-http')
})

test('nomPaquetDepuisCle gère un paquet scopé', () => {
  assert.equal(nomPaquetDepuisCle('@scope/paquet'), '@scope/paquet')
})

test('nomPaquetDepuisCle gère un sélecteur versionné', () => {
  assert.equal(nomPaquetDepuisCle('exemple-id@>=3.0.0 <3.1.1'), 'exemple-id')
})

test('nomPaquetDepuisCle gère un sélecteur versionné sur un paquet scopé', () => {
  assert.equal(nomPaquetDepuisCle('@types/node@>=20'), '@types/node')
})

test('selecteurDepuisCle rend * quand la clé ne porte pas de sélecteur', () => {
  assert.equal(selecteurDepuisCle('exemple-http'), '*')
  assert.equal(selecteurDepuisCle('@scope/paquet'), '*')
})

test('selecteurDepuisCle extrait le range du sélecteur versionné', () => {
  assert.equal(selecteurDepuisCle('exemple-id@>=3.0.0 <3.1.1'), '>=3.0.0 <3.1.1')
  assert.equal(selecteurDepuisCle('@types/node@>=20'), '>=20')
})

test('un override à sélecteur versionné est INERTE si rien ne tombe dans sa fenêtre', () => {
  // Une clé à sélecteur : "exemple-id@>=3.0.0 <3.1.1": ">=3.1.1".
  // Sans l'override, exemple-id se résout en 2.4.0 — hors de la fenêtre [3.0.0, 3.1.1),
  // donc l'override ne le réécrirait jamais. Comparer 2.4.0 à ">=3.1.1" est un
  // contresens : la valeur ne s'applique qu'aux versions que le sélecteur attrape.
  const v = verdictOverride({
    cle: 'exemple-id@>=3.0.0 <3.1.1',
    range: '>=3.1.1',
    versionsResolues: ['2.4.0'],
  })

  assert.equal(v.porteur, false, '2.4.0 est hors du sélecteur, donc jamais réécrit')
  assert.match(v.preuve, /sélecteur/)
})

test('un override à sélecteur versionné est PORTEUR si une version tombe dans sa fenêtre', () => {
  const v = verdictOverride({
    cle: 'exemple-id@>=3.0.0 <3.1.1',
    range: '>=3.1.1',
    versionsResolues: ['2.4.0', '3.0.5'],
  })

  assert.equal(v.porteur, true, '3.0.5 est dans le sélecteur et viole la valeur')
  assert.match(v.preuve, /3\.0\.5/)
})

test('un plancher déjà satisfait naturellement est inerte', () => {
  // Par exemple exemple-http: ">=3.2.0" — sans override, pnpm résout 3.4.1 tout seul.
  const v = verdictOverride({
    cle: 'exemple-http',
    range: '>=3.2.0',
    versionsResolues: ['3.4.1'],
  })

  assert.equal(v.porteur, false)
  assert.match(v.preuve, /déjà conforme/)
})

test('un plancher non satisfait est porteur', () => {
  // Par exemple ">=0.9.10" alors qu'une dépendance transitive pinne 0.9.9.
  const v = verdictOverride({
    cle: '@scope/xml',
    range: '>=0.9.10',
    versionsResolues: ['0.9.9'],
  })

  assert.equal(v.porteur, true)
  assert.match(v.preuve, /0\.9\.9/)
})

test('un PLAFOND dépassé est porteur', () => {
  // Un plafond "<2.0.0" retient une version qui casse.
  const v = verdictOverride({
    cle: 'minifieur',
    range: '<2.0.0',
    versionsResolues: ['2.1.0'],
  })

  assert.equal(v.porteur, true, 'un plafond franchi retient activement quelque chose')
})

test('un plafond non atteint est inerte', () => {
  const v = verdictOverride({
    cle: 'minifieur',
    range: '<2.0.0',
    versionsResolues: ['1.8.0'],
  })

  assert.equal(v.porteur, false)
})

test('une seule version hors range parmi plusieurs suffit à rendre porteur', () => {
  const v = verdictOverride({
    cle: 'postcss',
    range: '>=8.5.10',
    versionsResolues: ['8.5.11', '8.4.2', '8.5.10'],
  })

  assert.equal(v.porteur, true)
  assert.match(v.preuve, /8\.4\.2/)
})

test('aucune version résolue = paquet disparu de l arbre, donc inerte', () => {
  const v = verdictOverride({
    cle: 'mermaid',
    range: '>=11.15.0',
    versionsResolues: [],
  })

  assert.equal(v.porteur, false)
  assert.match(v.preuve, /absent de l'arbre/)
})

test('versionsResoluesDepuisWhy trouve le paquet à toutes les profondeurs, dédupliqué', () => {
  const versions = versionsResoluesDepuisWhy(WHY_FIXTURE, 'minifieur')

  assert.deepEqual(versions.sort(), ['1.8.0', '2.1.0'])
})

test('versionsResoluesDepuisWhy explore aussi les devDependencies', () => {
  // 2.1.0 n'est atteignable que via la branche devDependencies de la fixture.
  const versions = versionsResoluesDepuisWhy(WHY_FIXTURE, 'minifieur')

  assert.ok(versions.includes('2.1.0'), 'la branche devDependencies doit être explorée')
})

test('versionsResoluesDepuisWhy rend un tableau vide si le paquet est absent', () => {
  assert.deepEqual(versionsResoluesDepuisWhy(WHY_FIXTURE, 'paquet-inexistant'), [])
})

test('versionsResoluesDepuisWhy tolère une entrée workspace sans arbre', () => {
  // La première entrée de pnpm why est la racine du monorepo : ni dependencies ni version.
  assert.doesNotThrow(() => versionsResoluesDepuisWhy(WHY_FIXTURE, 'minifieur'))
})

test('versionsResoluesDepuisWhy ignore un noeud sans version', () => {
  const arbre = [{ name: 'x', dependencies: { minifieur: { from: 'minifieur' } } }]

  assert.deepEqual(versionsResoluesDepuisWhy(arbre, 'minifieur'), [])
})
