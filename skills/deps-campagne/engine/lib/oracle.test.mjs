import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtresCampagne, oracleRapide, oracleComplet } from './oracle.mjs'

/** Un `run` qui enregistre les argv et réussit toujours : aucun processus n'est lancé. */
function enregistreur(sorties = {}) {
  const appels = []
  const executer = (argv, opts = {}) => {
    appels.push({ argv, env: opts.env ?? {} })
    return sorties[argv.join(' ')] ?? { code: 0, stdout: '', stderr: '' }
  }
  return { appels, executer }
}

test('filtresCampagne rend un --filter par workspace', () => {
  assert.deepEqual(filtresCampagne({ workspaces: [{ paquet: 'a' }, { paquet: 'b' }] }), [
    '--filter',
    'a',
    '--filter',
    'b',
  ])
})

test('oracleComplet saute un workspace sans lint ni test', () => {
  const { appels, executer } = enregistreur()
  const resultat = oracleComplet({ workspaces: [{ paquet: '@exemple/shared' }] }, { executer })

  assert.deepEqual(
    appels.map((a) => a.argv),
    [['pnpm', 'audit', '--json']],
  )
  assert.equal(resultat.ok, true)
})

test('oracleComplet lance lint et test tels quels, avec leur env', () => {
  const { appels, executer } = enregistreur()
  oracleComplet(
    {
      workspaces: [
        {
          paquet: '@exemple/api',
          lint: ['pnpm', '-F', '@exemple/api', 'run', 'lint'],
          test: ['pnpm', '-F', '@exemple/api', 'run', 'test'],
          env: { API_URL: 'https://example.test' },
        },
      ],
    },
    { executer },
  )

  assert.deepEqual(appels[0], {
    argv: ['pnpm', '-F', '@exemple/api', 'run', 'lint'],
    env: { API_URL: 'https://example.test' },
  })
  assert.deepEqual(appels[1], {
    argv: ['pnpm', '-F', '@exemple/api', 'run', 'test'],
    env: { API_URL: 'https://example.test' },
  })
})

test('oracleComplet attribue un échec de test à son workspace', () => {
  const { executer } = enregistreur({
    'pnpm -F @exemple/api run test': { code: 1, stdout: '', stderr: 'FAIL api.test.ts' },
  })
  const resultat = oracleComplet(
    {
      workspaces: [{ paquet: '@exemple/api', test: ['pnpm', '-F', '@exemple/api', 'run', 'test'] }],
    },
    { executer },
  )

  assert.equal(resultat.ok, false)
  assert.match(resultat.echecs[0], /^@exemple\/api: tests — FAIL api\.test\.ts/)
})

test('oracleRapide saute un workspace sans typage', () => {
  const { appels, executer } = enregistreur()
  const resultat = oracleRapide({ workspaces: [{ paquet: '@exemple/shared' }] }, { executer })

  assert.deepEqual(
    appels.map((a) => a.argv),
    [['pnpm', 'install', '--no-frozen-lockfile']],
  )
  assert.equal(resultat.ok, true)
})

test('oracleRapide joue prepare, purge puis la commande de typage', () => {
  const { appels, executer } = enregistreur()
  oracleRapide(
    {
      workspaces: [
        {
          paquet: '@exemple/api',
          typage: {
            prepare: ['prisma', 'generate'],
            purger: 'tsconfig.tsbuildinfo',
            commande: ['tsc', '--noEmit'],
          },
        },
      ],
    },
    { executer },
  )

  assert.deepEqual(
    appels.map((a) => a.argv),
    [
      ['pnpm', 'install', '--no-frozen-lockfile'],
      ['pnpm', '-F', '@exemple/api', 'exec', 'prisma', 'generate'],
      ['pnpm', '-F', '@exemple/api', 'exec', 'rm', '-f', 'tsconfig.tsbuildinfo'],
      ['pnpm', '-F', '@exemple/api', 'exec', 'tsc', '--noEmit'],
    ],
  )
})

test('oracleRapide compte les erreurs tsc', () => {
  const { executer } = enregistreur({
    'pnpm -F @exemple/web exec tsc --noEmit': {
      code: 2,
      stdout: 'a.ts(1,1): error TS2322: x\nb.ts(2,2): error TS2345: y\n',
      stderr: '',
    },
  })
  const resultat = oracleRapide(
    { workspaces: [{ paquet: '@exemple/web', typage: { commande: ['tsc', '--noEmit'] } }] },
    { executer },
  )

  assert.equal(resultat.ok, false)
  assert.match(resultat.echecs[0], /^@exemple\/web: tsc — 2 erreurs/)
})
