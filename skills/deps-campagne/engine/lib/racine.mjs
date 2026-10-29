import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { chargerConfig } from './config.mjs'

const FICHIERS_RACINE = ['pnpm-workspace.yaml', 'pnpm-lock.yaml']

/** Les fichiers de racine pnpm absents du dossier. Vide = c'est bien la racine du monorepo. */
export function verifierRacine(dossier) {
  return FICHIERS_RACINE.filter((fichier) => !existsSync(join(dossier, fichier)))
}

/**
 * Tout ce qui doit tenir AVANT de charger le moteur, dans l'ordre où ça casse :
 *
 * 1. semver. `npx skills add` ne copie que le dossier du skill, sans node_modules : c'est le
 *    projet cible qui fournit semver. S'il manque, l'import statique d'outdated.mjs lèverait
 *    un ERR_MODULE_NOT_FOUND illisible. On le teste ici, avant tout import du moteur.
 * 2. la racine. Le moteur travaille dans le répertoire courant : lancé depuis un sous-dossier,
 *    `pnpm outdated -r` et `git add` verraient un autre périmètre que celui de la config.
 * 3. la config, puis le fichier de suivi des dépendances qu'elle désigne.
 *
 * Lève une Error au message actionnable dès que l'un échoue.
 */
export async function preparer({ racine = process.cwd() } = {}) {
  try {
    await import('semver')
  } catch {
    throw new Error('semver est introuvable : ajoute-le au projet avec `pnpm add -Dw semver`.')
  }

  const manquants = verifierRacine(racine)
  if (manquants.length > 0) {
    throw new Error(
      `${manquants.join(' et ')} ${manquants.length > 1 ? 'introuvables' : 'introuvable'} dans ${racine}. Lance la campagne depuis la racine du monorepo pnpm (là où vivent pnpm-workspace.yaml et pnpm-lock.yaml).`,
    )
  }

  const config = chargerConfig(racine)

  // Le moteur y lit la section « Dépendances hors registre » avant tout bump : sans le
  // fichier, il échouerait sur un ENOENT qui ne dit pas quoi faire.
  if (!existsSync(join(racine, config.fichierDependances))) {
    throw new Error(
      `${config.fichierDependances} introuvable dans ${racine}. Pars de DEPENDENCIES.example.md, dans le dossier du skill, ou indique ton fichier dans \`fichierDependances\` de la config.`,
    )
  }
  return config
}
