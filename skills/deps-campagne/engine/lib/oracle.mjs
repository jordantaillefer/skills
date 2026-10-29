import { run } from './shell.mjs'

/**
 * Périmètre des bumps : TOUS les workspaces déclarés dans la config, sans exception.
 *
 * On ne peut pas bumper une moitié du monorepo, parce que le `pnpm-lock.yaml` est partagé :
 *
 * 1. Un workspace laissé hors périmètre n'est bumpé par personne. Il garde des versions
 *    vulnérables pendant des mois pendant que les autres flottent plus haut.
 * 2. Un bump « limité » à une partie du monorepo casse quand même le reste. Une famille de
 *    paquets frères qui déclarent des CARETS entre eux (`@tiptap/starter-kit` sur ses
 *    `@tiptap/*`) se résout à la nouvelle version partout dès qu'elle entre quelque part,
 *    alors qu'un workspace hors périmètre garde son ancien cœur. Deux `@tiptap/core` dans un
 *    seul programme tsc. Les pins exacts des dépendances directes n'y peuvent rien : ils
 *    n'atteignent pas les carets internes des paquets tiers.
 *
 * Conclusion : soit tout monte, soit rien. Le périmètre doit couvrir TOUS les workspaces, y
 * compris ceux qui n'ont pas de tsc à eux.
 *
 * Pour zod c'est fatal : il estampille ses schémas avec sa propre version, en type LITTÉRAL
 * (`_$ZodTypeInternals { version: typeof version }`, dont `minor` est un littéral). Deux
 * minors différents rendent les schémas mutuellement non-assignables. Les patches passent,
 * les minors non. Un paquet partagé oublié ici garde son zod pendant que les apps montent, et
 * produit des centaines d'erreurs tsc, attribuées à tort au lot in-range.
 */
export function filtresCampagne(config) {
  return config.workspaces.flatMap(({ paquet }) => ['--filter', paquet])
}

export function installer(executer = run) {
  return executer(['pnpm', 'install', '--no-frozen-lockfile'])
}

/**
 * Oracle rapide : install + tsc sur les workspaces qui déclarent un `typage`.
 * C'est le signal discriminant sur un codebase TS : signature changée, export retiré,
 * type modifié. Inutile de payer des minutes de tests pour un commit qui ne compile pas.
 *
 * Par workspace, dans l'ordre :
 * - `prepare` : un codegen à jouer AVANT tsc, sinon les types n'existent pas encore
 *   (`prisma generate`, `tsr generate`…). S'il a besoin d'une base, déclare-la dans
 *   `prealables`.
 * - `purger` : un `.tsbuildinfo` à supprimer. Avec `incremental: true`, un cache survivant
 *   d'un commit à l'autre fait réutiliser à tsc son résultat précédent et rend un VERT FAUX.
 * - `commande` : `tsc --noEmit` par défaut. Un codebase qui épuise la pile de Node a besoin
 *   de `--stack-size`, que NODE_OPTIONS refuse : il faut alors invoquer le binaire par node,
 *   `["node", "--stack-size=8000", "./node_modules/typescript/bin/tsc"]`.
 */
export function oracleRapide(config, { executer = run } = {}) {
  const echecs = []

  const install = installer(executer)
  if (install.code !== 0) {
    return { ok: false, echecs: [`install: ${derniereLigne(install.stderr)}`] }
  }

  for (const { paquet, typage } of config.workspaces) {
    if (!typage) continue
    if (typage.prepare) {
      const prepare = executer(['pnpm', '-F', paquet, 'exec', ...typage.prepare])
      if (prepare.code !== 0) {
        echecs.push(`${paquet}: ${typage.prepare.join(' ')} — ${derniereLigne(prepare.stderr)}`)
        continue
      }
    }
    // Un cache incrémental survivant d'un commit à l'autre rend un vert faux.
    if (typage.purger) {
      executer(['pnpm', '-F', paquet, 'exec', 'rm', '-f', typage.purger])
    }
    const tsc = executer([
      'pnpm',
      '-F',
      paquet,
      'exec',
      ...(typage.commande ?? ['tsc', '--noEmit']),
    ])
    if (tsc.code !== 0) {
      echecs.push(
        `${paquet}: tsc — ${compterErreursTsc(tsc.stdout)} erreurs\n${extrait(tsc.stdout)}`,
      )
    }
  }

  return { ok: echecs.length === 0, echecs }
}

/**
 * Oracle complet : lint + tests + audit. Ne le lancer que si l'oracle rapide passe.
 *
 * Les commandes `lint` et `test` de chaque workspace sont lancées telles quelles, à la
 * racine, avec son `env`. Un workspace qui n'en déclare pas est simplement sauté : lui
 * inventer une commande la ferait échouer, ce qui se lirait comme une régression.
 *
 * Un workspace sans tsc à lui n'a que ses tests comme filet : ne les oublie pas dans la
 * config, sinon ses bumps passent pour couverts alors que rien ne les juge.
 */
export function oracleComplet(config, { executer = run } = {}) {
  const echecs = []

  for (const { paquet, lint, env = {} } of config.workspaces) {
    if (!lint) continue
    const resultat = executer(lint, { env })
    if (resultat.code !== 0) {
      echecs.push(`${paquet}: lint — ${extrait(resultat.stderr, resultat.stdout)}`)
    }
  }

  for (const { paquet, test, env = {} } of config.workspaces) {
    if (!test) continue
    const resultat = executer(test, { env })
    if (resultat.code !== 0) {
      echecs.push(`${paquet}: tests — ${extrait(resultat.stderr, resultat.stdout)}`)
    }
  }

  // `pnpm audit` sort en non-zéro dès qu'il trouve une vulnérabilité : c'est une donnée, pas une erreur.
  const audit = executer(['pnpm', 'audit', '--json'])
  return { ok: echecs.length === 0, echecs, audit: audit.stdout }
}

function derniereLigne(texte) {
  const lignes = (texte ?? '').trim().split('\n').filter(Boolean)
  return lignes[lignes.length - 1] ?? '(pas de sortie)'
}

/**
 * Compte les `error TS` de la sortie. Ne jamais passer `--pretty` à tsc : il colore et
 * reformate les erreurs, et ce comptage ne trouve plus rien.
 */
function compterErreursTsc(sortie) {
  return (sortie.match(/error TS\d+/g) ?? []).length
}

/**
 * Le rapport doit rester compact — mais par la BONNE extrémité.
 *
 * Garder les 20 PREMIÈRES lignes ne sert à rien : pour `pnpm lint` comme pour `vitest`, ce
 * sont le préambule pnpm et le bruit de migration, et le message d'erreur réel n'y est
 * jamais. Un échec enregistré sans une seule ligne d'erreur oblige à le reproduire à la main.
 *
 * Et stderr ne doit pas être écarté dès que stdout est non vide (`stdout || stderr`) : ça
 * suffit à perdre tout crash qui ne passe pas par stdout. On concatène les deux, et on garde
 * la fin.
 */
function extrait(...sorties) {
  const lignes = sorties
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join('\n')
    .split('\n')
  return lignes.slice(-20).join('\n')
}
