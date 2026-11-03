import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ici = import.meta.dirname
const racine = join(ici, '..', '..')
const lire = (...chemin) => readFileSync(join(...chemin), 'utf8')

const CLES_VERDICT = [
  'verdict',
  'resume',
  'comparaison',
  'pertinence',
  'accroche',
  'phrases',
  'objections',
  'regles',
  'tournures_a_ajouter',
]

test('SKILL.md : frontmatter relecture-linkedin, déclenché par un brouillon Gecko', () => {
  const frontmatter = lire(ici, 'SKILL.md').match(/^---\n([\s\S]*?)\n---/)?.[1]
  assert.ok(frontmatter, 'frontmatter absent')
  assert.match(frontmatter, /^name: relecture-linkedin$/m)
  const description = frontmatter.match(/^description: (.+)$/m)?.[1] ?? ''
  assert.match(description, /brouillon/)
  assert.match(description, /Gecko/)
})

test('brief-relecteur.md : le JSON imposé a exactement les clés attendues', () => {
  const bloc = lire(ici, 'brief-relecteur.md').match(/```json\n([\s\S]*?)\n```/)?.[1]
  assert.ok(bloc, 'bloc ```json absent')
  assert.deepEqual(Object.keys(JSON.parse(bloc)), CLES_VERDICT)
})

test('tournures-bannies.md : chaque entrée donne la tournure et pourquoi elle sonne creux', () => {
  const entrees = lire(ici, 'tournures-bannies.md')
    .split('\n')
    .filter((ligne) => ligne.startsWith('- '))
  assert.ok(entrees.length >= 10, `${entrees.length} entrées, il en faut au moins 10`)
  for (const entree of entrees) assert.match(entree, /^- « .+ » — .+/, entree)
})

test('les README racine listent relecture-linkedin', () => {
  for (const fichier of ['README.md', 'README.fr.md']) {
    assert.match(lire(racine, fichier), /\[`relecture-linkedin`\]\(skills\/relecture-linkedin\)/)
  }
})

test('brief-relecteur.md : accroche et pertinence portent une gravité, comme les autres points', () => {
  const bloc = lire(ici, 'brief-relecteur.md').match(/```json\n([\s\S]*?)\n```/)?.[1]
  const exemple = JSON.parse(bloc)
  assert.ok('gravite' in exemple.accroche, 'accroche.gravite absent')
  assert.ok('gravite' in exemple.pertinence, 'pertinence.gravite absent')
})

test('les blocs {{…}} du brief sont exactement ceux que SKILL.md remplit', () => {
  const blocs = (texte) => [...new Set(texte.match(/\{\{[A-Z_]+\}\}/g))].sort()
  const attendus = ['{{CONTEXTE}}', '{{HISTORIQUE}}', '{{POST}}', '{{REGLES}}', '{{TOURNURES}}']
  assert.deepEqual(blocs(lire(ici, 'brief-relecteur.md')), attendus)
  assert.deepEqual(blocs(lire(ici, 'SKILL.md')), attendus)
})
