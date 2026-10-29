#!/usr/bin/env node
import { preparer } from './lib/racine.mjs'

/**
 * Point d'entrée. Vérifie semver, la racine et la config AVANT d'importer le moteur : ses
 * modules importent semver statiquement, et un échec d'import afficherait une stack trace
 * au lieu de dire quoi faire.
 */
try {
  const config = await preparer()
  const { main } = await import('./campagne.mjs')
  await main(config)
} catch (erreur) {
  console.error(`[campagne] ${erreur.message}`)
  process.exit(1)
}
