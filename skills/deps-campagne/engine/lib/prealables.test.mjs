import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { joignable, verifierPrealables } from './prealables.mjs'

const base = { nom: 'base', hote: '127.0.0.1', port: 1, pourquoi: 'les tests en ont besoin' }

test('préalable injoignable', async () => {
  const messages = await verifierPrealables([base], async () => false)
  assert.equal(messages.length, 1)
  assert.match(messages[0], /base injoignable \(127\.0\.0\.1:1\)/)
  assert.match(messages[0], /les tests en ont besoin/)
  assert.match(messages[0], /ne touche jamais aux conteneurs/)
})

test('préalable joignable', async () => {
  assert.deepEqual(await verifierPrealables([base], async () => true), [])
})

test('joignable sur un port fermé', async () => {
  const serveur = createServer()
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok))
  const { port } = serveur.address()
  await new Promise((ok) => serveur.close(ok))
  assert.equal(await joignable({ hote: '127.0.0.1', port }), false)
})

test('joignable sur un port ouvert', async () => {
  const serveur = createServer((socket) => socket.end())
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok))
  const { port } = serveur.address()
  try {
    assert.equal(await joignable({ hote: '127.0.0.1', port }), true)
  } finally {
    await new Promise((ok) => serveur.close(ok))
  }
})
