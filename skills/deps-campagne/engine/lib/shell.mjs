import { execFileSync } from 'node:child_process'
/**
 * Exécute une commande à la racine du monorepo, SANS passer par un shell.
 *
 * La racine est le répertoire courant : run.mjs a déjà vérifié qu'on y trouve
 * pnpm-workspace.yaml et pnpm-lock.yaml.
 *
 * L'argv est un tableau, jamais une chaîne : cet outil interpole des noms de paquets et
 * des versions qui viennent du registre npm, et les faire traverser un shell rouvrirait
 * exactement la surface d'attaque que `minimumReleaseAge` cherche à réduire. Aucun
 * métacaractère n'est interprété.
 *
 * Ne lève jamais : rend toujours { code, stdout, stderr }. C'est à l'appelant de juger
 * si un code non nul est une erreur — `pnpm outdated` et `pnpm audit` sortent en non-zéro
 * dans leur cas nominal.
 */
export function run(argv, { env = {}, input = undefined } = {}) {
  const [commande, ...args] = argv
  try {
    const stdout = execFileSync(commande, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: 'utf8',
      input,
      stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    })
    return { code: 0, stdout, stderr: '' }
  } catch (erreur) {
    return {
      code: erreur.status ?? 1,
      stdout: erreur.stdout?.toString() ?? '',
      stderr: erreur.stderr?.toString() ?? '',
    }
  }
}
